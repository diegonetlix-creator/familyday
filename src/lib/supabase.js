import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcXBhZnZ3bGdtc3d0aG5tdmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTE0MTIsImV4cCI6MjA4OTUyNzQxMn0.1J9MB0K4dLld2yHOcct6m8VhF40VLO4lya179ChsoAE'

export const supabase = createClient(supabaseUrl, supabaseKey)
export const supabaseAdmin = createClient(
  supabaseUrl, 
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '', 
  { auth: { autoRefreshToken: false, persistSession: false, storageKey: 'admin-auth-token' } }
)
