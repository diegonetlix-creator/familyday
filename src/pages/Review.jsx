import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Eye, X, Image as ImageIcon, Star } from 'lucide-react'
import { TaskCompletion, FamilyMember, STATUS_LABEL } from '../lib/store.js'

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" className={`star-btn${(hover||value) >= n ? ' filled' : ''}`}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)}>
          ★
        </button>
      ))}
    </div>
  )
}

function ReviewModal({ completion, member, onReview, onClose }) {
  const [points,  setPoints]  = useState(completion.points_awarded || 0)
  const [bonus,   setBonus]   = useState(completion.bonus_awarded  || 0)
  const [rating,  setRating]  = useState(completion.performance_rating || 0)
  const [notes,   setNotes]   = useState(completion.notes_admin || '')
  const [saving,  setSaving]  = useState(false)
  const [bigImg,  setBigImg]  = useState(null)

  const handle = async status => {
    setSaving(true)
    await onReview(completion.id, completion.member_id, { status, points_awarded: points, bonus_awarded: bonus, performance_rating: rating, notes_admin: notes, reviewed_at: new Date().toISOString() })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !bigImg && onClose()}>
      {bigImg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setBigImg(null)}>
          <img src={bigImg} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <span className="modal-title">🔍 Revisar tarea</span>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{completion.task_title}</div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Member info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--purple-50)', borderRadius: 'var(--r-md)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: member?.color || 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
            {member?.avatar_url ? (
              <img src={member.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              completion.member_name?.[0]?.toUpperCase()
            )}
          </div>
            <div>
              <div style={{ fontWeight: 800 }}>{completion.member_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completada: {new Date(completion.completed_at || completion.createdAt).toLocaleString('es-ES')}</div>
            </div>
          </div>

          {completion.notes_child && (
            <div style={{ padding: '12px 16px', background: 'var(--blue-50)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--blue-400)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue-500)', marginBottom: 4 }}>💬 Nota del participante</div>
              <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>{completion.notes_child}</div>
            </div>
          )}

          {completion.evidence_images?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImageIcon size={15} /> Evidencia fotográfica
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {completion.evidence_images.map((u, i) => (
                  <button key={i} onClick={() => setBigImg(u)} style={{ border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, overflow: 'hidden', width: 80, height: 80, flexShrink: 0 }}>
                    <img src={u} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="form-label">⭐ Puntos a otorgar</label>
              <input className="form-input" type="number" min="0" value={points} onChange={e => setPoints(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="form-label">⚡ Puntos bonus</label>
              <input className="form-input" type="number" min="0" value={bonus} onChange={e => setBonus(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div>
            <label className="form-label">Calificación del desempeño</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="form-label">Comentario para el participante</label>
            <textarea className="form-input" rows={2} placeholder="Feedback positivo y constructivo..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger" onClick={() => handle('rechazada')} disabled={saving}>
            <XCircle size={16} /> Rechazar
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => handle('aprobada')} disabled={saving}>
              <CheckCircle size={16} /> Aprobar {points + bonus > 0 ? `(+${points+bonus} pts)` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Review() {
  const [completions, setCompletions] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pendiente')
  const [reviewing, setReviewing] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [c, m] = await Promise.all([TaskCompletion.list('-createdAt', 200), FamilyMember.list()])
      setCompletions(c); setMembers(m)
    } catch (err) {
      console.error('Review load error:', err)
      alert('Error al cargar las tareas. Si llevas mucho tiempo sin usar la app, por favor refresca la página.')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (id, memberId, data) => {
    setLoading(true)
    try {
      const res = await TaskCompletion.update(id, data)
      if (!res) {
        alert('Error al actualizar la revisión. Es posible que tu sesión haya expirado.')
        return
      }
      if (data.status === 'aprobada') {
        const total = (data.points_awarded || 0) + (data.bonus_awarded || 0)
        if (total > 0) {
          const m = members.find(x => x.id === memberId)
          if (m) await FamilyMember.update(memberId, { total_points: (m.total_points || 0) + total })
        }
      }
      setReviewing(null); loadData()
    } catch (err) {
      alert('Error en la revisión: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const STATUS_OPTS = [
    { value: 'pendiente',    label: '⏳ Pendientes' },
    { value: 'aprobada',     label: '✅ Aprobadas' },
    { value: 'rechazada',    label: '❌ Rechazadas' },
    { value: 'en_revision',  label: '🔍 En revisión' },
  ]

  const STATUS_CLS = { pendiente: 'status-pendiente', aprobada: 'status-aprobada', rechazada: 'status-rechazada', en_revision: 'status-en_revision' }

  const filtered = completions.filter(c => c.status === filter)
  const pendingCount = completions.filter(c => c.status === 'pendiente').length

  return (
    <div className="anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">⭐ Revisión de Tareas</h1>
          <p className="page-subtitle">{pendingCount > 0 ? `${pendingCount} tareas esperan tu aprobación` : 'Todo al día'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
        {STATUS_OPTS.map(o => (
          <button key={o.value} onClick={() => setFilter(o.value)}
            style={{
              padding: '8px 14px', borderRadius: 'var(--r-full)', border: '1.5px solid',
              borderColor: filter === o.value ? 'var(--purple-500)' : 'var(--border)',
              background: filter === o.value ? 'var(--purple-50)' : 'transparent',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              color: filter === o.value ? 'var(--purple-700)' : 'var(--text-secondary)',
            }}>
            {o.label} {o.value === 'pendiente' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✅</span>
          <span className="empty-title">Sin tareas en este estado</span>
          <span className="empty-desc">Las tareas {STATUS_LABEL[filter]?.toLowerCase()} aparecerán aquí</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const m = members.find(x => x.id === c.member_id)
            return (
              <div key={c.id} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'box-shadow .2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                {/* Top row: avatar + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: m?.color || 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                    {m?.avatar_url ? (
                      <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      c.member_name?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-800)' }} className="truncate">{c.task_title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.member_name} · {new Date(c.createdAt).toLocaleDateString('es-ES')}</div>
                  </div>
                </div>
                {/* Bottom row: badges + action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {c.evidence_images?.length > 0 && (
                    <span className="chip chip-blue"><ImageIcon size={12} /> {c.evidence_images.length} fotos</span>
                  )}
                  {c.points_awarded > 0 && (
                    <span className="chip chip-purple">+{c.points_awarded + (c.bonus_awarded||0)} pts</span>
                  )}
                  <span className={`status-badge ${STATUS_CLS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  {(c.status === 'pendiente' || c.status === 'en_revision') && (
                    <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setReviewing(c)}>
                      <Eye size={14} /> Revisar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reviewing && (
        <ReviewModal 
          completion={reviewing} 
          member={members.find(m => m.id === reviewing.member_id)} 
          onReview={handleReview} 
          onClose={() => setReviewing(null)} 
        />
      )}
    </div>
  )
}
