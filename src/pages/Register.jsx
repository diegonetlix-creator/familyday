import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Auth } from '../lib/auth.js'
import { MEMBER_COLORS } from '../lib/store.js'

export default function Register() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    name: '', age: '', color: MEMBER_COLORS[0], email: '', password: '', confirmPassword: '', role: 'admin'
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (Auth.isLoggedIn()) {
      const u = Auth.getCurrentUser()
      const dest = u?.role === 'superadmin' ? '/superadmin' : u?.role === 'child' ? '/my-tasks' : '/dashboard'
      navigate(dest, { replace: true })
    }
  }, [navigate])

  const validateStep1 = () => {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es requerido'
    if (form.role === 'admin' && (!form.age || isNaN(form.age) || Number(form.age) < 18 || Number(form.age) > 99)) {
      newErrors.age = 'Debes ser mayor de 18 años para crear un hogar'
    } else if (form.role === 'child' && form.age && (isNaN(form.age) || Number(form.age) < 3)) {
      newErrors.age = 'Edad inválida'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = 'Formato de email inválido'
    if (form.password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2)
      setErrors({})
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validateStep2()) return
    setLoading(true)
    setErrors({})

    const result = await Auth.register({ ...form, age: parseInt(form.age) || undefined })

    if (result.ok) {
      setSuccess(true)
      setLoading(false)
    } else {
      setErrors({ email: result.error })
      setLoading(false)
    }
  }

  const getPassStrength = (pass) => {
    if (pass.length < 6) return { text: 'Débil', color: 'var(--red-500)', percent: 33 }
    if (pass.length < 9 && !/\d/.test(pass)) return { text: 'Regular', color: 'var(--amber-500)', percent: 55 }
    if (pass.length > 10 && /\d/.test(pass) && /[!@#$%^&*(),.?":{}|<>]/.test(pass)) return { text: 'Muy fuerte', color: 'var(--green-600)', percent: 100 }
    return { text: 'Fuerte', color: 'var(--green-500)', percent: 80 }
  }

  const strength = getPassStrength(form.password)

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="anim-pop" style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>

          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--purple-400), var(--pink-500))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, margin: '0 auto 24px', boxShadow: 'var(--shadow-purple)'
          }}>✉️</div>

          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: 26, marginBottom: 12 }}>
            ¡Verifica tu email!
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
            Te enviamos un correo de confirmación a:
          </p>

          <div style={{
            background: 'var(--purple-50)', border: '1.5px solid var(--purple-200)',
            borderRadius: 10, padding: '10px 20px', display: 'inline-block',
            fontWeight: 800, color: 'var(--purple-700)', fontSize: 15, marginBottom: 24
          }}>
            {form.email}
          </div>

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px', marginBottom: 24, textAlign: 'left'
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              📬 <strong>Revisa tu bandeja de entrada</strong> (y la carpeta de <strong>spam</strong> por si acaso).
              Haz clic en el enlace del correo para activar tu cuenta y luego inicia sesión normalmente.
            </p>
          </div>

          <Link
            to="/login"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '12px 28px' }}
          >
            Ir a iniciar sesión
          </Link>

          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
            ¿No recibiste el correo? Espera unos minutos o revisa spam.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="anim-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Left decorative column */}
      <div className="login-left-col anim-fade-in" style={{
        width: '40%', background: 'var(--bg-sidebar)',
        backgroundImage: 'radial-gradient(rgba(167,139,250,.15) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px', gap: 32
      }}>
        <style>{`
          @media (max-width: 768px) {
            .login-left-col { display: none !important; }
            .login-right-col { padding: 24px 16px !important; }
          }
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img src="/logo home-day.png" alt="Home Day Logo" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'white', lineHeight: 1.1 }}>Home Day</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Tareas con Premios</div>
          </div>
        </div>

        <div style={{ width: 32, height: 2, background: 'var(--purple-500)', opacity: 0.5, borderRadius: 2 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 260 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--purple-300)', fontWeight: 700 }}>👑 Padre/Madre</span>{' '}
            — Crea un hogar, asigna tareas y aprueba logros de tus hijos.
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--purple-300)', fontWeight: 700 }}>⭐ Hijo/a</span>{' '}
            — Completa tareas y gana puntos para canjear premios increíbles.
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <Link to="/login" style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.05)', color: 'white',
            padding: '8px 16px', borderRadius: 99, fontSize: 12, textDecoration: 'none',
            transition: 'var(--transition)', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            ¿Ya tienes cuenta? <span style={{ color: 'var(--purple-400)', fontWeight: 800 }}>Inicia sesión →</span>
          </Link>
        </div>
      </div>

      {/* Right form column */}
      <div className="login-right-col" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, flexDirection: 'column', overflowY: 'auto'
      }}>
        <div className="card anim-slide-up" style={{ width: '100%', maxWidth: 460, padding: '36px 32px' }}>

          {/* Step indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            {[{ n: 1, label: 'Perfil' }, { n: 2, label: 'Acceso' }].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: step >= s.n ? 'var(--purple-500)' : 'var(--gray-200)',
                    color: step >= s.n ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: 14, transition: 'all .3s'
                  }}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: step === s.n ? 'bold' : 'normal', color: step === s.n ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {s.label}
                  </span>
                </div>
                {i === 0 && (
                  <div style={{ width: 80, height: 2, background: step === 2 ? 'var(--purple-500)' : 'var(--gray-200)', margin: '0 8px', marginBottom: 20, transition: 'background .3s' }} />
                )}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', marginBottom: 4, textAlign: 'center' }}>
                Crea tu cuenta 🏠
              </h1>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 28 }}>
                Configura tu perfil familiar
              </p>

              {/* Role selection */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">¿Cuál es tu rol en la familia?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    onClick={() => setForm({ ...form, role: 'admin' })}
                    style={{
                      padding: 14, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      border: form.role === 'admin' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)',
                      background: form.role === 'admin' ? 'var(--purple-50)' : 'transparent',
                      transition: 'all .2s'
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>👑</div>
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: form.role === 'admin' ? 'var(--purple-700)' : 'var(--text-primary)' }}>
                      Padre / Madre
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Administra el hogar</div>
                  </div>
                  <div
                    onClick={() => setForm({ ...form, role: 'child' })}
                    style={{
                      padding: 14, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      border: form.role === 'child' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)',
                      background: form.role === 'child' ? 'var(--purple-50)' : 'transparent',
                      transition: 'all .2s'
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>⭐</div>
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: form.role === 'child' ? 'var(--purple-700)' : 'var(--text-primary)' }}>
                      Hijo / a
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Completa tareas y gana</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input
                  type="text" className="form-input" placeholder="Tu nombre"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  style={errors.name ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}}
                />
                {errors.name && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Edad{' '}
                  {form.role === 'admin' && <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(mín. 18 años)</span>}
                </label>
                <input
                  type="number" className="form-input" placeholder="Ej. 35"
                  min={form.role === 'admin' ? '18' : '3'} max="99"
                  value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                  style={errors.age ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}}
                />
                {errors.age && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.age}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 32 }}>
                <label className="form-label">Elige tu color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', background: form.color,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 'bold', flexShrink: 0, boxShadow: 'var(--shadow-sm)'
                  }}>
                    {form.name ? form.name[0].toUpperCase() : '?'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {MEMBER_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                          border: `3px solid ${form.color === c ? 'white' : 'transparent'}`,
                          boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                          transition: 'var(--transition)', transform: form.color === c ? 'scale(1.1)' : 'scale(1)', padding: 0
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleNext}>
                Siguiente →
              </button>

              <div style={{ marginTop: 20, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
                ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--purple-500)', textDecoration: 'none', fontWeight: 700 }}>Inicia sesión</Link>
              </div>
            </div>
          ) : (
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', marginBottom: 4, textAlign: 'center' }}>
                Crea tu acceso 🔐
              </h1>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 28 }}>
                {form.role === 'admin' ? 'Solo tú podrás administrar las tareas' : 'Con esto podrás iniciar sesión'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {errors.email && (
                  <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', padding: '10px 14px', borderRadius: 8, fontSize: 13, borderLeft: '3px solid var(--red-400)' }}>
                    {errors.email}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email" className="form-input" placeholder="tu@email.com"
                      style={{ paddingLeft: 42, ...(errors.email ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPass ? 'text' : 'password'} className="form-input" placeholder="Mínimo 6 caracteres"
                      style={{ paddingLeft: 42, paddingRight: 40, ...(errors.password ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                      value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gray-400)' }}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: strength.color, fontWeight: 'bold', marginBottom: 4 }}>
                        <span>Fuerza</span><span>{strength.text}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ width: `${strength.percent}%`, height: '100%', background: strength.color, transition: 'var(--transition)' }} />
                      </div>
                    </div>
                  )}
                  {errors.password && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.password}</div>}
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Confirmar contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPass ? 'text' : 'password'} className="form-input" placeholder="Repite tu contraseña"
                      style={{ paddingLeft: 42, ...(errors.confirmPassword ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                      value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                  </div>
                  {errors.confirmPassword && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.confirmPassword}</div>}
                </div>

                {/* Google OAuth alternative */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>o regístrate con</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={() => Auth.loginWithGoogle()}
                  style={{ width: '100%', justifyContent: 'center', background: 'white', color: 'var(--gray-700)', border: '1px solid var(--gray-300)', gap: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.35A9 9 0 0 0 9 18z" fill="#34A853"/><path d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.94H.95a9 9 0 0 0 0 8.12l3.01-2.35z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.47A9 9 0 0 0 0 9l3.01 2.35c.71-2.13 2.7-3.71 5.04-3.71z" fill="#EA4335"/></svg>
                  Continuar con Google
                </button>

                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setStep(1); setErrors({}) }}>
                    ← Volver
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                    {loading ? (
                      <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creando cuenta...</>
                    ) : (
                      `Crear cuenta ${form.role === 'admin' ? '👑' : '⭐'}`
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
