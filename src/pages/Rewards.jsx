import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Lock, ShoppingBag, Check } from 'lucide-react'
import { Reward, RewardRedemption, FamilyMember, REWARD_CATEGORY_EMOJI, REWARD_CATEGORY_BG } from '../lib/store.js'
import { Auth } from '../lib/auth.js'
import { useRealtime } from '../lib/realtime.js'

const CAT_LABELS = { 
  entretenimiento: 'Entretenimiento', 
  comida: 'Comida', 
  salidas: 'Salidas', 
  tecnologia: 'Tecnología', 
  ropa: 'Ropa', 
  dinero: 'Dinero', 
  privilegios: 'Privilegios', 
  viajes: 'Viajes',
  bienestar: 'Bienestar',
  deportes: 'Deportes',
  otros: 'Otros' 
}

function RewardFormModal({ reward, members, onSave, onClose }) {
  const [form, setForm] = useState({
    title:       reward?.title       || '',
    description: reward?.description || '',
    points_cost: reward?.points_cost || 50,
    category:    reward?.category    || 'otros',
    stock:       reward?.stock       ?? -1,
    is_active:   reward?.is_active   ?? true,
    assigned_to: reward?.assigned_to || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true);
    await onSave({ ...form, assigned_to: form.assigned_to || null });
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{reward ? '✏️ Editar premio' : '🎁 Nuevo premio'}</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Preview */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 100, height: 100, borderRadius: 'var(--r-lg)', background: REWARD_CATEGORY_BG[form.category] || '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                {REWARD_CATEGORY_EMOJI[form.category] || '🎁'}
              </div>
            </div>
            <div>
              <label className="form-label">Nombre del premio *</label>
              <input className="form-input" placeholder="Ej: Noche de película" required value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Categoría</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{REWARD_CATEGORY_EMOJI[k]} {v}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">⭐ Costo en puntos *</label>
                <input className="form-input" type="number" min="1" required value={form.points_cost} onChange={e => set('points_cost', parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <label className="form-label">Descripción</label>
              <textarea className="form-input" rows={2} placeholder="Describe el premio..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Stock (-1 = ilimitado)</label>
                <input className="form-input" type="number" min="-1" value={form.stock} onChange={e => set('stock', parseInt(e.target.value))} />
              </div>
              <div>
                <label className="form-label">¿Para quién?</label>
                <select className="form-input" value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value || null)}>
                  <option value="">Para todos</option>
                  {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--purple-500)' }} />
                Premio activo
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Guardando...' : reward ? '💾 Guardar' : '🎁 Crear premio'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RedeemModal({ reward, members, onRedeem, onClose }) {
  const [memberId, setMemberId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const children = members.filter(m => m.role === 'child').filter(m => !reward.assigned_to || m.id === reward.assigned_to)
  const selected = members.find(m => m.id === memberId)
  const available = selected ? (selected.total_points || 0) - (selected.redeemed_points || 0) : 0
  const canAfford = available >= reward.points_cost

  const handle = async () => {
    if (!memberId) return alert('Selecciona un miembro')
    setSubmitting(true)
    await onRedeem(memberId, reward)
    setSubmitting(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🎁 Canjear premio</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>{REWARD_CATEGORY_EMOJI[reward.category] || '🎁'}</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{reward.title}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple-600)', marginTop: 4 }}>{reward.points_cost} pts</div>
          </div>
          <div>
            <label className="form-label">¿Para quién es el premio?</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {children.map(m => {
                const pts = (m.total_points || 0) - (m.redeemed_points || 0)
                const can = pts >= reward.points_cost
                return (
                  <button key={m.id} type="button" onClick={() => can && setMemberId(m.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                      borderRadius: 'var(--r-full)', border: `2px solid ${memberId === m.id ? m.color || 'var(--purple-500)' : 'var(--border)'}`,
                      background: !can ? 'var(--gray-50)' : memberId === m.id ? (m.color || 'var(--purple-500)') + '18' : 'transparent',
                      fontWeight: 700, fontSize: 13, cursor: can ? 'pointer' : 'not-allowed',
                      opacity: can ? 1 : .5, transition: 'all .15s'
                    }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: m.color || 'var(--purple-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                      {m.name?.[0]?.toUpperCase()}
                    </span>
                    {m.name} · {pts} pts {!can && '🔒'}
                  </button>
                )
              })}
            </div>
          </div>
          {selected && (
            <div style={{ padding: '12px 16px', background: canAfford ? 'var(--green-50)' : 'var(--red-50)', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 700, color: canAfford ? 'var(--green-700)' : 'var(--red-500)' }}>
              {canAfford ? `✅ ${selected.name} tiene ${available} pts disponibles. Quedarán ${available - reward.points_cost} pts.`
                         : `❌ ${selected.name} no tiene suficientes puntos (${available}/${reward.points_cost})`}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handle} disabled={!memberId || !canAfford || submitting}>
            <Check size={15} /> Confirmar canje
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Rewards() {
  const user = Auth.getCurrentUser()
  const isAdmin = user?.role === 'admin'
  const [rewards, setRewards] = useState([])
  const [members, setMembers] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [redeeming, setRedeeming] = useState(null)
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState('rewards')

  useEffect(() => { loadData() }, [])
  useRealtime(['fd_rewards', 'fd_redemptions', 'fd_members'], () => loadData())

  const loadData = async () => {
    setLoading(true)
    try {
      const [r, m, red] = await Promise.all([Reward.list(), FamilyMember.list(), RewardRedemption.list('-createdAt')])
      setRewards(r); setMembers(m); setRedemptions(red)
    } catch (err) {
      console.error('Rewards load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async data => {
    setLoading(true)
    try {
      let res
      if (editing) res = await Reward.update(editing.id, data)
      else res = await Reward.create(data)

      if (!res) {
        alert('Error al guardar el premio. Es posible que tu sesión haya expirado. Por favor, refresca la página o inicia sesión de nuevo.')
      } else {
        setShowForm(false); setEditing(null)
        loadData()
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (memberId, reward) => {
    setLoading(true)
    try {
      const res = await RewardRedemption.create({ reward_id: reward.id, reward_title: reward.title, user_id: memberId, status: 'pending', points_spent: reward.points_cost })
      if (!res) {
        alert('Error al procesar el canje. Verifica tu conexión o intenta iniciar sesión de nuevo.')
        return
      }
      const m = members.find(x => x.id === memberId)
      if (m) await FamilyMember.update(memberId, { redeemed_points: (m.redeemed_points || 0) + reward.points_cost })
      if (reward.stock > 0) await Reward.update(reward.id, { stock: reward.stock - 1 })
      setRedeeming(null)
      setSuccess(`¡${m?.name} canjeó "${reward.title}"! 🎉`)
      setTimeout(() => setSuccess(''), 4000)
      loadData()
    } catch (err) {
      alert('Error en el canje: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRedemption = async (id) => {
    setLoading(true)
    try {
      await RewardRedemption.update(id, { status: 'approved' })
      loadData()
    } catch (err) {
      alert('Error al aprobar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar este premio?')) return
    await Reward.delete(id); loadData()
  }

  const activeRewards = rewards.filter(r => r.is_active)
  const visibleRewards = rewards.filter(r => isAdmin || !r.assigned_to || r.assigned_to === user.id)

  return (
    <div className="anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🎁 Premios</h1>
          <p className="page-subtitle">{activeRewards.length} premios disponibles</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={16} /> Nuevo premio
          </button>
        )}
      </div>

      {success && (
        <div className="anim-pop" style={{ background: 'var(--green-50)', border: '1.5px solid var(--green-400)', borderRadius: 'var(--r-md)', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎉</span>
          <span style={{ fontWeight: 800, color: 'var(--green-700)' }}>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ id: 'rewards', label: '🎁 Premios' }, { id: 'history', label: '📋 Historial de canjes' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 18px', borderRadius: 'var(--r-full)', border: '1.5px solid', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .15s',
              borderColor: tab === t.id ? 'var(--purple-500)' : 'var(--border)',
              background: tab === t.id ? 'var(--purple-50)' : 'transparent',
              color: tab === t.id ? 'var(--purple-700)' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-wrap"><div className="spinner" /></div> : tab === 'rewards' ? (
        visibleRewards.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎁</span>
            <span className="empty-title">Sin premios aún</span>
            <span className="empty-desc">Crea premios para motivar a tu familia</span>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setEditing(null); setShowForm(true) }}>
                <Plus size={14} /> Primer premio
              </button>
            )}
          </div>
        ) : (
          <div className="reward-grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {visibleRewards.map(r => (
              <div key={r.id} className={`reward-card${!r.is_active || r.stock === 0 ? ' locked' : ''}`}>
                <div className="reward-banner" style={{ background: REWARD_CATEGORY_BG[r.category] || '#f3f4f6' }}>
                  {REWARD_CATEGORY_EMOJI[r.category] || '🎁'}
                </div>
                <div className="reward-body">
                  <div className="reward-title">{r.title}</div>
                  {r.assigned_to && isAdmin && (
                    <div style={{ fontSize: 11, color: 'var(--purple-600)', background: 'var(--purple-50)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginBottom: 4, fontWeight: 600 }}>
                      Solo para: {members.find(m => m.id === r.assigned_to)?.name || 'Desconocido'}
                    </div>
                  )}
                  {r.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{r.description}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                    <div>
                      <div className="reward-cost">{r.points_cost}</div>
                      <div className="reward-cost-label">puntos</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                      {r.stock === -1 ? 'Ilimitado' : r.stock === 0 ? <span style={{ color: 'var(--red-500)', fontWeight: 700 }}>Agotado</span> : `${r.stock} en stock`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setRedeeming(r)} disabled={!r.is_active || r.stock === 0}>
                      <ShoppingBag size={13} /> {!r.is_active || r.stock === 0 ? 'No disponible' : 'Canjear'}
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn-icon" onClick={() => { setEditing(r); setShowForm(true) }}><Edit2 size={13} /></button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(r.id)}><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {redemptions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <span className="empty-title">Sin canjes aún</span>
            </div>
          ) : redemptions.map(red => {
            const m = members.find(x => x.id === red.user_id)
            const isApproved = red.status === 'approved'

            if (isApproved) {
              return (
                <div key={red.id} style={{
                  background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
                  color: '#ffffff', padding: '24px 28px', borderRadius: 20, display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center', position: 'relative',
                  overflow: 'hidden', boxShadow: '0 10px 25px rgba(109, 40, 217, 0.4)',
                  border: '2px dashed rgba(255,255,255,0.4)',
                  margin: '8px 0'
                }}>
                  {/* Perforations */}
                  <div style={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, background: 'var(--bg-page, #f5f3ff)', borderRadius: '50%', zIndex: 2 }} />
                  <div style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, background: 'var(--bg-page, #f5f3ff)', borderRadius: '50%', zIndex: 2 }} />
                  
                  <div style={{ zIndex: 1, flex: 1 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.9, marginBottom: 8, fontWeight: 800, color: '#e0e7ff' }}>
                      🎟️ TICKET DE REGALO VALIDADO
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4, textShadow: '0 2px 4px rgba(0,0,0,0.2)', lineHeight: 1.2 }}>
                      {red.reward_title}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.95, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#c7d2fe' }}>Para:</span> 
                      <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 6 }}>{m?.name || 'Miembro'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', zIndex: 1, marginLeft: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 48, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>🎁</div>
                    <div style={{ 
                      fontSize: 12, fontWeight: 900, background: '#ffffff', color: '#4f46e5', 
                      padding: '6px 14px', borderRadius: 10, textTransform: 'uppercase', 
                      letterSpacing: 1.5, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
                    }}>
                      APROBADO
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={red.id} className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: m?.color || 'var(--amber-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {m?.avatar_url ? (
                    <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    m?.name?.[0]?.toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{red.reward_title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m?.name} · Solicitado: {new Date(red.createdAt).toLocaleDateString('es-ES')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="chip chip-amber">⏳ Pendiente de aprobación</span>
                  {isAdmin && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleApproveRedemption(red.id)}>
                      <Check size={14} /> Aprobar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <RewardFormModal reward={editing} members={members.filter(m => m.role === 'child')} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null) }} />}
      {redeeming && <RedeemModal reward={redeeming} members={members} onRedeem={handleRedeem} onClose={() => setRedeeming(null)} />}
    </div>
  )
}
