// WARNING: The SuperAdmin key must NEVER be exposed in the frontend.
// It has been removed and moved to a secure Supabase Edge Function.
const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/functions/v1'

export const SuperAdmin = {
  getGlobalStats: async () => {
    try {
      const { data: { session } } = await (await import('./store.js')).supabase.auth.getSession()
      
      const res = await fetch(`${API_URL}/get-superadmin-stats`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) throw new Error('Failed to fetch global stats')
      return await res.json()
    } catch (err) {
      console.warn("Edge Function not found or failed, using fallback:", err.message)
      return null
    }
  },

  getGlobalUsers: async () => {
    try {
      // Use direct REST fetch to bypass potential supabase-js hangs
      const { data: { session } } = await (await import('./store.js')).supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fd_members?select=*&order=created_at.desc`
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      const res = await fetch(url, { 
        headers: { 
          'apikey': key, 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        } 
      })
      
      if (!res.ok) return []
      return await res.json()
    } catch (err) {
      console.error("Error fetching global users:", err)
      return []
    }
  },

  getStatsFallback: async () => {
    try {
      const { data: { session } } = await (await import('./store.js')).supabase.auth.getSession()
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 
        'apikey': key, 
        'Authorization': `Bearer ${session?.access_token}`,
        'Prefer': 'count=exact'
      }

      const fetchCount = async (table, filter = '') => {
        const res = await fetch(`${baseUrl}/${table}?select=id${filter}&limit=1`, { headers })
        const range = res.headers.get('content-range')
        return range ? parseInt(range.split('/')[1]) : 0
      }

      const [users, admins, children, tasks, completions] = await Promise.all([
        fetchCount('fd_members'),
        fetchCount('fd_members', '&role=eq.admin'),
        fetchCount('fd_members', '&role=eq.child'),
        fetchCount('fd_tasks'),
        fetchCount('fd_completions', '&status=eq.aprobada')
      ])

      return {
        totalUsers: users,
        totalAdmins: admins,
        totalChildren: children,
        totalTasks: tasks,
        totalRewardsDelivered: completions,
        aiUsageCount: 0 // Cannot fetch without specialized table
      }
    } catch (err) {
      console.error("Fallback stats error:", err)
      return { totalUsers: 0, totalAdmins: 0, totalChildren: 0, totalTasks: 0, totalRewardsDelivered: 0, aiUsageCount: 0 }
    }
  }
}
