import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MEMBER_COLORS } from '../lib/store.js'

const API_URL = (import.meta.env.VITE_SUPABASE_URL) + '/rest/v1'
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function CompleteProfile() {
  const navigate = useNavigate()
  const [pendingSession, setPendingSession] = useState(null)
  const [form, setForm] = useState({ name: '', age: '', role: 'admin', color: MEMBER_COLORS[0] })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('fd_pending_session')
    if (!raw) {
      // No hay sesión pendiente, volver al login
      navigate('/login', { replace: true })
      return
    }
    try {
      setPendingSession(JSON.parse(raw))
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido'
    if (!form.age || isNaN(form.age) || form.age < 1 || form.age > 99) e.age = 'Ingresa una edad válida'
    if (form.role === 'admin' && form.age < 18) e.age = 'Debes tener al menos 18 años para ser administrador'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate() || !pendingSession) return
    setLoading(true)

    try {
      // Crear el perfil en fd_members usando el token de la sesión pendiente
      const res = await fetch(`${API_URL}/fd_members`, {
        method: 'POST',
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${pendingSession.accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: pendingSession.userId,
          name: form.name.trim(),
          age: parseInt(form.age),
          role: form.role,
          color: form.color,
          email: pendingSession.email,
          status: 'active',
          total_points: 0,
          redeemed_points: 0,
          family_id: null // Sin familia aún (el admin creará una o se unirá a una)
        })
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt)
      }

      const arr = await res.json()
      const member = arr[0]

      if (!member) throw new Error('No se pudo crear el perfil')

      // Guardar sesión completa
      localStorage.setItem('fd_session', JSON.stringify({
        id: member.id,
        userId: member.id,
        role: member.role,
        name: member.name,
        email: member.email,
        color: member.color,
        family_id: member.family_id,
        accessToken: pendingSession.accessToken
      }))
      localStorage.removeItem('fd_pending_session')

      // Redirigir según rol
      const dest = member.role === 'child' ? '/my-tasks' : '/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      console.error('CompleteProfile error:', err)
      setErrors({ general: 'Error al guardar el perfil: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!pendingSession) return null

  return (
    <div className="anim-fade-in" style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="card anim-slide-up" style={{ width: '100%', maxWidth: 460, padding: '40px 36px' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', marginBottom: 6 }}>
            ¡Casi listo!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Completemos tu perfil para Home Day
          </p>
          <div style={{ display: 'inline-block', marginTop: 10, background: 'var(--purple-50)', color: 'var(--purple-700)', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
            {pendingSession.email}
          </div>
        </div>

        {errors.general && (
          <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', padding: '10px 14px', borderRadius: 8, fontSize: 13, borderLeft: '3px solid var(--red-400)', marginBottom: 20 }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Rol */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">¿Cuál es tu rol en la familia?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                onClick={() => setForm(f => ({ ...f, role: 'admin' }))}
                style={{ padding: 14, borderRadius: 12, border: form.role === 'admin' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)', background: form.role === 'admin' ? 'var(--purple-50)' : 'transparent', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>👑</div>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: form.role === 'admin' ? 'var(--purple-700)' : 'var(--text-primary)' }}>Padre / Madre</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Crea tareas y aprueba</div>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, role: 'child' }))}
                style={{ padding: 14, borderRadius: 12, border: form.role === 'child' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)', background: form.role === 'child' ? 'var(--purple-50)' : 'transparent', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>⭐</div>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: form.role === 'child' ? 'var(--purple-700)' : 'var(--text-primary)' }}>Hijo / a</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Completa tareas y gana</div>
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre completo</label>
            <input
              className="form-input"
              placeholder="Tu nombre"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={errors.name ? { borderColor: 'var(--red-500)' } : {}}
            />
            {errors.name && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.name}</div>}
          </div>

          {/* Edad */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Edad {form.role === 'admin' && <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(mín. 18 años)</span>}
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="Tu edad"
              min={form.role === 'admin' ? 18 : 3}
              max={99}
              value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              style={errors.age ? { borderColor: 'var(--red-500)' } : {}}
            />
            {errors.age && <div style={{ fontSize: 12, color: 'var(--red-500)', marginTop: 4 }}>{errors.age}</div>}
          </div>

          {/* Color */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Color de identificación</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, color: 'white', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
                {form.name ? form.name[0].toUpperCase() : '?'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MEMBER_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
                      border: `3px solid ${form.color === c ? 'white' : 'transparent'}`,
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                      transition: 'var(--transition)', transform: form.color === c ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Guardando...</> : 'Entrar a Home Day 🎉'}
          </button>
        </form>
      </div>
    </div>
  )
}
