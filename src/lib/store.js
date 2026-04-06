import { supabase } from './supabase.js'

// === CONSTANTS ===
export const MEMBER_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']
export const CATEGORY_EMOJI = { hogar: '🏠', escuela: '📚', personal: '✨', mascotas: '🐾', comportamiento: '🤝', salud: '🍏', otros: '📌' }
export const CATEGORY_LABEL = { hogar: 'Hogar', escuela: 'Escuela', personal: 'Personal', mascotas: 'Mascotas', comportamiento: 'Comportamiento', salud: 'Salud', otros: 'Otros' }
export const STATUS_LABEL = { pendiente: 'Pendiente', 'en-revision': 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada' }
export const DIFFICULTY_LABEL = { easy: 'Fácil', medium: 'Normal', hard: 'Difícil' }
export const FREQUENCY_LABEL = { daily: 'Diaria', weekly: 'Semanal', once: 'Una vez' }
export const REWARD_CATEGORY_EMOJI = { 
  entretenimiento: '🎮', 
  comida: '🍕', 
  salidas: '🚗', 
  tecnologia: '💻', 
  ropa: '👕', 
  dinero: '💵', 
  privilegios: '🎟️', 
  viajes: '✈️',
  bienestar: '🧘',
  deportes: '⚽',
  otros: '🎁' 
}
export const REWARD_CATEGORY_BG = { 
  entretenimiento: 'var(--blue-50)', 
  comida: 'var(--amber-50)', 
  salidas: 'var(--purple-50)', 
  tecnologia: 'var(--cyan-50)', 
  ropa: 'var(--pink-50)', 
  dinero: 'var(--green-50)', 
  privilegios: 'var(--orange-50)', 
  viajes: 'var(--indigo-50)',
  bienestar: 'var(--teal-50)',
  deportes: 'var(--red-50)',
  otros: 'var(--gray-50)' 
}

// === DIRECT REST API ===
const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/rest/v1'
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

const getHeaders = async (useService = false) => {
  const key = (useService && SERVICE_KEY) ? SERVICE_KEY : null
  if (key) {
    return {
      'apikey': API_KEY,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  }

  // 1. Try to get a fresh token from Supabase session (this also refreshes if near-expiry)
  let token = API_KEY
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (session?.access_token) {
      token = session.access_token
      // Keep localStorage in sync
      const stored = localStorage.getItem('fd_session')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed.accessToken !== token) {
            parsed.accessToken = token
            localStorage.setItem('fd_session', JSON.stringify(parsed))
          }
        } catch (e) {}
      }
    } else {
      // 2. Session doesn't exist or expired – try explicit refresh
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed?.session?.access_token) {
        token = refreshed.session.access_token
      } else {
        // 3. Last resort: use stored access token from localStorage
        const sessionData = localStorage.getItem('fd_session')
        if (sessionData) {
          try {
            const { accessToken } = JSON.parse(sessionData)
            if (accessToken) token = accessToken
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // Network error – try localStorage
    const sessionData = localStorage.getItem('fd_session')
    if (sessionData) {
      try {
        const { accessToken } = JSON.parse(sessionData)
        if (accessToken) token = accessToken
      } catch (e2) {}
    }
  }

  return {
    'apikey': API_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
}

// GET rows from a table
async function dbSelect(table, { order, limit, filters, isGlobal = false, useService = false } = {}) {
  let url = `${API_URL}/${table}?select=*`
  const session = JSON.parse(localStorage.getItem('fd_session') || '{}')
  const familyId = session.family_id

  // Apply family_id filter by default if not global
  if (!isGlobal && familyId && !filters?.family_id) {
    url += `&family_id=eq.${familyId}`
  }

  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      url += `&${col}=eq.${val}`
    }
  }
  if (order) {
    const desc = order.startsWith('-')
    const col = order.replace(/^-/, '')
    const dbCol = col === 'createdAt' ? 'created_at' : col
    url += `&order=${dbCol}.${desc ? 'desc' : 'asc'}`
  }
  if (limit) url += `&limit=${limit}`

  // fd_members always uses service role to bypass RLS timing issues
  const svc = useService || table === 'fd_members'
  const res = await fetch(url, { headers: await getHeaders(svc) })
  if (!res.ok) {
    console.error(`dbSelect ${table} error:`, res.status, await res.text())
    return []
  }
  return (await res.json()).map(mapFrom)
}

// INSERT a row
async function dbInsert(table, row, retry = true) {
  const session = JSON.parse(localStorage.getItem('fd_session') || '{}')
  const familyId = session.family_id

  if (!familyId && table !== 'fd_members') {
    console.warn(`dbInsert ${table}: missing family_id in session – will rely on RLS`)
  }

  const data = familyId ? { ...row, family_id: familyId } : row

  const res = await fetch(`${API_URL}/${table}`, {
    method: 'POST',
    headers: await getHeaders(false),
    body: JSON.stringify(mapTo(data))
  })

  // On 401/403, refresh the session and retry once
  if ((res.status === 401 || res.status === 403) && retry) {
    console.warn(`dbInsert ${table}: got ${res.status}, attempting session refresh and retry`)
    try {
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed?.session?.access_token) {
        // Update localStorage with new token
        const stored = localStorage.getItem('fd_session')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            parsed.accessToken = refreshed.session.access_token
            localStorage.setItem('fd_session', JSON.stringify(parsed))
          } catch (_) {}
        }
        return dbInsert(table, row, false) // retry once
      }
    } catch (refreshErr) {
      console.error('Session refresh failed:', refreshErr)
    }
  }

  if (!res.ok) {
    const txt = await res.text()
    console.error(`dbInsert ${table} error:`, res.status, txt)
    throw new Error(`Insert failed (${res.status}): ${txt}`)
  }
  const arr = await res.json()
  return mapFrom(arr[0])
}

