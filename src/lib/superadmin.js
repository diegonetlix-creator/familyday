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
      const { FamilyMember } = await import('./store.js')
      return await FamilyMember.list('created_at.desc', 1000, true) // true = global
    } catch (err) {
      console.error("Error fetching global users:", err)
      return []
    }
  },

  getStatsFallback: async () => {
    try {
      const { FamilyMember, Task, TaskCompletion } = await import('./store.js')
      
      const [users, admins, children, tasks, completions] = await Promise.all([
        FamilyMember.list(undefined, undefined, true),
        FamilyMember.list(undefined, undefined, true).then(m => m.filter(u => u.role === 'admin')),
        FamilyMember.list(undefined, undefined, true).then(m => m.filter(u => u.role === 'child')),
        Task.list(undefined, undefined, true),
        TaskCompletion.list(undefined, undefined, true)
      ])

      return {
        totalUsers: users.length,
        totalAdmins: admins.length,
        totalChildren: children.length,
        totalTasks: tasks.length,
        totalRewardsDelivered: completions.filter(c => c.status === 'aprobada').length,
        aiUsageCount: 0
      }
    } catch (err) {
      console.error("Fallback stats error:", err)
      return { totalUsers: 0, totalAdmins: 0, totalChildren: 0, totalTasks: 0, totalRewardsDelivered: 0, aiUsageCount: 0 }
    }
  }
}
