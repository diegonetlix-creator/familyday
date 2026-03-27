const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/rest/v1'
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

const getServiceHeaders = () => ({
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
})

// Bypasses RLS to fetch global counts
async function fetchCount(table, filters = {}) {
  let url = `${API_URL}/${table}?select=*&limit=1` // We use head to just get count
  for (const [col, val] of Object.entries(filters)) {
    url += `&${col}=eq.${val}`
  }
  
  const res = await fetch(url, { 
    headers: { ...getServiceHeaders(), 'Prefer': 'count=exact' },
    method: 'HEAD'
  })
  
  if (!res.ok) return 0
  
  const range = res.headers.get('content-range')
  if (range && range.includes('/')) {
    return parseInt(range.split('/')[1]) || 0
  }
  return 0
}

// Sum a specific column
async function fetchSum(table, column) {
  const url = `${API_URL}/${table}?select=${column}`
  const res = await fetch(url, { headers: getServiceHeaders() })
  if (!res.ok) return 0
  const data = await res.json()
  return data.reduce((acc, row) => acc + (row[column] || 0), 0)
}

export const SuperAdmin = {
  getGlobalStats: async () => {
    try {
      const [
        totalUsers,
        totalAdmins,
        totalChildren,
        totalTasks,
        totalRewardsDelivered,
        aiUsageCount
      ] = await Promise.all([
        fetchCount('fd_members'),
        fetchCount('fd_members', { role: 'admin' }),
        fetchCount('fd_members', { role: 'child' }),
        fetchCount('fd_tasks'),
        fetchCount('fd_redemptions', { status: 'approved' }),
        fetchSum('fd_members', 'ai_usage_count')
      ])

      return {
        totalUsers,
        totalAdmins,
        totalChildren,
        totalTasks,
        totalRewardsDelivered,
        aiUsageCount
      }
    } catch (err) {
      console.error("Error fetching global stats:", err)
      return null
    }
  }
}
