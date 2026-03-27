import { useState, useEffect } from 'react'
import { User, Camera, Save, CheckCircle, Trash2, Edit2 } from 'lucide-react'
import { FamilyMember, MEMBER_COLORS } from '../lib/store.js'
import { Auth } from '../lib/auth.js'
import { supabase } from '../lib/supabase.js'

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [editingChild, setEditingChild] = useState(null) // ID of child being edited

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const current = Auth.getCurrentUser()
      if (!current) { setLoading(false); return }
      const allMembers = await FamilyMember.list()
      // Buscar por id, userId o email (por si el UID cambió con Google OAuth)
      let me = allMembers.find(m => m.id === (current.userId || current.id))
      if (!me) me = allMembers.find(m => m.email === current.email)
      if (!me) {
        // Fallback: usar datos de sesión directamente
        me = { id: current.id || current.userId, name: current.name, email: current.email, role: current.role, color: current.color, family_id: current.family_id }
      }
      setCurrentUser(me)
      setMembers(allMembers)
    } catch (err) {
      console.error('Settings loadData error:', err)
      showMsg('Error al cargar datos: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  const handleUploadAvatar = async (memberId, file) => {
    if (!file) return
    setSavingId(memberId)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${memberId}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      await FamilyMember.update(memberId, { avatar_url: publicUrl })
      
      // Update local states
      if (currentUser.id === memberId) {
        setCurrentUser({ ...currentUser, avatar_url: publicUrl })
      }
      setMembers(members.map(m => m.id === memberId ? { ...m, avatar_url: publicUrl } : m))
      
      showMsg("Avatar actualizado correctamente")
    } catch (err) {
      console.error(err)
      showMsg("Error al subir imagen: " + err.message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  const handleUpdateName = async (memberId, newName) => {
    if (!newName.trim()) return
    setSavingId(memberId)
    try {
      await FamilyMember.update(memberId, { name: newName })
      
      if (currentUser.id === memberId) {
        setCurrentUser({ ...currentUser, name: newName })
        // Update local session
        const session = JSON.parse(localStorage.getItem('fd_session'))
        session.name = newName
        localStorage.setItem('fd_session', JSON.stringify(session))
      }
      setMembers(members.map(m => m.id === memberId ? { ...m, name: newName } : m))
      showMsg("Nombre actualizado")
    } catch (err) {
      showMsg("Error: " + err.message, 'error')
    } finally {
      setSavingId(null)
      setEditingChild(null)
    }
  }

  const handleUpdateColor = async (memberId, newColor) => {
    setSavingId(memberId)
    try {
      await FamilyMember.update(memberId, { color: newColor })
      if (currentUser.id === memberId) setCurrentUser({ ...currentUser, color: newColor })
      setMembers(members.map(m => m.id === memberId ? { ...m, color: newColor } : m))
      showMsg("Color actualizado")
    } catch (err) {
      showMsg("Error: " + err.message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>
  if (!currentUser) return <div className="loading-wrap"><p style={{ color: 'var(--text-muted)' }}>No se pudo cargar el perfil.</p></div>

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin'
  const children = members.filter(m => m.role === 'child')

  return (
    <div className="anim-fade-in" style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Configuración</h1>
          <p className="page-subtitle">Gestiona tu perfil y el de tu familia</p>
        </div>
      </div>

      {msg.text && (
        <div className={`anim-slide-up`} style={{ 
          position: 'fixed', top: 20, right: 20, zIndex: 1000, 
          padding: '12px 20px', borderRadius: 8, color: 'white',
          background: msg.type === 'error' ? 'var(--red-500)' : 'var(--green-500)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 10
        }}>
          {msg.type === 'success' ? <CheckCircle size={18} /> : null}
          {msg.text}
        </div>
      )}

      {/* Mi Perfil */}
      <section className="card" style={{ padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <User size={20} color="var(--purple-500)" /> Mi Perfil
        </h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
          {/* Avatar Edit */}
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: 120, height: 120, borderRadius: '50%', background: currentUser.color || '#ccc',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 'bold', color: 'white',
              overflow: 'hidden', border: '4px solid #fff', boxShadow: 'var(--shadow-sm)'
            }}>
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentUser.name[0].toUpperCase()
              )}
            </div>
            <label style={{ 
              position: 'absolute', bottom: 4, right: 4, background: 'var(--purple-500)', color: 'white', 
              width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', border: '3px solid #fff' 
            }}>
              <Camera size={18} />
              <input type="file" hidden accept="image/*" onChange={(e) => handleUploadAvatar(currentUser.id, e.target.files[0])} />
            </label>
          </div>

          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="form-label">Nombre</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input 
                  type="text" className="form-input" 
                  defaultValue={currentUser.name}
                  onBlur={(e) => handleUpdateName(currentUser.id, e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Color de Perfil</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MEMBER_COLORS.map(c => (
                  <button key={c} onClick={() => handleUpdateColor(currentUser.id, c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, padding: 0,
                      border: currentUser.color === c ? '3px solid white' : '3px solid transparent',
                      boxShadow: currentUser.color === c ? `0 0 0 2px ${c}` : 'none',
                      transform: currentUser.color === c ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gestión de Hijos (Admin Only) */}
      {isAdmin && (
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>👶 Gestión de Hijos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {children.map(child => (
              <div key={child.id} className="card-p" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gray-50)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      width: 56, height: 56, borderRadius: '50%', background: child.color || '#ccc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white',
                      overflow: 'hidden', fontSize: 20
                    }}>
                      {child.avatar_url ? (
                        <img src={child.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        child.name[0].toUpperCase()
                      )}
                    </div>
                    <label style={{ 
                      position: 'absolute', bottom: -2, right: -2, background: '#fff', color: 'var(--gray-500)', 
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)'
                    }}>
                      <Camera size={12} />
                      <input type="file" hidden accept="image/*" onChange={(e) => handleUploadAvatar(child.id, e.target.files[0])} />
                    </label>
                  </div>
                  
                  {editingChild === child.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        autoFocus
                        defaultValue={child.name} 
                        className="form-input" 
                        style={{ height: 36, width: 150 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(child.id, e.target.value)}
                        onBlur={(e) => handleUpdateName(child.id, e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {child.name} 
                        <Edit2 size={12} color="var(--gray-400)" style={{ cursor: 'pointer' }} onClick={() => setEditingChild(child.id)} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{child.age} años • Participante</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {MEMBER_COLORS.slice(0, 5).map(c => (
                    <div key={c} onClick={() => handleUpdateColor(child.id, c)}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: child.color === c ? '2px solid #fff' : 'none',
                        boxShadow: child.color === c ? `0 0 0 1px ${c}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            {children.length === 0 && (
              <div className="empty-state">No hay hijos registrados en esta familia.</div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
