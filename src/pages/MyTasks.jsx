import { useState, useEffect } from 'react'
import { Search, CheckCircle, Clock, Camera, X, Send } from 'lucide-react'
import { Task, TaskCompletion, FamilyMember, CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL, FREQUENCY_LABEL } from '../lib/store.js'

function CompleteModal({ task, members, onSubmit, onClose }) {
  const [memberId, setMemberId]     = useState('')
  const [notes, setNotes]           = useState('')
  const [images, setImages]         = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const children = members.filter(m => m.role === 'child')

  const handleRealUpload = async e => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    setUploading(true)
    const newUrls = []
    
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`
        
        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/evidence/${filePath}`
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY
        
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': file.type
          },
          body: file
        })
        
        if (!res.ok) throw new Error(await res.text())
        
        // Construct the public URL
        const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/evidence/${filePath}`
        newUrls.push(publicUrl)
      }
      setImages(prev => [...prev, ...newUrls])
    } catch (err) {
      console.error('Upload error:', err)
      alert('Error al subir las fotos. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!memberId) return alert('Selecciona quién completó la tarea')
    if (task.requires_evidence && images.length === 0) return alert('Esta tarea requiere evidencia fotográfica')
    
    setSubmitting(true)
    try {
      const member = members.find(m => m.id === memberId)
      await onSubmit({
        task_id: task.id, 
        task_title: task.title,
        member_id: memberId, 
        member_name: member?.name || '',
        notes_child: notes, 
        evidence_images: images,
        evidence_documents: [], 
        status: 'pendiente',
        points_awarded: task.base_points, // Default to base points
        bonus_awarded: 0,
        completed_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Error al enviar tarea:', err)
      alert('Hubo un error al enviar la tarea. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const DIFF_COLOR = { facil: '#22c55e', media: '#f59e0b', dificil: '#ef4444' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <span className="modal-title">✅ Completar tarea</span>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{task.title}</div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 14, background: 'var(--purple-50)', borderRadius: 'var(--r-md)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 32 }}>{CATEGORY_EMOJI[task.category] || '📌'}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{task.title}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: DIFF_COLOR[task.difficulty], fontWeight: 700 }}>● {DIFFICULTY_LABEL[task.difficulty]}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--purple-600)' }}>{task.base_points}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: 2 }}>pts</span>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">¿Quién completó la tarea? *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {children.map(m => (
                <button key={m.id} type="button" onClick={() => setMemberId(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    borderRadius: 'var(--r-full)', border: `2px solid ${memberId === m.id ? m.color || 'var(--purple-500)' : 'var(--border)'}`,
                    background: memberId === m.id ? (m.color || 'var(--purple-500)') + '18' : 'transparent',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s'
                  }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.color || 'var(--purple-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, overflow: 'hidden', flexShrink: 0 }}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (m.name?.[0] || '?').toUpperCase()
                    )}
                  </div>
                  {m.name} · {m.age} años
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Nota o comentario (opcional)</label>
            <textarea className="form-input" rows={2} placeholder="Cuéntale al admin cómo te fue..."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {task.requires_evidence && (
            <div>
              <label className="form-label">📷 Foto como evidencia *</label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px', border: '2px dashed var(--purple-200)', borderRadius: 'var(--r-md)', cursor: 'pointer', background: 'var(--purple-50)', fontSize: 13, fontWeight: 700, color: 'var(--purple-600)', opacity: uploading ? 0.5 : 1 }}>
                <Camera size={18} /> {uploading ? 'Subiendo...' : 'Subir fotos'}
                <input type="file" accept="image/*" multiple onChange={handleRealUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {images.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {images.map((u, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={u} style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--purple-200)' }} />
                      <button onClick={() => setImages(imgs => imgs.filter((_,j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !memberId || uploading}>
            <Send size={15} /> {submitting ? 'Enviando...' : 'Enviar para revisión'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyTasks() {
  const [tasks, setTasks]           = useState([])
  const [members, setMembers]       = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [sent, setSent]             = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [t, m, c] = await Promise.all([Task.filter({ is_active: true }), FamilyMember.list(), TaskCompletion.list()])
      setTasks(t); setMembers(m); setCompletions(c)
    } catch (err) {
      console.error('MyTasks load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async data => {
    setLoading(true)
    try {
      const res = await TaskCompletion.create(data)
      if (!res) {
        alert('Error al enviar la tarea. Si llevas mucho tiempo sin usar la app, por favor refresca la página.')
        return
      }
      setSelectedTask(null); setSent(true)
      setTimeout(() => setSent(false), 3000)
      loadData()
    } catch (err) {
      console.error('TaskCompletion create error:', err)
      alert('Error al guardar la tarea. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  const DIFF_BORDER = { facil: 'var(--green-500)', media: 'var(--amber-500)', dificil: 'var(--red-500)' }

  const filtered = tasks.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()))

  const todayCompletions = completions.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString())

  return (
    <div className="anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">⭐ Mis Tareas</h1>
          <p className="page-subtitle">Completa tareas y gana puntos</p>
        </div>
        {todayCompletions.length > 0 && (
          <div className="chip chip-green" style={{ fontSize: 13, padding: '8px 16px' }}>
            🔥 {todayCompletions.length} completadas hoy
          </div>
        )}
      </div>

      {sent && (
        <div className="anim-pop" style={{ background: 'var(--green-50)', border: '1.5px solid var(--green-400)', borderRadius: 'var(--r-md)', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎉</span>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--green-700)' }}>¡Tarea enviada para revisión!</div>
            <div style={{ fontSize: 12, color: 'var(--green-600)' }}>El admin la revisará pronto y recibirás tus puntos</div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Buscar tareas..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🎯</span>
          <span className="empty-title">No hay tareas disponibles</span>
          <span className="empty-desc">El admin todavía no ha creado tareas</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(task => {
            const recent = completions.find(c => c.task_id === task.id && new Date(c.createdAt).toDateString() === new Date().toDateString())
            return (
              <div key={task.id} className={`task-card diff-${task.difficulty}`} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className={`task-emoji-wrap diff-${task.difficulty}`}>{CATEGORY_EMOJI[task.category] || '📌'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 3 }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`chip chip-${task.difficulty === 'facil' ? 'green' : task.difficulty === 'media' ? 'amber' : 'red'}`}>
                      {DIFFICULTY_LABEL[task.difficulty]}
                    </span>
                    <span className="chip chip-gray">{FREQUENCY_LABEL[task.frequency]}</span>
                    {task.requires_evidence && <span className="chip chip-pink">📷 Requiere foto</span>}
                    {recent && (
                      <span className="chip chip-green">
                        {recent.status === 'aprobada' ? '✅ Aprobada' : recent.status === 'pendiente' ? '⏳ En revisión' : '✓ Enviada'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="task-points">{task.base_points}</div>
                  <div className="task-points-label">pts</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setSelectedTask(task)}
                  disabled={recent?.status === 'pendiente' || recent?.status === 'aprobada'}
                  style={recent ? { opacity: .5 } : {}}
                >
                  {recent ? <CheckCircle size={15} /> : '✓ Completar'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {selectedTask && (
        <CompleteModal task={selectedTask} members={members} onSubmit={handleSubmit} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}
