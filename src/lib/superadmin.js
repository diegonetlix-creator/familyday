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
      return await FamilyMember.list('-createdAt', 1000, true) // true = global
    } catch (err) {
      console.error("Error fetching global users:", err)
      return []
    }
  },

  getStatsFallback: async () => {
    try {
      const { FamilyMember, Task, TaskCompletion, Reward, RewardRedemption } = await import('./store.js')
      
      const [users, tasks, completions, rewards, redemptions] = await Promise.all([
        FamilyMember.list('-createdAt', undefined, true),
        Task.list(undefined, undefined, true),
        TaskCompletion.list(undefined, undefined, true),
        Reward.list(undefined, undefined, true),
        RewardRedemption.list(undefined, undefined, true)
      ])

      const admins = users.filter(u => u.role === 'admin')
      const children = users.filter(u => u.role === 'child')

      const activeTasks = tasks.filter(t => t.is_active !== false).length
      const inactiveTasks = tasks.filter(t => t.is_active === false).length
      
      const pendingCompletions = completions.filter(c => c.status === 'pendiente' || c.status === 'en-revision').length
      const approvedCompletions = completions.filter(c => c.status === 'aprobada').length
      const rejectedCompletions = completions.filter(c => c.status === 'rechazada').length

      // Teacher AI stats. Since we don't have a table for peticiones yet, we mock it or count from parents with 'premium'
      // How many children have access? => Children whose family admin is premium
      const premiumFamilyIds = new Set(admins.filter(a => a.plan === 'premium').map(a => a.family_id))
      const premiumChildrenCount = children.filter(c => premiumFamilyIds.has(c.family_id)).length

      return {
        totalUsers: users.length,
        totalAdmins: admins.length,
        totalChildren: children.length,
        
        totalTasks: tasks.length,
        activeTasks,
        inactiveTasks,
        
        pendingCompletions,
        approvedCompletions,
        rejectedCompletions,
        
        totalRewards: rewards.length,
        rewardsRedeemed: redemptions.length,
        
        premiumChildrenCount,
        aiUsageCount: 0 // Will implement real count if table exists
      }
    } catch (err) {
      console.error("Fallback stats error:", err)
      return { 
        totalUsers: 0, totalAdmins: 0, totalChildren: 0, 
        totalTasks: 0, activeTasks: 0, inactiveTasks: 0,
        pendingCompletions: 0, approvedCompletions: 0, rejectedCompletions: 0,
        totalRewards: 0, rewardsRedeemed: 0,
        premiumChildrenCount: 0, aiUsageCount: 0 
      }
    }
  }
}
