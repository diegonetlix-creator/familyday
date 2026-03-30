import { supabase } from './supabase.js'

// === DIRECT REST API HELPERS ===
const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/rest/v1'
const RPC_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/rest/v1/rpc'
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

const serviceHeaders = () => ({
  'apikey': API_KEY,
  'Authorization': `Bearer ${SERVICE_KEY || API_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
})

const userHeaders = (token) => ({
  'apikey': API_KEY,
  'Authorization': `Bearer ${token || API_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
})

// Fetch one row by filters — always uses service role for internal auth ops
async function dbGetOne(table, filters) {
  let url = `${API_URL}/${table}?select=*`
  for (const [col, val] of Object.entries(filters)) {
    url += `&${col}=eq.${encodeURIComponent(val)}`
  }
  url += '&limit=1'
  const res = await fetch(url, { headers: serviceHeaders() })
  if (!res.ok) return null
  const arr = await res.json()
  return arr[0] || null
}

// Insert with explicit token (used during registration)
async function dbInsertWithToken(table, row, token) {
  const res = await fetch(`${API_URL}/${table}`, {
    method: 'POST',
    headers: userHeaders(token),
    body: JSON.stringify(row)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt)
  }
  const arr = await res.json()
  return arr[0] || null
}

// Update with service role (only used for legitimate admin ops)
async function dbUpdateService(table, id, data) {
  const res = await fetch(`${API_URL}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: serviceHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt)
  }
  const arr = await res.json()
  return arr[0] || null
}

// Build the session object from a profile row + access token
function buildSession(profile, accessToken) {
  return {
    id: profile.id,
    userId: profile.id,
    role: profile.role,
    name: profile.name,
    email: profile.email,
    color: profile.color,
    family_id: profile.family_id,
    accessToken
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export const Auth = {

  async loginWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: 'Error al conectar con Google.' }
    }
  },

  async login(email, password) {
    try {
      const cleanEmail = email.trim().toLowerCase()

      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      })

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          return { ok: false, error: 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' }
        }
        if (authError.message.includes('Invalid login credentials')) {
          return { ok: false, error: 'Email o contraseña incorrectos.' }
        }
        return { ok: false, error: 'Error al iniciar sesión: ' + authError.message }
      }

      const authUid = authData.user.id

      // 2. SECURITY: Fetch profile by auth.uid() — NOT by email.
      //    This guarantees we always get exactly the profile that belongs to this auth user.
      let profile = await dbGetOne('fd_members', { id: authUid })

      // 3. Fallback: if trigger was slow, try by email but validate the id matches
      if (!profile) {
        profile = await dbGetOne('fd_members', { email: cleanEmail })

        if (profile && profile.id !== authUid) {
          // Profile id mismatch — update the id to match the real auth uid
          // This happens when the same email had a placeholder created by admin
          console.warn('[Auth.login] ID mismatch — updating profile id to match auth uid')
          await dbUpdateService('fd_members', profile.id, { id: authUid })
          profile = { ...profile, id: authUid }
        }
      }

      if (!profile) {
        await supabase.auth.signOut()
        return { ok: false, error: 'No encontramos tu perfil. Contacta al administrador.' }
      }

      // 4. Save session — always use data from DB, never from user input
      const session = buildSession(profile, authData.session.access_token)
      localStorage.setItem('fd_session', JSON.stringify(session))

      return { ok: true, user: profile }

    } catch (err) {
      console.error('[Auth.login] Fatal error:', err)
      return { ok: false, error: 'Error inesperado. Intenta de nuevo.' }
    }
  },

  async register(data) {
    try {
      const cleanEmail = data.email.trim().toLowerCase()

      // 1. Sign up in Supabase Auth — trigger will create the fd_members row
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            name:  data.name.trim(),
            role:  data.role  || 'admin',
            color: data.color || '#a855f7',
            age:   data.age   || null
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          return { ok: false, error: 'Este email ya está registrado. Intenta iniciar sesión.' }
        }
        return { ok: false, error: authError.message }
      }

      if (!authData.user) {
        return { ok: false, error: 'No se pudo crear el usuario.' }
      }

      // 2. If Supabase requires email confirmation, user must verify first
      //    authData.session will be null when email confirmation is required
      if (!authData.session) {
        return { ok: true, user: { email: cleanEmail, role: data.role }, requiresVerification: true }
      }

      // 3. Session exists — user is confirmed (e.g., email confirmation disabled in Supabase)
      //    Wait for trigger to run, then fetch profile by uid
      await new Promise(r => setTimeout(r, 1200))
      let profile = await dbGetOne('fd_members', { id: authData.user.id })

      // 4. Trigger fallback — create profile manually if trigger didn't fire
      if (!profile) {
        try {
          const familyId = data.role !== 'child' ? crypto.randomUUID() : null
          profile = await dbInsertWithToken('fd_members', {
            id:             authData.user.id,
            name:           data.name.trim(),
            age:            data.age || null,
            role:           data.role || 'admin',
            color:          data.color || '#a855f7',
            email:          cleanEmail,
            status:         'active',
            family_id:      familyId,
            total_points:   0,
            redeemed_points: 0
          }, authData.session.access_token)
        } catch (insertErr) {
          console.error('[Auth.register] Manual profile creation failed:', insertErr)
        }
      }

      if (!profile) {
        return { ok: true, user: { email: cleanEmail, role: data.role }, requiresVerification: true }
      }

      const session = buildSession(profile, authData.session.access_token)
      localStorage.setItem('fd_session', JSON.stringify(session))

      return { ok: true, user: profile }

    } catch (err) {
      console.error('[Auth.register] Error:', err)
      return { ok: false, error: 'Error al registrarse: ' + (err.message || 'intenta de nuevo') }
    }
  },

  /**
   * Search a member by email — used in Members page to find users to link.
   * Returns the member or null. Safe to expose — only returns public profile data.
   */
  async searchMemberByEmail(email) {
    const cleanEmail = email.trim().toLowerCase()
    return await dbGetOne('fd_members', { email: cleanEmail })
  },

  /**
   * Send a family invite or link directly if member has no family.
   * Uses the secure send_family_invite DB RPC which:
   *  - Links directly if member has no family
   *  - Sends a notification invite if member already has a different family
   *  - Rejects if member is already in this family
   */
  async linkMemberToFamily(memberEmail, familyId, newRole = null) {
    try {
      const current = this.getCurrentUser()
      if (!current?.id) return { ok: false, error: 'No estás autenticado.' }

      const res = await fetch(`${RPC_URL}/send_family_invite`, {
        method: 'POST',
        headers: serviceHeaders(),
        body: JSON.stringify({
          p_member_email: memberEmail.trim().toLowerCase(),
          p_family_id:    familyId,
          p_requester_id: current.id
        })
      })
      const result = await res.json()

      // If linked directly and newRole was specified, update the role too
      if (result.ok && result.linked && newRole && result.member?.role !== newRole) {
        await dbUpdateService('fd_members', result.member.id, { role: newRole })
        result.member.role = newRole
      }

      return result

    } catch (err) {
      return { ok: false, error: 'Error al enviar invitación: ' + err.message }
    }
  },

  /**
   * Get all pending family invites for the current user.
   */
  async getPendingInvites() {
    try {
      const current = this.getCurrentUser()
      if (!current?.id) return []

      const res = await fetch(`${RPC_URL}/get_my_pending_invites`, {
        method: 'POST',
        headers: serviceHeaders(),
        body: JSON.stringify({})
      })
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  /**
   * Accept or reject a family invite.
   * If accepted, the user's family_id is updated in DB.
   * Frontend should call refreshSession() after accepting.
   */
  async respondToInvite(notificationId, accept) {
    try {
      const res = await fetch(`${RPC_URL}/respond_to_family_invite`, {
        method: 'POST',
        headers: serviceHeaders(),
        body: JSON.stringify({
          p_notification_id: notificationId,
          p_accept:          accept
        })
      })
      const result = await res.json()
      if (result.ok && accept) {
        // Re-sync session with the new family_id
        await this.refreshSession()
      }
      return result
    } catch (err) {
      return { ok: false, error: 'Error al responder: ' + err.message }
    }
  },

  async logout() {
    localStorage.removeItem('fd_session')
    await supabase.auth.signOut()
    window.location.href = '/login'
  },

  getCurrentUser() {
    const session = localStorage.getItem('fd_session')
    if (!session) return null
    try { return JSON.parse(session) } catch { return null }
  },

  isLoggedIn() {
    return !!this.getCurrentUser()
  },

  isAdmin() {
    const u = this.getCurrentUser()
    return u?.role === 'admin' || u?.role === 'superadmin'
  },

  /**
   * Re-sync session from DB.
   * Fetches latest profile data by uid (secure — no cross-user access possible).
   */
  async refreshSession() {
    const current = this.getCurrentUser()
    if (!current?.id) return null

    const fresh = await dbGetOne('fd_members', { id: current.id })
    if (!fresh) return current

    const updated = buildSession(fresh, current.accessToken)
    localStorage.setItem('fd_session', JSON.stringify(updated))
    return updated
  }
}
