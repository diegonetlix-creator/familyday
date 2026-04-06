import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Zap, Star, ToggleLeft, ToggleRight } from 'lucide-react'
import { Task, FamilyMember, CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL, FREQUENCY_LABEL } from '../lib/store.js'
import { Auth } from '../lib/auth.js'
import TaskFormModal from '../components/TaskFormModal.jsx'
import { useRealtime } from '../lib/realtime.js'

export default function Tasks() {
  const [tasks, setTasks]       = useState([])
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [toast, setToast]       = useState(null)

  const currentUser = Auth.getCurrentUser()

  useEffect(() => { loadData() }, [])
  useRealtime(['fd_tasks', 'fd_members'], () => loadData())

  const loadData = async () => {
    setLoading(true)
    try {
      const [t, m] = await Promise.all([Task.list('-createdAt'), FamilyMember.list()])
      setTasks(t); setMembers(m)
    } catch (err) {
      console.error('Tasks load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await Task.delete(id)
    setTasks(t => t.filter(x => x.id !== id))
  }

  const handleToggle = async task => {
    const updated = await Task.update(task.id, { is_active: !task.is_active })
    setTasks(t => t.map(x => x.id === task.id ? updated : x))
  }

  const handleSave = async data => {
    if (editing) {
      await Task.update(editing.id, data)
    } else {
      setLoading(true)
      try {
        const newTask = await Task.create(data)
        if (!newTask) {
          alert('Error al crear la tarea. Es posible que tu sesión haya expirado. Por favor, cierra sesión e inicia de nuevo.')
          setLoading(false)
          return
        }
        // Notify all active children via Edge Function
        try {
          const activeChildren = members.filter(m => m.role === 'child' && m.email)
          if (activeChildren.length > 0) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gfqpafvwlgmswthnmvkl.supabase.co'
            await fetch(`${supabaseUrl}/functions/v1/send-task-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task: { title: newTask.title, description: newTask.description, base_points: newTask.base_points },
                children: activeChildren.map(m => ({ name: m.name, email: m.email }))
              })
            })
          }
        } catch (emailErr) {
          console.warn('Email notification error (non-critical):', emailErr)
        }
      } catch (err) {
        alert('Error: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    setShowModal(false); setEditing(null); loadData()
  }

  const filtered = tasks.filter(t => {
    const s = t.title?.toLowerCase().includes(search.toLowerCase())
    const c = filterCat === 'all' || t.category === filterCat
    return s && c
  })

  const active   = tasks.filter(t => t.is_active).length
  const inactive = tasks.filter(t => !t.is_active).length
  const totalPts = tasks.reduce((s, t) => s + (t.base_points || 0), 0)

  const DIFF_COLORS = { easy: 'chip-green', medium: 'chip-amber', hard: 'chip-red' }
  const FREQ_COLORS = { daily: 'chip-purple', weekly: 'chip-blue', once: 'chip-gray' }

  return (
    <div className="anim-fade-in">
      {toast && (
        <div className="anim-slide-up" style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          padding: '12px 20px', borderRadius: 8, color: 'white',
          background: 'var(--amber-500)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14, fontWeight: 600
        }}>{toast}</div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Tareas del Hogar</h1>
          <p className="page-subtitle">Gestiona todas las tareas y sus puntos</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          const isPremium = members.some(m => m.role === 'admin' && m.plan === 'premium') || currentUser?.role === 'superadmin'
          if (!isPremium && tasks.length >= 5) {
            setToast('🏆 Plan Gratuito: Límite de 5 tareas alcanzado. Actualiza a Premium para crear tareas ilimitadas.')
            setTimeout(() => setToast(null), 4000)
            return
          }
          setEditing(null); setShowModal(true) 
        }}>
          <Plus size={16} /> Nueva Tarea
        </button>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Activas', value: active, color: 'var(--green-600)', bg: 'var(--green-50)' },
          { label: 'Inactivas', value: inactive, color: 'var(--amber-600)', bg: 'var(--amber-50)' },
          { label: 'Total puntos', value: totalPts, color: 'var(--purple-600)', bg: 'var(--purple-50)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ padding: '14px 18px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Buscar tareas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 200 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{CATEGORY_EMOJI[k]} {v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <span className="empty-title">No hay tareas</span>
          <span className="empty-desc">Crea la primera tarea para tu familia</span>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => {
            const isPremium = members.some(m => m.role === 'admin' && m.plan === 'premium') || currentUser?.role === 'superadmin'
            if (!isPremium && tasks.length >= 5) {
              setToast('🏆 Límite de 5 tareas alcanzado. Actualiza a Premium.')
              setTimeout(() => setToast(null), 4000)
              return
            }
            setEditing(null); setShowModal(true) 
          }}>
            <Plus size={14} /> Crear tarea
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(task => (
            <div key={task.id} className={`task-card diff-${task.difficulty}${!task.is_active ? ' inactive' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div className={`task-emoji-wrap diff-${task.difficulty}`}>
                  {CATEGORY_EMOJI[task.category] || '📌'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 4 }} className="truncate">{task.title}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <span className={`chip ${DIFF_COLORS[task.difficulty]}`}>{DIFFICULTY_LABEL[task.difficulty]}</span>
                    <span className={`chip ${FREQ_COLORS[task.frequency]}`}>{FREQUENCY_LABEL[task.frequency]}</span>
                    {task.requires_evidence && <span className="chip chip-pink">📷 Evidencia</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" onClick={() => { setEditing(task); setShowModal(true) }}><Edit2 size={14} /></button>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(task.id)}><Trash2 size={14} /></button>
                </div>
              </div>

              {task.description && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {task.description}
                </p>
              )}

              <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="task-points">{task.base_points}</div>
                  <div className="task-points-label">pts</div>
                  {task.bonus_points > 0 && (
                    <span className="chip chip-amber"><Zap size={11} />+{task.bonus_points}</span>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(task)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: task.is_active ? 'var(--green-600)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {task.is_active ? <ToggleRight size={18} color="var(--green-500)" /> : <ToggleLeft size={18} />}
                  {task.is_active ? 'Activa' : 'Inactiva'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TaskFormModal task={editing} members={members} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null) }} />
      )}
    </div>
  )
}
