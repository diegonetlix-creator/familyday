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
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Páginas públicas donde SÍ debemos redirigir tras login
const PUBLIC_PATHS = ['/login', '/register', '/complete-profile', '/']

async function resolveSessionAndRedirect(session) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fd_members?id=eq.${session.user.id}&select=*&limit=1`
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  try {
    const res = await fetch(url, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${session.access_token}` }
    })
    const arr = await res.json()
    const data = arr && arr.length > 0 ? arr[0] : null

    if (data && data.status === 'invited') {
      // Invitado → completar registro
      if (!window.location.href.includes('/register')) {
        window.location.href = '/register?supaInvite=true'
      }
      return
    }

    if (data && data.status === 'active') {
      // Perfil completo → guardar sesión y redirigir
      localStorage.setItem('fd_session', JSON.stringify({
        id: data.id,
        userId: data.id,
        role: data.role,
        name: data.name,
        email: data.email,
        color: data.color,
        family_id: data.family_id,
        accessToken: session.access_token
      }))
      localStorage.removeItem('fd_pending_session')

      // Redirigir si está en página pública o raíz
      const currentPath = window.location.pathname
      if (PUBLIC_PATHS.includes(currentPath) || currentPath === '/') {
        const dest = data.role === 'superadmin'
          ? '/superadmin'
          : data.role === 'child'
          ? '/my-tasks'
          : '/dashboard'
        window.location.href = dest
      }
      return
    }

    // Sin perfil en fd_members → nuevo usuario Google → completar perfil
    localStorage.setItem('fd_pending_session', JSON.stringify({
      userId: session.user.id,
      email: session.user.email,
      accessToken: session.access_token
    }))
    if (!window.location.href.includes('/complete-profile')) {
      window.location.href = '/complete-profile'
    }
  } catch (err) {
    console.error('resolveSessionAndRedirect error:', err)
  }
}

export default function App() {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email)

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('fd_session')
        localStorage.removeItem('fd_pending_session')
        return
      }

      // Manejar sesión activa en todos los eventos relevantes
      if (session && ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'PASSWORD_RECOVERY'].includes(event)) {
        // Si ya hay sesión guardada y no es página pública, no interrumpir
        const existingSession = localStorage.getItem('fd_session')
        const currentPath = window.location.pathname
        const isPublicPath = PUBLIC_PATHS.some(p => currentPath === p)

        if (existingSession && !isPublicPath) {
          // Ya tenemos sesión y estamos en app → solo refrescar token
          try {
            const parsed = JSON.parse(existingSession)
            localStorage.setItem('fd_session', JSON.stringify({
              ...parsed,
              accessToken: session.access_token
            }))
          } catch {}
          return
        }

        await resolveSessionAndRedirect(session)
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
