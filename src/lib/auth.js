import { supabase, supabaseAdmin } from './supabase.js'
import { FamilyMember } from './store.js'

// === DIRECT REST API HELPERS ===
const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/rest/v1'
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
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

async function dbGetOne(table, filters) {
  let url = `${API_URL}/${table}?select=*`
  for (const [col, val] of Object.entries(filters)) {
    url += `&${col}=eq.${val}`
  }
  url += '&limit=1'
  const res = await fetch(url, { headers: getHeaders() })
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

async function dbUpdate(table, id, data) {
  const res = await fetch(`${API_URL}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
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
      // Use direct fetch to avoid hanging supabase-js client
      const data = await dbGetOne('fd_members', { email: cleanEmail })
      
      if (!data) {
        console.error('Login: Profile not found in fd_members for email:', cleanEmail)
        await supabase.auth.signOut()
        return { ok: false, error: 'Perfil no encontrado en la base de datos de la familia.' }
      }
      
      if (data.status === 'invited') {
        await supabase.auth.signOut()
        return { ok: false, error: data.role === 'child' ? 'Tu cuenta está pendiente. Un administrador debe agregarte a la familia con este mismo correo.' : 'Cuenta no activada.' }
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
      
      // We pass the metadata to Supabase Auth so the DB trigger can use it
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

      // Wait a moment for the database trigger to complete sync
      await new Promise(r => setTimeout(r, 800))

      // Try to fetch the profile created by the trigger
      let member = await dbGetOne('fd_members', { email: cleanEmail })
      
      if (!member) {
         // Fallback if the trigger hasn't finished or RLS blocked the read
         if (!authData.session) {
            return { 
              ok: true, 
              user: { 
                email: cleanEmail, 
                role: data.role, 
                status: data.role === 'child' ? 'invited' : 'active' 
              } 
            }
         }
         return { ok: false, error: 'Usuario creado pero falló la sincronización del perfil.' }
      }

      if (member.status === 'active' && authData.session) {
        localStorage.setItem('fd_session', JSON.stringify({
          id: member.id, userId: member.id, role: member.role, name: member.name, email: member.email, color: member.color,
          family_id: member.family_id, accessToken: authData.session.access_token
        }))
      } else if (member.status === 'invited' || !authData.session) {
        await supabase.auth.signOut()
      }
      
      return { ok: true, user: member }
    } catch (err) {
      console.error('Registration error:', err)
      return { ok: false, error: 'No pudimos completar el registro: ' + (err.message || 'Error de conexión') }
    }
  },
  
  async linkChild(email, childData) {
    // Busca al niño por email y si existe y está 'invited', lo activa
    const existing = await dbGetOne('fd_members', { email, role: 'child' })
    if (!existing) {
      return { ok: false, error: 'No se encontró una cuenta de hijo/a registrada con ese correo. Pídele que se registre primero.' }
    }
    
    if (existing.status === 'active') {
      return { ok: false, error: 'Este hijo/a ya está activo en la familia.' }
    }

    const updated = await dbUpdate('fd_members', existing.id, {
      status: 'active',
      name: childData.name || existing.name,
      age: childData.age || existing.age,
      color: childData.color || existing.color
    })
    
    if (!updated) return { ok: false, error: 'Error al actualizar el perfil del hijo/a.' }
    return { ok: true, member: updated }
  },

  async logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('fd_session')
    window.location.href = '/'
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
  }
}

export const Invitations = {
  async create(memberPayload) {
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Se requiere Service Role Key (VITE_SUPABASE_SERVICE_ROLE_KEY) para enviar invitaciones automáticas por correo desde Supabase.")
    }

    // 1. Enviar invitacion nativa de Supabase Auth (Envia correo)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(memberPayload.email)
    
    if (authError) {
      console.error('Error enviando invitación desde Auth:', authError)
      throw authError
    }

    const user = Auth.getCurrentUser();
    const familyId = user?.family_id;

    // 2. Crear el perfil del miembro invitado vinculando su nuevo UUID
    const member = await dbInsert('fd_members', {
      id: userId,
      name: memberPayload.name,
      age: memberPayload.age || null,
      role: memberPayload.role,
      color: memberPayload.color,
      email: memberPayload.email,
      status: 'invited',
      total_points: 0,
      redeemed_points: 0,
      family_id: familyId
    })

    if (!member) {
      throw new Error("Error guardando miembro tras invitación")
    }

    return { token: 'supabase-real', isRealInvite: true, member }
  },

  async resend(email) {
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Se requiere Service Role Key local para re-enviar invitaciones");
    }
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (error) throw error;
    return { ok: true, isRealInvite: true };
  },

  // Dummy de validación local (Supabase Auth se encarga de esto)
  async validate(token) {
    return { valid: false, error: 'Proceso delegado a Supabase Auth' }
  },

  async revoke(token) {
    return { ok: true }
  },

  // Cuando el usuario viene cargado por Hash URL de Supabase y decide su password
  async acceptSecurePassword(password) {
    try {
      // 1. Supabase Auth actualiza la password del usuario que hizo clic en el link
      const { data: authData, error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) return { ok: false, error: updateError.message }
      
      const userId = authData.user.id;

      // 2. Traer su perfil (direct fetch)
      const memberProfile = await dbGetOne('fd_members', { id: userId })
      if (!memberProfile) return { ok: false, error: 'No se halló el perfil asignado.' }

      // 3. Activar en fd_members (direct fetch update)
      const updatedMember = await dbUpdate('fd_members', userId, { status: 'active' })
      if (!updatedMember) return { ok: false, error: 'Error al activar el perfil.' }

      // 4. Crear sesión local
      localStorage.setItem('fd_session', JSON.stringify({
        id: updatedMember.id, userId: updatedMember.id, role: updatedMember.role, name: updatedMember.name, email: updatedMember.email, color: updatedMember.color,
        family_id: updatedMember.family_id, accessToken: authData.session.access_token
      }))

      return { ok: true, user: updatedMember }
    } catch (err) {
      console.error('Accept secure invitation error:', err)
      return { ok: false, error: 'Error configurando la contraseña: ' + err.message }
    }
  },

  async getAll() {
    // Use direct fetch to avoid hanging supabase-js client
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
