import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Crown, X, Clock, Search, UserCheck, UserX } from 'lucide-react'
import { FamilyMember, TaskCompletion, getLevelInfo, MEMBER_COLORS } from '../lib/store.js'
import { Auth } from '../lib/auth.js'

// ─── Modal: Buscar y vincular miembro ────────────────────────────────────────
function LinkMemberModal({ onClose, onSuccess, currentFamilyId, existingMemberEmails }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('child')
  const [searching, setSearching] = useState(false)
  const [foundMember, setFoundMember] = useState(null)   // member found in DB
  const [notFound, setNotFound] = useState(false)         // searched but not found
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState('')
  const [searchDone, setSearchDone] = useState(false)

  const handleSearch = async e => {
    e.preventDefault()
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Ingresa un email válido')
      return
    }

    const cleanEmail = email.trim().toLowerCase()

    if (existingMemberEmails.includes(cleanEmail)) {
      setError('Este miembro ya está en tu familia')
      return
    }

    setSearching(true)
    setError('')
    setFoundMember(null)
    setNotFound(false)
    setSearchDone(false)

    try {
      const member = await Auth.searchMemberByEmail(cleanEmail)
      setSearchDone(true)
      if (member) {
        setFoundMember(member)
      } else {
        setNotFound(true)
      }
    } catch (err) {
      setError('Error al buscar: ' + err.message)
    } finally {
      setSearching(false)
    }
  }

  const handleLink = async () => {
    if (!foundMember) return
    setLinking(true)
    setError('')
    try {
      const result = await Auth.linkMemberToFamily(foundMember.email, currentFamilyId, role)

      if (result.ok && result.linked) {
        // Direct link — member had no family
        onSuccess(result.member, false)
      } else if (result.ok && result.pending) {
        // Invite sent — member already has a family and must accept
        onSuccess(null, true, result.message)
      } else if (!result.ok) {
        setError(result.error || 'Error desconocido al invitar.')
      } else {
        setError(result.error || result.message || 'Error inesperado del servidor.')
      }
    } catch (err) {
      setError('Error al vincular: ' + err.message)
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">👥 Vincular miembro a la familia</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: 'var(--purple-50)', border: '1px solid var(--purple-200)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--purple-700)', lineHeight: 1.6 }}>
            💡 El miembro debe estar <strong>registrado previamente</strong> en Family Day. Ingresa su email para buscarlo y vincularlo a tu familia.
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="var(--gray-400)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="form-input"
                type="email"
                placeholder="email@ejemplo.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setFoundMember(null); setNotFound(false); setSearchDone(false); setError('') }}
                style={{ paddingLeft: 34 }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={searching} style={{ flexShrink: 0 }}>
              {searching ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Buscar'}
            </button>
          </form>

          {error && (
            <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', padding: '10px 14px', borderRadius: 8, fontSize: 13, borderLeft: '3px solid var(--red-400)' }}>
              {error}
            </div>
          )}

          {/* Member found */}
          {foundMember && (
            <div style={{ border: '1.5px solid var(--green-300)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: 'var(--green-50)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--green-200)' }}>
                <UserCheck size={16} color="var(--green-600)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-700)' }}>¡Encontrado!</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: foundMember.color || 'var(--purple-500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 20, color: '#fff', flexShrink: 0
                }}>
                  {foundMember.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{foundMember.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{foundMember.email}</div>
                  {foundMember.age && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{foundMember.age} años</div>}
                </div>
                <div style={{
                  background: foundMember.role === 'admin' ? 'var(--purple-100)' : 'var(--amber-100)',
                  color: foundMember.role === 'admin' ? 'var(--purple-700)' : 'var(--amber-700)',
                  padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, flexShrink: 0
                }}>
                  {foundMember.role === 'admin' ? '👑 Admin' : '⭐ Hijo/a'}
                </div>
              </div>

              {/* Role override */}
              <div style={{ padding: '0 16px 16px' }}>
                <label className="form-label" style={{ marginBottom: 8 }}>Rol en esta familia</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ v: 'admin', icon: '👑', label: 'Padre / Madre' }, { v: 'child', icon: '⭐', label: 'Hijo / a' }].map(opt => (
                    <div
                      key={opt.v}
                      onClick={() => setRole(opt.v)}
                      style={{
                        padding: 10, borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                        border: role === opt.v ? '2px solid var(--purple-500)' : '1.5px solid var(--border)',
                        background: role === opt.v ? 'var(--purple-50)' : 'transparent', transition: 'all .2s'
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{opt.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 'bold', color: role === opt.v ? 'var(--purple-700)' : 'var(--text-primary)' }}>{opt.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Member NOT found */}
          {notFound && (
            <div style={{ border: '1.5px solid var(--amber-300)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: 'var(--amber-50)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--amber-200)' }}>
                <UserX size={16} color="var(--amber-600)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-700)' }}>No está registrado aún</span>
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                  No encontramos ninguna cuenta con el email <strong style={{ color: 'var(--text-primary)' }}>{email.trim()}</strong>.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Pídele a esa persona que se registre primero en Family Day en{' '}
                  <strong style={{ color: 'var(--purple-600)' }}>/register</strong>. Una vez registrado,
                  vuelve aquí y vincúlalo a tu familia.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          {foundMember && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLink}
              disabled={linking}
            >
              {linking ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Vinculando...</> : '🔗 Vincular a mi familia'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Editar miembro existente ─────────────────────────────────────────
function EditMemberModal({ member, onSave, onClose }) {
  const [form, setForm] = useState({
    name: member?.name || '',
    age: member?.age || '',
    color: member?.color || MEMBER_COLORS[0],
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, age: form.age ? parseInt(form.age) : undefined })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">✏️ Editar miembro</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.15)' }}>
                {form.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>

            <div>
              <label className="form-label">Email</label>
              <input className="form-input" value={member?.email || ''} readOnly style={{ background: 'var(--gray-50)', color: 'var(--gray-500)' }} />
            </div>

            <div>
              <label className="form-label">Nombre *</label>
              <input className="form-input" placeholder="Nombre" required value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div>
              <label className="form-label">Edad</label>
              <input className="form-input" type="number" min="1" max="99" placeholder="Edad" value={form.age} onChange={e => set('age', e.target.value)} />
            </div>

            <div>
              <label className="form-label">Color</label>
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
              {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Members Page ────────────────────────────────────────────────────────
export default function Members() {
  const [members, setMembers] = useState([])
  const [completions, setCompletions] = useState([])
  const [sentInvites, setSentInvites] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [responding, setResponding] = useState(null)
  const [toast, setToast] = useState(null)

  const currentUser = Auth.getCurrentUser()
  const currentFamilyId = currentUser?.family_id
  const hasNoFamily = !currentFamilyId && currentUser?.role === 'admin'

  useEffect(() => { loadData() }, [])

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Refresh current session profile to ensure we have the correct family_id
      const freshUser = await Auth.refreshSession()
      if (freshUser && !freshUser.family_id) {
         console.warn("Session refreshed but still no family_id. This admin might not be assigned to a family.")
      }
      
      // 2. Load members & sent invites & pending invites for user
      const [m, invites, pending] = await Promise.all([FamilyMember.list(), Auth.getSentInvites(), Auth.getPendingInvites()])
      
      // 3. Debug logging if needed
      console.log(`Members loaded: ${m.length}`, m)
      
      setMembers(m)
      setSentInvites(invites || [])
      setPendingInvites(pending || [])
      
      // 4. Load recent completions
      TaskCompletion.list('-createdAt', 50).then(c => setCompletions(c)).catch(() => {})
    } catch (err) {
      console.error('Members load error:', err)
      showToast('Error al cargar datos. Recarga la página.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkSuccess = (member, isPending, pendingMsg) => {
    setShowLinkModal(false)
    if (isPending) {
      showToast(`📨 ${pendingMsg || 'Invitación enviada. El miembro debe aceptarla.'}`, 'info')
      setTimeout(loadData, 500)
    } else {
      showToast(`✅ ${member?.name || 'El miembro'} se vinculó exitosamente a tu familia`)
      setTimeout(loadData, 500)
    }
  }

  const handleRespond = async (id, accept) => {
    setResponding(id)
    const result = await Auth.respondToInvite(id, accept)
    if (result.ok) {
      if (accept) {
        showToast('✅ Invitación aceptada. Sincronizando...')
        await Auth.refreshSession()
        window.location.reload()
      } else {
        showToast('❌ Invitación rechazada.')
        setPendingInvites(prev => prev.filter(i => i.id !== id))
      }
    } else {
      showToast('Error: ' + result.error, 'error')
    }
    setResponding(null)
  }

  const handleEditSave = async data => {
    await FamilyMember.update(editing.id, data)
    setEditing(null)
    showToast('✅ Miembro actualizado')
    loadData()
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este miembro? Se perderán sus datos.')) return
    await FamilyMember.delete(id)
    loadData()
  }

  const getStats = memberId => {
    const mc = completions.filter(c => c.member_id === memberId)
    const approved = mc.filter(c => c.status === 'aprobada')
    return { total: mc.length, approved: approved.length }
  }

  const admins = members.filter(m => m.role === 'admin')
  const children = members.filter(m => m.role === 'child')
  const existingEmails = members.map(m => m.email?.toLowerCase()).filter(Boolean)

  return (
    <div className="anim-fade-in">
      {toast && (
        <div className="anim-slide-up" style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          padding: '12px 20px', borderRadius: 8, color: 'white',
          background: toast.type === 'error' ? 'var(--red-500)' : toast.type === 'info' ? 'var(--blue-500)' : 'var(--green-500)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14, fontWeight: 600
        }}>{toast.text}</div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Familia</h1>
          <p className="page-subtitle">{members.length} integrantes · Gestiona perfiles y roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowLinkModal(true)}>
          <Plus size={16} /> Vincular miembro
        </button>
      </div>

      {hasNoFamily && (
        <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 12, padding: 20, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 24 }}>🤔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: 'var(--amber-800)', fontSize: 15, marginBottom: 4 }}>Tu perfil aún no tiene una familia asignada</div>
            <p style={{ color: 'var(--amber-700)', fontSize: 13, lineHeight: 1.5 }}>Esto puede pasar si el registro fue muy rápido. Intenta recargar la página para sincronizar tu cuenta.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>Sincronizar ahora</button>
        </div>
      )}

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <>
          {/* Pending Invitations Received */}
          {pendingInvites.length > 0 && (
            <div style={{ marginBottom: 28, padding: 18, background: 'var(--amber-50)', border: '2px solid var(--amber-200)', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>📬</span>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--amber-900)', fontSize: 16 }}>Tienes invitaciones pendientes</div>
                  <div style={{ fontSize: 13, color: 'var(--amber-700)' }}>Alguien te ha invitado a unirte a su familia. Al aceptar, verás a sus miembros.</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr)', gap: 10 }}>
                {pendingInvites.map(inv => (
                  <div key={inv.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
                    padding: '14px 18px', background: '#fff', border: '1px solid var(--amber-300)', borderRadius: 12
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: 14 }}>
                        {inv.payload?.requester_name || inv.requester_name || 'Alguien'} te invita
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {inv.payload?.requester_email || inv.requester_email || 'Oculto'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" disabled={responding === inv.id} onClick={() => handleRespond(inv.id, true)}>
                        {responding === inv.id ? '⏳...' : '✅ Aceptar'}
                      </button>
                      <button className="btn btn-secondary btn-sm" disabled={responding === inv.id} onClick={() => handleRespond(inv.id, false)}>
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sentInvites.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue-600)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                📨 Invitaciones Enviadas (Pendientes)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr)', gap: 10 }}>
                {sentInvites.map(inv => (
                  <div key={inv.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 12
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--blue-900)', fontSize: 14 }}>{inv.member_email}</div>
                      <div style={{ fontSize: 12, color: 'var(--blue-700)', marginTop: 2 }}>Esperando respuesta...</div>
                    </div>
                    <Clock size={16} color="var(--blue-500)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {admins.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
                👑 Administradores
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {admins.map(m => (
                  <MemberCard
                    key={m.id} member={m} stats={getStats(m.id)}
                    onEdit={() => setEditing(m)} onDelete={() => handleDelete(m.id)}
                  />
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
                  <MemberCard
                    key={m.id} member={m} stats={getStats(m.id)}
                    onEdit={() => setEditing(m)} onDelete={() => handleDelete(m.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {members.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <span className="empty-title">Sin miembros aún</span>
              <span className="empty-desc">Vincula a los integrantes de tu familia. Primero deben registrarse en la app.</span>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowLinkModal(true)}>
                <Plus size={14} /> Vincular primero
              </button>
            </div>
          )}
        </>
      )}

      {showLinkModal && (
        <LinkMemberModal
          onClose={() => setShowLinkModal(false)}
          onSuccess={handleLinkSuccess}
          currentFamilyId={currentFamilyId}
          existingMemberEmails={existingEmails}
        />
      )}

      {editing && (
        <EditMemberModal
          member={editing}
          onSave={handleEditSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function MemberCard({ member, stats, onEdit, onDelete }) {
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{member.email}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <Clock size={12} /> ⏳ Pendiente de activación
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
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
    </div>
  )
}
