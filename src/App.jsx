import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import MyTasks from './pages/MyTasks.jsx'
import Members from './pages/Members.jsx'
import Review from './pages/Review.jsx'
import Rewards from './pages/Rewards.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Teacher from './pages/Teacher.jsx'
import SuperAdmin from './pages/SuperAdmin.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
        // Direct REST API fetch to avoid hanging supabase-js client
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fd_members?id=eq.${session.user.id}&select=*&limit=1`
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY
        const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${session.access_token}` } })
        const arr = await res.json()
        const data = arr && arr.length > 0 ? arr[0] : null
        
        if (data && data.status === 'invited') {
          if (!window.location.href.includes('/register')) {
            window.location.href = '/register?supaInvite=true'
          }
        } else if (data) {
           localStorage.setItem('fd_session', JSON.stringify({
            id: data.id, userId: data.id, role: data.role, name: data.name, email: data.email, color: data.color,
            family_id: data.family_id, accessToken: session.access_token
          }))
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('fd_session')
      }
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="tasks"       element={<ProtectedRoute adminOnly><Tasks /></ProtectedRoute>} />
          <Route path="my-tasks"    element={<MyTasks />} />
          <Route path="members"     element={<ProtectedRoute adminOnly><Members /></ProtectedRoute>} />
          <Route path="review"      element={<ProtectedRoute adminOnly><Review /></ProtectedRoute>} />
          <Route path="rewards"     element={<Rewards />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="teacher"     element={<Teacher />} />
          <Route path="superadmin"  element={<ProtectedRoute superAdminOnly><SuperAdmin /></ProtectedRoute>} />
          <Route path="settings"    element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
