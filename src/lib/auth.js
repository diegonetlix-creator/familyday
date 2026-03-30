import { supabase, supabaseAdmin } from './supabase.js'

// === DIRECT REST API HELPERS ===
const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/rest/v1'
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

const getHeaders = (token = null) => {
  const session = localStorage.getItem('fd_session')
  const h = {
    'apikey': API_KEY,
    'Authorization': `Bearer ${token || API_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  if (!token && session) {
    try {
      const { accessToken } = JSON.parse(session)
      if (accessToken) h['Authorization'] = `Bearer ${accessToken}`
    } catch (e) {}
  }
  return h
}

const getServiceHeaders = () => ({
  'apikey': API_KEY,
  'Authorization': `Bearer ${SERVICE_KEY || API_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
})

async function dbGetOne(table, filters, useService = false) {
  let url = `${API_URL}/${table}?select=*`
  for (const [col, val] of Object.entries(filters)) {
    url += `&${col}=eq.${encodeURIComponent(val)}`
  }
  url += '&limit=1'
  const headers = useService ? getServiceHeaders() : getHeaders()
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  const arr = await res.json()
  return arr[0] || null
}

async function dbInsert(table, row, token = null) {
  const res = await fetch(`${API_URL}/${table}`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(row)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt)
  }
  const arr = await res.json()
  return arr[0] || null
}

