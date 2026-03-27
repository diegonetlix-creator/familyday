import { useState } from 'react'
import { X, Star, Zap } from 'lucide-react'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '../lib/store.js'

export default function TaskFormModal({ task, members, onSave, onClose }) {
  const [form, setForm] = useState({
    title:            task?.title || '',
    description:      task?.description || '',
    category:         task?.category || 'limpieza',
    difficulty:       task?.difficulty || 'facil',
    base_points:      task?.base_points || 10,
    bonus_points:     task?.bonus_points || 0,
    frequency:        task?.frequency || 'diaria',
    requires_evidence: task?.requires_evidence ?? false,
    is_active:        task?.is_active ?? true,
    icon:             task?.icon || '',
    assigned_to:      task?.assigned_to || [],
  })
  const [saving, setSaving] = useState(false)

  const children = (members || []).filter(m => m.role === 'child')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleAssign = id => {
    set('assigned_to', form.assigned_to.includes(id)
      ? form.assigned_to.filter(x => x !== id)
      : [...form.assigned_to, id]
    )
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const DIFF_OPTS = [
    { value: 'facil',   label: '🟢 Fácil',  pts: 10 },
    { value: 'media',   label: '🟡 Media',   pts: 25 },
    { value: 'dificil', label: '🔴 Difícil', pts: 50 },
  ]
  const FREQ_OPTS = [
    { value: 'diaria',    label: 'Diaria' },
    { value: 'semanal',   label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual',   label: 'Mensual' },
    { value: 'unica',     label: 'Única vez' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{task ? '✏️ Editar tarea' : '➕ Nueva tarea'}</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label className="form-label">Nombre de la tarea *</label>
              <input className="form-input" placeholder="Ej: Lavar los platos del almuerzo" required
                value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Categoría</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{CATEGORY_EMOJI[k]} {v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Frecuencia</label>
                <select className="form-input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                  {FREQ_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Difficulty selector */}
            <div>
              <label className="form-label">Dificultad</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {DIFF_OPTS.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => { set('difficulty', d.value); if (!task) set('base_points', d.pts) }}
                    style={{
                      padding: '10px 8px', borderRadius: 10, border: `2px solid ${form.difficulty === d.value ? 'var(--purple-500)' : 'var(--border)'}`,
                      background: form.difficulty === d.value ? 'var(--purple-50)' : 'transparent',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      color: form.difficulty === d.value ? 'var(--purple-700)' : 'var(--text-secondary)',
                      transition: 'all .15s'
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label"><Star size={13} style={{ display: 'inline', marginRight: 4 }} />Puntos base *</label>
                <input className="form-input" type="number" min="1" required
                  value={form.base_points} onChange={e => set('base_points', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="form-label"><Zap size={13} style={{ display: 'inline', marginRight: 4 }} />Puntos bonus</label>
                <input className="form-input" type="number" min="0"
                  value={form.bonus_points} onChange={e => set('bonus_points', parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div>
              <label className="form-label">Descripción</label>
              <textarea className="form-input" rows={2} placeholder="Instrucciones para completar la tarea..."
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            {children.length > 0 && (
              <div>
                <label className="form-label">Asignar a (opcional)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {children.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleAssign(m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                        borderRadius: 'var(--r-full)', border: `2px solid ${form.assigned_to.includes(m.id) ? m.color || 'var(--purple-500)' : 'var(--border)'}`,
                        background: form.assigned_to.includes(m.id) ? (m.color || 'var(--purple-500)') + '15' : 'transparent',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all .15s'
                      }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: m.color || 'var(--purple-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, overflow: 'hidden', flexShrink: 0 }}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (m.name?.[0] || '?').toUpperCase()
                        )}
                      </div>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.requires_evidence} onChange={e => set('requires_evidence', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--purple-500)' }} />
                Requiere foto como evidencia
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--purple-500)' }} />
                Tarea activa
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Guardando...' : task ? '💾 Guardar cambios' : '✨ Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
