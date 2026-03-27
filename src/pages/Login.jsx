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
    if (Auth.isLoggedIn()) {
      const u = Auth.getCurrentUser()
      const dest = u?.role === 'superadmin' ? '/superadmin' : u?.role === 'child' ? '/my-tasks' : '/dashboard'
      navigate(dest, { replace: true })
    }
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

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@familyday.com', password: 'admin123' })
    if (role === 'child') setForm({ email: 'sofia@familyday.com', password: 'sofia123' })
    setError('')
  }

  return (
    <div className="anim-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="login-left-col anim-fade-in" style={{ width: '40%', background: 'var(--bg-sidebar)', backgroundImage: 'radial-gradient(rgba(167,139,250,.15) 1px, transparent 1px)', backgroundSize: '20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: 32, animationDelay: '.05s' }}>
        <style>{`
          @media (max-width: 768px) { .login-left-col { display: none !important; } .login-right-col { padding: 24px 20px !important; } .mobile-logo { display: flex !important; } .login-card-container { max-width: none !important; width: 100% !important; } }
          .mobile-logo { display: none; margin-bottom: 24px; align-items: center; justify-content: center; gap: 12px; }
        `}</style>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--purple-400), var(--pink-500))', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: 'var(--shadow-purple)' }}>
            🏠
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'white', lineHeight: 1.1 }}>Family Day</div>
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
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, var(--purple-400), var(--pink-500))', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            🏠
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gray-800)', lineHeight: 1 }}>Family Day</div>
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
          </form>

          <div style={{ marginTop: 32, borderTop: '1px solid var(--gray-100)', paddingTop: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' }}>
              Acceso rápido para demo:
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => fillDemo('admin')}>Demo Admin 👑</button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => fillDemo('child')}>Demo Hijo ⭐</button>
            </div>
          </div>
          
          <div style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', display: 'none' }} className="mobile-only-link">
            ¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--purple-500)', textDecoration: 'none', fontWeight: 700 }}>Regístrate</Link>
            <style>{`@media (max-width: 768px) { .mobile-only-link { display: block !important; } }`}</style>
          </div>

        </div>
      </div>
    </div>
  )
}