// UPDATE a row by id — uses service role for fd_members to bypass RLS
async function dbUpdate(table, id, data, retry = true) {
  const svc = table === 'fd_members'
  const res = await fetch(`${API_URL}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: await getHeaders(svc),
    body: JSON.stringify(mapTo(data))
  })

  if ((res.status === 401 || res.status === 403) && retry && !svc) {
    console.warn(`dbUpdate ${table}: got ${res.status}, attempting refresh and retry`)
    try {
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed?.session?.access_token) {
        const stored = localStorage.getItem('fd_session')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            parsed.accessToken = refreshed.session.access_token
            localStorage.setItem('fd_session', JSON.stringify(parsed))
          } catch (_) {}
        }
        return dbUpdate(table, id, data, false)
      }
    } catch (refreshErr) {
      console.error('Session refresh failed:', refreshErr)
    }
  }

  if (!res.ok) {
    const txt = await res.text()
    console.error(`dbUpdate ${table} error:`, res.status, txt)
    throw new Error(`Update failed (${res.status}): ${txt}`)
  }
  const arr = await res.json()
  return mapFrom(arr[0])
}

// DELETE a row by id
async function dbDelete(table, id) {
  const res = await fetch(`${API_URL}/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: await getHeaders(table === 'fd_members')
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Delete failed: ${txt}`)
  }
}

// COUNT rows matching a filter
async function dbCount(table, filters = {}) {
  let url = `${API_URL}/${table}?select=id`
  for (const [col, val] of Object.entries(filters)) {
    url += `&${col}=eq.${val}`
  }
  const res = await fetch(url, {
    headers: { ...await getHeaders(false), 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' }
  })
  const range = res.headers.get('content-range')
  if (range) {
    const total = range.split('/')[1]
    return parseInt(total) || 0
  }
  return 0
}


// === MAPPERS ===
const mapTo = (obj) => {
  if (!obj) return obj
  const out = { ...obj }
  delete out.confirmPassword
  delete out.createdAt
  if (out.memberId) { out.member_id = out.memberId; delete out.memberId }
  if (out.taskId) { out.task_id = out.taskId; delete out.taskId }
  if (out.rewardId) { out.reward_id = out.rewardId; delete out.rewardId }
  if (out.userId) { out.member_id = out.userId; delete out.userId }
  if (out.user_id) { out.member_id = out.user_id; delete out.user_id }
  return out
}

const mapFrom = (obj) => {
  if (!obj) return obj
  const out = { ...obj }
  if (out.created_at) out.createdAt = out.created_at
  if (out.member_id) { out.memberId = out.member_id; out.userId = out.member_id }
  if (out.task_id) out.taskId = out.task_id
  if (out.reward_id) out.rewardId = out.reward_id
  return out
}

// === DATA MODELS ===

export const FamilyMember = {
  list:   (sort, limit, global = false)  => dbSelect('fd_members', { order: sort, limit, isGlobal: global }),
  get:    async (id)     => { const rows = await dbSelect('fd_members', { filters: { id } }); return rows[0] || null },
  create: (data)         => dbInsert('fd_members', data),
  update: (id, data)     => dbUpdate('fd_members', id, data),
  delete: (id)           => dbDelete('fd_members', id)
}

export const Task = {
  list:   (sort, limit, global = false)  => dbSelect('fd_tasks', { order: sort, limit, isGlobal: global }),
  filter: (whereObj, global = false)     => dbSelect('fd_tasks', { filters: whereObj, isGlobal: global }),
  create: (data)         => dbInsert('fd_tasks', data),
  update: (id, data)     => dbUpdate('fd_tasks', id, data),
  delete: (id)           => dbDelete('fd_tasks', id)
}

export const TaskCompletion = {
  list:         (sort = '-createdAt', limit = 100, global = false) => dbSelect('fd_completions', { order: sort, limit, isGlobal: global }),
  countPending: ()       => dbCount('fd_completions', { status: 'pendiente' }),
  create:       (data)   => dbInsert('fd_completions', data),
  update:       (id, data) => dbUpdate('fd_completions', id, data)
}

export const Reward = {
  list:   (sort, limit, global = false)  => dbSelect('fd_rewards', { order: sort, limit, isGlobal: global }),
  filter: (whereObj, global = false)     => dbSelect('fd_rewards', { filters: whereObj, isGlobal: global }),
  create: (data)         => dbInsert('fd_rewards', data),
  update: (id, data)     => dbUpdate('fd_rewards', id, data),
  delete: (id)           => dbDelete('fd_rewards', id)
}

export const RewardRedemption = {
  list:   (sort, limit, global = false)  => dbSelect('fd_redemptions', { order: sort, limit, isGlobal: global }),
  create: (data)         => dbInsert('fd_redemptions', data),
  update: (id, data)     => dbUpdate('fd_redemptions', id, data)
}

export function getLevelInfo(points = 0) {
  const levels = [
    { level: 1, name: 'Principiante', min: 0, max: 200 },
    { level: 2, name: 'Aprendiz', min: 201, max: 500 },
    { level: 3, name: 'Ayudante', min: 501, max: 1000 },
    { level: 4, name: 'Estrella', min: 1001, max: 2000 },
    { level: 5, name: 'Héroe', min: 2001, max: 4000 },
    { level: 6, name: 'Maestro', min: 4001, max: 9999999 }
  ]
  const currentLevel = levels.filter(l => points >= l.min).pop() || levels[0]
  const progressToNext = Math.min(100, Math.round(((points - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100))
  return { ...currentLevel, progress: progressToNext }
}
