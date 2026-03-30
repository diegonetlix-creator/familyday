import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const API_URL = import.meta.env.VITE_SUPABASE_URL + '/rest/v1'
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Headers con service role (bypasses RLS)
const serviceHeaders = {
  'apikey': API_KEY,
  'Authorization': `Bearer ${SERVICE_KEY || API_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Verificando tu sesión...')

  useEffect(() => {
    let cancelled = false

    async function handleCallback() {
      try {
        setStatus('Conectando con Google...')
        
        // Esperar sesión activa (Supabase la procesa automáticamente del hash/code)
        let session = null
        let attempts = 0
        while (!session && attempts < 25) {
          const { data } = await supabase.auth.getSession()
          session = data?.session
          if (!session) {
            await new Promise(r => setTimeout(r, 300))
            attempts++
          }
        }

        if (!session) {
          setStatus('No se pudo obtener la sesión. Redirigiendo...')
          setTimeout(() => navigate('/login', { replace: true }), 2000)
          return
        }

        if (cancelled) return

        setStatus('Buscando tu perfil...')
        const uid = session.user.id
        const email = session.user.email
        console.log('[AuthCallback] Auth UID:', uid, '| Email:', email)

        // ─── 1. Búsqueda por ID exacto (usuario ya vinculado) ───────────────
        let profile = null
        const byIdRes = await fetch(
          `${API_URL}/fd_members?id=eq.${uid}&select=*&limit=1`,
          { headers: { 'apikey': API_KEY, 'Authorization': `Bearer ${session.access_token}` } }
        )
        if (byIdRes.ok) {
          const arr = await byIdRes.json()
          profile = arr?.[0] || null
        }
        console.log('[AuthCallback] By ID:', profile?.id || 'not found')

        // ─── 2. Búsqueda por email usando service role (bypasses RLS) ────────
        if (!profile && email) {
          const byEmailRes = await fetch(
            `${API_URL}/fd_members?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
            { headers: serviceHeaders }
          )
          if (byEmailRes.ok) {
            const arr = await byEmailRes.json()
            profile = arr?.[0] || null
          }
          console.log('[AuthCallback] By email:', profile?.id || 'not found', '| status:', profile?.status)

          // ─── 2a. Si encontró por email pero el ID no coincide ────────────
          // Esto pasa cuando el perfil fue creado con inviteUserByEmail (diferente UID)
          // y el usuario ahora se logueó con Google (nuevo UID).
          // Usamos la función RPC para migrar el ID de forma segura.
          if (profile && profile.id !== uid && SERVICE_KEY) {
            console.log('[AuthCallback] ID mismatch! old:', profile.id, '→ new:', uid)
            setStatus('Vinculando tu cuenta de Google...')

            // Llamar la función SECURITY DEFINER que actualiza el ID de forma segura
            const rpcRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/migrate_member_to_google_uid`, {
              method: 'POST',
              headers: serviceHeaders,
              body: JSON.stringify({
                old_id: profile.id,
                new_id: uid,
                user_email: email
              })
            })
            const rpcResult = await rpcRes.json()
            console.log('[AuthCallback] Migration result:', rpcResult)

            if (rpcResult?.ok) {
              // Releer el perfil actualizado
              const refreshRes = await fetch(
                `${API_URL}/fd_members?id=eq.${uid}&select=*&limit=1`,
                { headers: serviceHeaders }
              )
              if (refreshRes.ok) {
                const refreshArr = await refreshRes.json()
                if (refreshArr?.[0]) profile = refreshArr[0]
              }
            } else {
              console.warn('[AuthCallback] Migration failed:', rpcResult?.error)
              // Fallback: usar el perfil como está (el userId en fd_session tendrá el ID viejo)
              // pero al menos podrá ingresar
            }
          } else if (profile && profile.status === 'invited') {
            // Encontrado por email, mismo ID, pero estado invited → activar
            await fetch(`${API_URL}/fd_members?id=eq.${profile.id}`, {
              method: 'PATCH',
              headers: serviceHeaders,
              body: JSON.stringify({ status: 'active' })
            })
            profile = { ...profile, status: 'active' }
          }
        }

        if (cancelled) return

        // ─── 3. Perfil encontrado y activo → redirigir por rol ───────────────
        if (profile && profile.status === 'active') {
          setStatus('¡Listo! Entrando...')
          localStorage.setItem('fd_session', JSON.stringify({
            id: profile.id,
            userId: profile.id,
            role: profile.role,
            name: profile.name,
            email: profile.email,
            color: profile.color,
            family_id: profile.family_id,
            accessToken: session.access_token
          }))
          localStorage.removeItem('fd_pending_session')

          const dest = profile.role === 'superadmin'
            ? '/superadmin'
            : profile.role === 'child'
            ? '/my-tasks'
            : '/dashboard'

          console.log('[AuthCallback] ✅ Redirecting to:', dest, '| role:', profile.role)
          window.location.replace(dest)
          return
        }

        // ─── 4. Sin perfil → nuevo usuario Google → completar onboarding ─────

        setStatus('Configurando tu nueva cuenta...')
        localStorage.setItem('fd_pending_session', JSON.stringify({
          userId: uid,
          email: email,
          accessToken: session.access_token
        }))
        window.location.replace('/complete-profile')

      } catch (err) {
        console.error('[AuthCallback] Error:', err)
        if (!cancelled) {
          setStatus('Error inesperado. Redirigiendo...')
          setTimeout(() => navigate('/login', { replace: true }), 2000)
        }
      }
    }

    handleCallback()
    return () => { cancelled = true }
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20
    }}>
      <div style={{
        width: 56,
        height: 56,
        background: 'linear-gradient(135deg, var(--purple-400), var(--pink-500))',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        boxShadow: 'var(--shadow-purple)',
        animation: 'pulse 1.5s infinite'
      }}>
        🏠
      </div>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{status}</p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }`}</style>
    </div>
  )
}