async function dbUpdate(table, id, data, useService = false) {
  const headers = useService ? getServiceHeaders() : getHeaders()
  const res = await fetch(`${API_URL}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt)
  }
  const arr = await res.json()
  return arr[0] || null
}

async function dbSelect(table, filters = {}) {
  let url = `${API_URL}/${table}?select=*`
  for (const [col, val] of Object.entries(filters)) {
    url += `&${col}=eq.${val}`
  }
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) return []
  return await res.json()
}

export const Auth = {
  async loginWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    } catch (err) {
      console.error('Google login error:', err)
      return { ok: false, error: 'Error al conectar con Google.' }
    }
  },

  async login(email, password) {
    try {
      const cleanEmail = email.trim().toLowerCase()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) return { ok: false, error: 'Credenciales inválidas' }
        console.error('Login error:', authError)
        return { ok: false, error: 'Error al iniciar sesión: ' + authError.message }
      }

      console.log('Login: Auth success, looking for profile for email:', cleanEmail)
      const data = await dbGetOne('fd_members', { email: cleanEmail }, true)

      if (!data) {
        console.error('Login: Profile not found in fd_members for email:', cleanEmail)
        await supabase.auth.signOut()
        return { ok: false, error: 'Perfil no encontrado. Verifica que tu cuenta esté registrada.' }
      }

      localStorage.setItem('fd_session', JSON.stringify({
        id: data.id, userId: data.id, role: data.role, name: data.name, email: data.email, color: data.color,
        family_id: data.family_id, accessToken: authData.session.access_token
      }))

      return { ok: true, user: data }
    } catch (err) {
      console.error('Fatal login error:', err)
      return { ok: false, error: 'Error inesperado al conectar con el servidor.' }
    }
  },

  async register(data) {
    try {
      const cleanEmail = data.email.trim().toLowerCase()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
            color: data.color || '#3b82f6',
            age: data.age || null
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) return { ok: false, error: 'El email ya está registrado' }
        return { ok: false, error: authError.message }
      }

      if (!authData.user) return { ok: false, error: 'No se pudo crear el usuario.' }

      // Wait for the DB trigger to complete
      await new Promise(r => setTimeout(r, 1000))

      // Try to fetch the profile created by the trigger
      let member = await dbGetOne('fd_members', { email: cleanEmail }, true)

      if (!member && authData.session) {
        // Trigger may have failed — create profile manually
        try {
          member = await dbInsert('fd_members', {
            id: authData.user.id,
            name: data.name,
            age: data.age || null,
            role: data.role,
            color: data.color || '#3b82f6',
            email: cleanEmail,
            status: 'active',
            total_points: 0,
            redeemed_points: 0,
            family_id: data.role !== 'child' ? crypto.randomUUID() : null
          }, authData.session.access_token)
        } catch (insertErr) {
          console.error('Manual profile creation failed:', insertErr)
        }
      }

      if (!member) {
        return { ok: false, error: 'Usuario creado pero falló la sincronización del perfil. Intenta iniciar sesión.' }
      }

      // Both admin and child get a session if registration succeeded
      if (authData.session) {
        localStorage.setItem('fd_session', JSON.stringify({
          id: member.id, userId: member.id, role: member.role, name: member.name, email: member.email, color: member.color,
          family_id: member.family_id, accessToken: authData.session.access_token
        }))
      }

      return { ok: true, user: member }
    } catch (err) {
      console.error('Registration error:', err)
      return { ok: false, error: 'No pudimos completar el registro: ' + (err.message || 'Error de conexión') }
    }
  },

  /**
   * Search a member in the DB by email (bypasses RLS using service role if available)
   * Returns the member or null
   */
  async searchMemberByEmail(email) {
    const cleanEmail = email.trim().toLowerCase()
    // Try with service role first (bypasses RLS)
    const member = await dbGetOne('fd_members', { email: cleanEmail }, !!SERVICE_KEY)
    return member
  },

  /**
   * Link an existing member to the current user's family.
   * The member must already be registered in the system.
   */
  async linkMemberToFamily(memberId, familyId, overrideData = {}) {
    const updatePayload = {
      family_id: familyId,
      status: 'active',
      ...overrideData
    }
    const updated = await dbUpdate('fd_members', memberId, updatePayload, !!SERVICE_KEY)
    if (!updated) return { ok: false, error: 'No se pudo vincular el miembro a la familia.' }
    return { ok: true, member: updated }
  },

  async logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('fd_session')
    window.location.href = '/login'
  },

  getCurrentUser() {
    const session = localStorage.getItem('fd_session')
    if (!session) return null
    try {
      return JSON.parse(session)
    } catch (e) {
      return null
    }
  },

  isLoggedIn() {
    return !!this.getCurrentUser()
  },

  isAdmin() {
    const user = this.getCurrentUser()
    return user ? user.role === 'admin' : false
  },

  async refreshSession() {
    const current = this.getCurrentUser()
    if (!current) return null
    
    // Fetch latest profile from DB using service role to be sure we get the family_id
    const fresh = await dbGetOne('fd_members', { id: current.id }, true)
    if (fresh) {
      const updated = {
        ...current,
        name: fresh.name,
        role: fresh.role,
        color: fresh.color,
        family_id: fresh.family_id
      }
      localStorage.setItem('fd_session', JSON.stringify(updated))
      return updated
    }
    return current
  }
}

export const Invitations = {
  /**
   * Re-send invitation email (only relevant if member is still 'invited' status)
   */
  async resend(email) {
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Se requiere Service Role Key para re-enviar invitaciones')
    }
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (error) throw error
    return { ok: true }
  },

  // When a user arrives from a Supabase invite link and sets their password
  async acceptSecurePassword(password) {
    try {
      const { data: authData, error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) return { ok: false, error: updateError.message }

      const userId = authData.user.id
      const memberProfile = await dbGetOne('fd_members', { id: userId }, true)
      if (!memberProfile) return { ok: false, error: 'No se halló el perfil asignado.' }

      const updatedMember = await dbUpdate('fd_members', userId, { status: 'active' }, true)
      if (!updatedMember) return { ok: false, error: 'Error al activar el perfil.' }

      localStorage.setItem('fd_session', JSON.stringify({
        id: updatedMember.id, userId: updatedMember.id, role: updatedMember.role, name: updatedMember.name,
        email: updatedMember.email, color: updatedMember.color,
        family_id: updatedMember.family_id, accessToken: authData.session.access_token
      }))

      return { ok: true, user: updatedMember }
    } catch (err) {
      console.error('Accept secure invitation error:', err)
      return { ok: false, error: 'Error configurando la contraseña: ' + err.message }
    }
  },

  async getAll() {
    const data = await dbSelect('fd_members', { status: 'invited' })
    return (data || []).map(m => ({
      token: 'supabase',
      memberId: m.id,
      memberName: m.name,
      email: m.email,
      role: m.role,
      color: m.color,
      status: 'pending',
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    }))
  }
}
