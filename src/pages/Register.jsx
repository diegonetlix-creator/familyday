import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Auth, Invitations } from '../lib/auth.js'
import { MEMBER_COLORS, FamilyMember } from '../lib/store.js'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || searchParams.get('supaInvite')
  const isSupaInvite = searchParams.get('supaInvite') === 'true'
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass] = useState(false)
  
  const [inviteState, setInviteState] = useState({ loading: !!inviteToken, error: '', valid: false, data: null })
  
  const [form, setForm] = useState({
    name: '', age: '', color: MEMBER_COLORS[0], email: '', password: '', confirmPassword: '', role: 'admin'
  })
  
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (inviteToken) {
      if (Auth.isLoggedIn() && !isSupaInvite) {
        localStorage.removeItem('fd_session')
      }
    } else if (Auth.isLoggedIn()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, inviteToken, isSupaInvite])

  useEffect(() => {
    if (isSupaInvite) {
      // Flujo Supabase Auth Real
      const sessionData = Auth.getCurrentUser()
      if (sessionData && sessionData.status === 'invited') {
        setInviteState({ loading: false, error: '', valid: true, data: {
          memberName: sessionData.name, email: sessionData.email, role: sessionData.role, color: sessionData.color
        }})
      } else {
        // Fallback pidiendo datos otra vez o hubo error
        setInviteState({ loading: false, error: 'Hubo un error cargando tus datos de invitación.', valid: false, data: null })
      }
    } else if (inviteToken && inviteToken !== 'true') {
      // Flujo Antiguo Dummy (se puede eliminar después)
      const fetchOldInvite = async () => {
        const { valid, invitation, error } = await Invitations.validate(inviteToken)
        if (valid) {
          setInviteState({ loading: false, error: '', valid: true, data: invitation })
          setForm(f => ({ ...f, password: '', confirmPassword: '' }))
        } else {
          setInviteState({ loading: false, error, valid: false, data: null })
        }
      }
      fetchOldInvite()
    }
  }, [inviteToken, isSupaInvite])

  const validateStep1 = () => {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es requerido'
    if (form.role === 'admin' && (!form.age || isNaN(form.age) || form.age < 18 || form.age > 99)) {
      newErrors.age = 'Debes ser mayor de 18 años para crear un hogar'
    } else if (form.role === 'child' && form.age && (isNaN(form.age) || form.age < 3)) {
      newErrors.age = 'Edad inválida'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}
    if (!inviteToken && (!form.email || !/^\S+@\S+\.\S+$/.test(form.email))) newErrors.email = 'Formato de email inválido'
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

  const handleSubmitForm = async e => {
    e.preventDefault()
    if (!validateStep2()) return
    setLoading(true)
    
    const result = await Auth.register({ ...form, age: parseInt(form.age) || undefined })
    if (result.ok) {
      setSuccess(true)
      if (form.role === 'admin') {
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
      } else {
        setTimeout(() => navigate('/login', { replace: true }), 4000)
      }
    } else {
      setErrors({ email: result.error })
      setLoading(false)
    }
  }

  const handleSubmitInvite = async e => {
    e.preventDefault()
    if (!validateStep2()) return
    setLoading(true)
    
    let result;
    if (isSupaInvite) {
      result = await Invitations.acceptSecurePassword(form.password)
    } else {
      result = await Invitations.accept(inviteToken, form.password)
    }

    if (result.ok) {
      setSuccess(true)
      setTimeout(() => navigate(result.user?.role === 'child' ? '/my-tasks' : '/dashboard', { replace: true }), 1500)
    } else {
      setErrors({ password: result.error })
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="anim-pop" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: 24 }}>
            {form.role === 'child' ? '¡Tu perfil está creado!' : (inviteToken ? '¡Bienvenido/a!' : '¡Registro exitoso!')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 300 }}>
            {form.role === 'child' ? 'Pídele a un administrador que te agregue a la familia usando tu correo.' : 'Preparando tu hogar...'}
          </p>
        </div>
      </div>
    )
  }

  if (inviteToken && !inviteState.valid) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card anim-pop" style={{ width: '100%', maxWidth: 400, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 12 }}>Invitación no válida</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{inviteState.error}</p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>Ir al inicio</button>
        </div>
      </div>
    )
  }

  if (inviteToken && inviteState.valid) {
    const inv = inviteState.data
    return (
      <div className="anim-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 20px' }}>
        <div className="card anim-slide-up" style={{ width: '100%', maxWidth: 460, padding: '0', overflow: 'hidden' }}>
          
          <div style={{ background: 'var(--purple-50)', padding: '24px 32px', borderBottom: '1px solid var(--purple-200)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>¡Te invitaron a Family Day!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Crea tu contraseña para empezar a ganar puntos</p>
          </div>

          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: inv.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold', color: 'white' }}>
                {inv.memberName?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <input readOnly value={inv.memberName} className="form-input" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', marginBottom: 8, height: 36 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={inv.email} className="form-input" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', flex: 1, height: 32, fontSize: 12 }} />
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--purple-100)', color: 'var(--purple-700)', padding: '0 12px', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 'bold', flexShrink: 0 }}>
                    {inv.role === 'admin' ? '👑 Admin' : '⭐ Hijo/a'}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitInvite}>
              <div className="form-group">
                <label className="form-label">Crea tu contraseña</label>
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
                      <span>Fuerza de la contraseña</span>
                      <span>{strength.text}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ width: `${strength.percent}%`, height: '100%', background: strength.color, transition: 'var(--transition)' }} />
                    </div>
                  </div>
                )}
                {errors.password && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.password}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 32 }}>
                <label className="form-label">Confirma tu contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type={showPass ? 'text' : 'password'} className="form-input" placeholder="Repite tu contraseña" 
                    style={{ paddingLeft: 42, paddingRight: 40, ...(errors.confirmPassword ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                    value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                </div>
                {errors.confirmPassword && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.confirmPassword}</div>}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Configurando...</> : 'Unirme a Family Day 🎉'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // MODO ADMIN REGULAR
  return (
    <div className="anim-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 20px' }}>
      <div className="card anim-slide-up" style={{ width: '100%', maxWidth: 460, padding: '36px 32px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--purple-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-primary)' }}>Perfil</span>
          </div>
          <div style={{ width: 80, height: 2, background: step === 2 ? 'var(--green-500)' : 'var(--gray-200)', marginBottom: 20 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: step === 2 ? 'var(--purple-500)' : 'var(--gray-200)', color: step === 2 ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {step === 2 ? '2' : '2'}
            </div>
            <span style={{ fontSize: 12, fontWeight: step === 2 ? 'bold' : 'normal', color: step === 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Acceso</span>
          </div>
        </div>

        {step === 1 ? (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', marginBottom: 4, textAlign: 'center' }}>Crea tu cuenta 🏠</h1>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>Configura tu perfil</p>
            
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">¿Qué rol tendrás en la familia?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div onClick={() => setForm({ ...form, role: 'admin' })} style={{ padding: 12, borderRadius: 12, border: form.role === 'admin' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)', background: form.role === 'admin' ? 'var(--purple-50)' : 'transparent', cursor: 'pointer' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>👑</div>
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>Padre / Madre</div>
                </div>
                <div onClick={() => setForm({ ...form, role: 'child' })} style={{ padding: 12, borderRadius: 12, border: form.role === 'child' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)', background: form.role === 'child' ? 'var(--purple-50)' : 'transparent', cursor: 'pointer' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>⭐</div>
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>Hijo / a</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input 
                type="text" className="form-input" placeholder="Tu nombre" 
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                onBlur={validateStep1}
                style={{ ...(errors.name ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
              />
              {errors.name && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Edad {form.role === 'admin' ? <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Mínimo 18 años para crear un hogar)</span> : ''}</label>
              <input 
                type="number" className="form-input" placeholder="Ej. 35" min={form.role==='admin' ? "18" : "3"} max="99"
                value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                onBlur={validateStep1}
                style={{ ...(errors.age ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
              />
              {errors.age && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.age}</div>}
            </div>

            <div className="form-group" style={{ marginBottom: 32 }}>
              <label className="form-label">Elige tu color y avatar</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: form.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
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
            
            <div style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
              ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--purple-500)', textDecoration: 'none', fontWeight: 700 }}>Inicia sesión</Link>
            </div>
          </div>
        ) : (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', marginBottom: 4, textAlign: 'center' }}>Crea tu acceso seguro 🔐</h1>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>{form.role === 'admin' ? 'Solo tú podrás administrar las tareas' : 'Podrás iniciar sesión con tu correo'}</p>
            
            <form onSubmit={handleSubmitForm}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="email" className="form-input" placeholder="tu@email.com" 
                    style={{ paddingLeft: 42, ...(errors.email ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    onBlur={validateStep2}
                  />
                </div>
                {errors.email && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type={showPass ? 'text' : 'password'} className="form-input" placeholder="Mínimo 6 caracteres" 
                    style={{ paddingLeft: 42, paddingRight: 40, ...(errors.password ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    onBlur={validateStep2}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gray-400)' }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: strength.color, fontWeight: 'bold', marginBottom: 4 }}>
                      <span>Fuerza de la contraseña</span>
                      <span>{strength.text}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ width: `${strength.percent}%`, height: '100%', background: strength.color, transition: 'var(--transition)' }} />
                    </div>
                  </div>
                )}
                {errors.password && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.password}</div>}
              </div>

              <div className="form-group" style={{ marginBottom: 32 }}>
                <label className="form-label">Confirmar contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type={showPass ? 'text' : 'password'} className="form-input" placeholder="Repite tu contraseña" 
                    style={{ paddingLeft: 42, paddingRight: 40, ...(errors.confirmPassword ? { borderColor: 'var(--red-500)', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}) }}
                    value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    onBlur={validateStep2}
                  />
                </div>
                {errors.confirmPassword && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.confirmPassword}</div>}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  ← Volver
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                  {loading ? (
                    <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creando...</>
                  ) : (
                    'Crear cuenta 🚀'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
