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
import CompleteProfile from './pages/CompleteProfile.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  useEffect(() => {
    // Solo manejar sign out y refresco de token para sesiones email/password
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const stored = localStorage.getItem('fd_session')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed.accessToken !== session.access_token) {
              parsed.accessToken = session.access_token
              localStorage.setItem('fd_session', JSON.stringify(parsed))
            }
          } catch (e) {}
        }
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('fd_session')
        localStorage.removeItem('fd_pending_session')
      }
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
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
