import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Crown, X, Clock } from 'lucide-react'
import { FamilyMember, TaskCompletion, getLevelInfo, MEMBER_COLORS } from '../lib/store.js'
import { Invitations } from '../lib/auth.js'
import InvitationModal from '../components/InvitationModal.jsx'

function MemberModal({ member, onSave, onClose, existingEmails }) {
  const [form, setForm] = useState({
    name:  member?.name  || '',
    age:   member?.age   || '',
    role:  member?.role  || 'child',
    color: member?.color || MEMBER_COLORS[0],
    email: member?.email || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Formato de email inválido')
      return
    }
    
    if (!member && existingEmails.includes(form.email)) {
      setError('Este email ya está registrado en tu familia')
      return
    }

    setSaving(true)
    setError('')
    await onSave({ ...form, age: form.age ? parseInt(form.age) : undefined })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">{member ? '✏️ Editar miembro' : '👥 Agregar miembro'}</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.15)', overflow: 'hidden' }}>
                {member?.avatar_url ? (
                  <img src={member.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (form.name?.[0] || '?').toUpperCase()
                )}
              </div>
            </div>

            {error && <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', padding: '8px 12px', borderRadius: 8, fontSize: 13, borderLeft: '3px solid var(--red-400)' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              <div>
                <label className="form-label">Nombre *</label>
                <input className="form-input" placeholder="Nombre" required value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Email (con el que se registró) *</label>
                <input className="form-input" type="email" placeholder="correo@ejemplo.com" required value={form.email} onChange={e => set('email', e.target.value)} readOnly={!!member} style={member ? { background: 'var(--gray-50)', color: 'var(--gray-500)' } : undefined} />
                {!member && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Se enviará un correo electrónico con un enlace para que el nuevo miembro configure su cuenta.</div>}
              </div>
              <div>
                <label className="form-label">Edad</label>
                <input className="form-input" type="number" min="1" max="99" placeholder="Edad" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: 12 }}>Rol *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div onClick={() => !member && set('role', 'admin')} style={{ padding: 12, borderRadius: 12, border: form.role === 'admin' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)', background: form.role === 'admin' ? 'var(--purple-50)' : 'transparent', cursor: member ? 'default' : 'pointer', opacity: member && form.role !== 'admin' ? 0.5 : 1 }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>👑</div>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: form.role === 'admin' ? 'var(--purple-700)' : 'var(--text-primary)' }}>Padre / Madre</div>
                  <div style={{ fontSize: 11, color: form.role === 'admin' ? 'var(--purple-600)' : 'var(--text-muted)' }}>Crea tareas y aprueba</div>
                </div>
                <div onClick={() => !member && set('role', 'child')} style={{ padding: 12, borderRadius: 12, border: form.role === 'child' ? '2px solid var(--purple-500)' : '1.5px solid var(--border)', background: form.role === 'child' ? 'var(--purple-50)' : 'transparent', cursor: member ? 'default' : 'pointer', opacity: member && form.role !== 'child' ? 0.5 : 1 }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>⭐</div>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: form.role === 'child' ? 'var(--purple-700)' : 'var(--text-primary)' }}>Hijo / a</div>
                  <div style={{ fontSize: 11, color: form.role === 'child' ? 'var(--purple-600)' : 'var(--text-muted)' }}>Completa tareas y gana</div>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Color de identificación</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {MEMBER_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    className={`color-swatch${form.color === c ? ' selected' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Guardando...' : member ? '💾 Guardar' : '➕ Vincular Miembro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Members() {
  const [members, setMembers] = useState([])
  const [completions, setCompletions] = useState([])
  const [invitationsList, setInvitationsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  const [inviteModalData, setInviteModalData] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [m, invs] = await Promise.all([FamilyMember.list(), Invitations.getAll()])
      setMembers(m)
      setInvitationsList(invs)
      TaskCompletion.list('-createdAt', 50).then(c => setCompletions(c)).catch(() => {})
    } catch (err) {
      console.error('Members load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async data => {
    if (editing) {
      await FamilyMember.update(editing.id, data)
      setShowModal(false); setEditing(null); loadData()
    } else {
      setLoading(true)
      try {
        const result = await Invitations.create(data)
        setShowModal(false)
        if (result.isAlreadyLinked) {
          // Ya existía y está activo → solo mostrar confirmación breve
          setToast({ text: `✅ ${result.member.name} ya es miembro activo de la familia.`, type: 'success' })
          setTimeout(() => setToast(null), 4000)
          loadData()
        } else {
          setInviteModalData({ invitation: result, member: result.member })
        }
      } catch (err) {
        alert('Error al enviar invitación: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este miembro? Se perderán sus datos.')) return
    await FamilyMember.delete(id); loadData()
  }

  const handleResend = async (member) => {
    try {
      await Invitations.resend(member.email)
      setInviteModalData({ invitation: { isReal: true }, member })
    } catch (e) {
      alert("Error al reenviar la invitación: " + e.message)
    }
  }

  const closeInvitationModal = () => {
    setInviteModalData(null)
    loadData()
  }

  const getStats = memberId => {
    const mc = completions.filter(c => c.member_id === memberId)
    const approved = mc.filter(c => c.status === 'aprobada')
    const avgRating = approved.filter(c => c.performance_rating > 0).length > 0
      ? (approved.reduce((s, c) => s + (c.performance_rating || 0), 0) / approved.filter(c => c.performance_rating > 0).length).toFixed(1) : '—'
    return { total: mc.length, approved: approved.length, avgRating }
  }

  const admins = members.filter(m => m.role === 'admin')
  const children = members.filter(m => m.role === 'child')
  const existingEmails = members.map(m => m.email).filter(Boolean)

  return (
    <div className="anim-fade-in">
      {toast && (
        <div className="anim-slide-up" style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          padding: '12px 20px', borderRadius: 8, color: 'white',
          background: toast.type === 'error' ? 'var(--red-500)' : 'var(--green-500)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14, fontWeight: 600
        }}>{toast.text}</div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Familia</h1>
          <p className="page-subtitle">{members.length} integrantes · Gestiona perfiles y roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> Agregar miembro
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <>
          {admins.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                👑 Administradores
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {admins.map(m => (
                  <MemberCard key={m.id} member={m} stats={getStats(m.id)} onEdit={() => { setEditing(m); setShowModal(true) }} onDelete={() => handleDelete(m.id)} onResend={() => handleResend(m)} />
                ))}
              </div>
            </div>
          )}
          {children.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                ⭐ Participantes
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {children.map(m => (
                  <MemberCard key={m.id} member={m} stats={getStats(m.id)} onEdit={() => { setEditing(m); setShowModal(true) }} onDelete={() => handleDelete(m.id)} onResend={() => handleResend(m)} />
                ))}
              </div>
            </div>
          )}
          {members.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <span className="empty-title">Sin miembros aún</span>
              <span className="empty-desc">Agrega a los integrantes de tu familia</span>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditing(null); setShowModal(true) }}>
                <Plus size={14} /> Agregar primero
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <MemberModal member={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null) }} existingEmails={existingEmails} />
      )}

      {inviteModalData && (
        <InvitationModal 
          invitation={inviteModalData.invitation} 
          member={inviteModalData.member} 
          onClose={closeInvitationModal} 
        />
      )}
    </div>
  )
}

function MemberCard({ member, stats, onEdit, onDelete, onResend }) {
  const lvl = getLevelInfo(member.total_points || 0)
  const available = (member.total_points || 0) - (member.redeemed_points || 0)
  
  return (
    <div className="card card-p" style={{ transition: 'box-shadow .2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: member.color || 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22, color: '#fff', overflow: 'hidden' }}>
            {member.avatar_url ? (
              <img src={member.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              member.name?.[0]?.toUpperCase()
            )}
          </div>
          {member.role === 'admin' && (
            <Crown size={14} color="#f59e0b" style={{ position: 'absolute', bottom: -2, right: -2, background: '#fff', borderRadius: '50%', padding: 2 }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 2 }}>{member.name}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {member.age && <span className="chip chip-gray">{member.age} años</span>}
            <span className="chip chip-purple">Nv {lvl.level} · {lvl.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={onEdit}><Edit2 size={13} /></button>
          <button className="btn-icon btn-danger" onClick={onDelete}><Trash2 size={13} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {member.status === 'invited' ? (
          <div className="chip chip-amber" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> ⏳ Invitación pendiente
          </div>
        ) : (
          <div className="chip chip-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            ✓ Activo
          </div>
        )}
      </div>

      {member.role === 'child' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Progreso nivel {lvl.level}</span><span>{lvl.progress}%</span>
            </div>
            <div className="progress-wrap" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${lvl.progress}%`, background: member.color || 'var(--purple-500)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: member.status === 'invited' ? 14 : 0 }}>
            {[
              { label: 'Pts totales', value: member.total_points || 0, color: 'var(--purple-600)' },
              { label: 'Disponibles', value: available, color: 'var(--green-600)' },
              { label: 'Aprobadas', value: stats.approved, color: 'var(--blue-500)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--gray-50)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {member.status === 'invited' && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onResend} style={{ width: '100%', justifyContent: 'center' }}>
            🔗 Reenviar link
          </button>
        </div>
      )}

    </div>
  )
}
