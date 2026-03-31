import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Trophy, Gift, Users, AlertCircle } from 'lucide-react'
import { Auth } from '../lib/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    // Si ya hay sesión local guardada, redirigir de inmediato
    if (Auth.isLoggedIn()) {
      const u = Auth.getCurrentUser()
      const dest = u?.role === 'superadmin' ? '/superadmin' : u?.role === 'child' ? '/my-tasks' : '/dashboard'
      navigate(dest, { replace: true })
    }
    // NOTA: NO escuchamos onAuthStateChange aquí porque cuando se usa Google OAuth
    // Supabase redirige a /auth/callback, no a /login. Escuchar la sesión aquí
    // causaba un bucle infinito: sesión detectada → espera fd_session → nunca llega → loop
  }, [navigate])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true); setError('')
    const result = await Auth.login(form.email, form.password)
    if (result.ok) {
      const dest = result.user.role === 'superadmin' ? '/superadmin' : result.user.role === 'child' ? '/my-tasks' : '/dashboard'
      navigate(dest, { replace: true })
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="anim-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="login-left-col anim-fade-in" style={{ width: '40%', background: 'var(--bg-sidebar)', backgroundImage: 'radial-gradient(rgba(167,139,250,.15) 1px, transparent 1px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: 32, animationDelay: '.05s' }}>
        <style>{`
          @media (max-width: 768px) { .login-left-col { display: none !important; } .login-right-col { padding: 24px 20px !important; } .mobile-logo { display: flex !important; } .login-card-container { max-width: none !important; width: 100% !important; } }
          .mobile-logo { display: none; margin-bottom: 24px; align-items: center; justify-content: center; gap: 12px; }
        `}</style>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src="/logo home-day.png" alt="Home Day Logo" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'white', lineHeight: 1.1 }}>Home Day</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Tareas con Premios</div>
          </div>
        </div>

        <div style={{ width: 32, height: 2, background: 'var(--purple-500)', opacity: 0.5, borderRadius: 2 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            <Trophy size={20} color="var(--purple-400)" /> Gana puntos por cada tarea completada
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            <Gift size={20} color="var(--purple-400)" /> Canjea premios increíbles
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            <Users size={20} color="var(--purple-400)" /> Toda la familia unida
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <Link to="/register" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px 16px', borderRadius: 99, fontSize: 12, textDecoration: 'none', transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.1)' }}>
            ¿No tienes cuenta? <span style={{ color: 'var(--purple-400)', fontWeight: 800 }}>Regístrate →</span>
          </Link>
        </div>
      </div>

      <div className="login-right-col" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, flexDirection: 'column' }}>
        
        <div className="mobile-logo">
          <img src="/logo home-day.png" alt="Home Day Logo" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gray-800)', lineHeight: 1 }}>Home Day</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tareas con Premios</div>
          </div>
        </div>

        <div className="card anim-slide-up login-card-container" style={{ width: '100%', maxWidth: 420, padding: '40px 36px', animationDelay: '.1s' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>
              👋
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)', marginBottom: 4 }}>¡Hola de nuevo!</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Inicia sesión en tu hogar</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--red-50)', borderLeft: '3px solid var(--red-400)', padding: '12px 14px', borderRadius: '4px var(--r-sm) var(--r-sm) 4px' }}>
                <AlertCircle size={15} color="var(--red-500)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--red-600)' }}>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="Email" 
                  style={{ paddingLeft: 42, ...(error && !form.email ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type={showPass ? 'text' : 'password'} 
                  className="form-input" 
                  placeholder="Contraseña" 
                  style={{ paddingLeft: 42, paddingRight: 40, ...(error && !form.password ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gray-400)' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--purple-500)', width: 16, height: 16 }} />
              Recordarme
            </label>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Entrando...</>
              ) : (
                'Entrar a mi hogar 🏠'
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>o ingresa con</span>
              <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
            </div>

            <button 
              type="button" 
              className="btn" 
              onClick={() => Auth.loginWithGoogle()}
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                background: 'white', 
                color: 'var(--gray-700)', 
                border: '1px solid var(--gray-300)',
                gap: 10,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.35A9 9 0 0 0 9 18z" fill="#34A853"/><path d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.94H.95a9 9 0 0 0 0 8.12l3.01-2.35z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.47A9 9 0 0 0 0 9l3.01 2.35c.71-2.13 2.7-3.71 5.04-3.71z" fill="#EA4335"/></svg>
              Continuar con Google
            </button>
          </form>

          <div style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', display: 'none' }} className="mobile-only-link">
            ¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--purple-500)', textDecoration: 'none', fontWeight: 700 }}>Regístrate</Link>
            <style>{`@media (max-width: 768px) { .mobile-only-link { display: block !important; } }`}</style>
          </div>

        </div>
      </div>
    </div>
  )
}
