// WARNING: The SuperAdmin key must NEVER be exposed in the frontend.
// It has been removed and moved to a secure Supabase Edge Function.
const API_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co') + '/functions/v1'

export const SuperAdmin = {
  getGlobalStats: async () => {
    try {
      // We fetch the fresh session token from Supabase
      const { data: { session } } = await (await import('./store.js')).supabase.auth.getSession()
      
      const res = await fetch(`${API_URL}/get-superadmin-stats`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch global stats')
      }

      return await res.json()
    } catch (err) {
      console.error("Security Error / API Error:", err)
      return null
    }
  }
}
