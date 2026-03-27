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
// The supabase-js client hangs on queries due to auth session issues.
// We use direct REST calls with the anon key which always works.
const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/rest/v1'
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcXBhZnZ3bGdtc3d0aG5tdmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTE0MTIsImV4cCI6MjA4OTUyNzQxMn0.1J9MB0K4dLld2yHOcct6m8VhF40VLO4lya179ChsoAE'

const getHeaders = async () => {
  const sessionData = localStorage.getItem('fd_session')
  const h = {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      h['Authorization'] = `Bearer ${session.access_token}`
      // Update local storage if needed
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        if (parsed.accessToken !== session.access_token) {
          parsed.accessToken = session.access_token
          localStorage.setItem('fd_session', JSON.stringify(parsed))
        }
      }
    } else if (sessionData) {
       const parsed = JSON.parse(sessionData)
       if (parsed.accessToken) h['Authorization'] = `Bearer ${parsed.accessToken}`
    }
  } catch (e) {
    console.error("Session refresh error:", e)
  }
  return h
}

// GET rows from a table
async function dbSelect(table, { order, limit, filters } = {}) {
  let url = `${API_URL}/${table}?select=*`
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

  const headers = await getHeaders()
  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.error(`dbSelect ${table} error:`, res.status, await res.text())
    return []
  }
  return (await res.json()).map(mapFrom)
}

// INSERT a row
async function dbInsert(table, row) {
  const session = JSON.parse(localStorage.getItem('fd_session') || '{}')
  const familyId = session.family_id
  
  if (!familyId && table !== 'fd_members') {
    console.error(`dbInsert ${table} error: missing family_id in session. Please logout and login again.`)
  }

  const data = familyId ? { ...row, family_id: familyId } : row
  const headers = await getHeaders()

  const res = await fetch(`${API_URL}/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(mapTo(data))
  })
  if (!res.ok) {
    const txt = await res.text()
    console.error(`dbInsert ${table} error:`, res.status, txt)
    throw new Error(`Insert failed: ${txt}`)
  }
  const arr = await res.json()
  return mapFrom(arr[0])
}

// UPDATE a row by id
async function dbUpdate(table, id, data) {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(mapTo(data))
  })
  if (!res.ok) {
    const txt = await res.text()
    console.error(`dbUpdate ${table} error:`, res.status, txt)
    throw new Error(`Update failed: ${txt}`)
  }
  const arr = await res.json()
  return mapFrom(arr[0])
}

// DELETE a row by id
async function dbDelete(table, id) {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers
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
  const headers = await getHeaders()
  const res = await fetch(url, {
    headers: { ...headers, 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' }
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
  list:   (sort, limit)  => dbSelect('fd_members', { order: sort, limit }),
  get:    async (id)     => { const rows = await dbSelect('fd_members', { filters: { id } }); return rows[0] || null },
  create: (data)         => dbInsert('fd_members', data),
  update: (id, data)     => dbUpdate('fd_members', id, data),
  delete: (id)           => dbDelete('fd_members', id)
}

export const Task = {
  list:   (sort, limit)  => dbSelect('fd_tasks', { order: sort, limit }),
  filter: (whereObj)     => dbSelect('fd_tasks', { filters: whereObj }),
  create: (data)         => dbInsert('fd_tasks', data),
  update: (id, data)     => dbUpdate('fd_tasks', id, data),
  delete: (id)           => dbDelete('fd_tasks', id)
}

export const TaskCompletion = {
  list:         (sort = '-createdAt', limit = 100) => dbSelect('fd_completions', { order: sort, limit }),
  countPending: ()       => dbCount('fd_completions', { status: 'pendiente' }),
  create:       (data)   => dbInsert('fd_completions', data),
  update:       (id, data) => dbUpdate('fd_completions', id, data)
}

export const Reward = {
  list:   (sort, limit)  => dbSelect('fd_rewards', { order: sort, limit }),
  filter: (whereObj)     => dbSelect('fd_rewards', { filters: whereObj }),
  create: (data)         => dbInsert('fd_rewards', data),
  update: (id, data)     => dbUpdate('fd_rewards', id, data),
  delete: (id)           => dbDelete('fd_rewards', id)
}

export const RewardRedemption = {
  list:   (sort, limit)  => dbSelect('fd_redemptions', { order: sort, limit }),
  create: (data)         => dbInsert('fd_redemptions', data)
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
