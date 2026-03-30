import { useState, useEffect, useRef } from 'react'
import { Send, Bot, Lock, Image as ImageIcon, X } from 'lucide-react'
import { FamilyMember } from '../lib/store.js'
import { Auth } from '../lib/auth.js'
import { GoogleGenAI } from '@google/genai'

function AdminTeacherPanel({ members, onToggle }) {
  const children = members.filter(m => m.role === 'child')

  return (
    <div className="anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🤖 Teacher IA - Control Parental</h1>
          <p className="page-subtitle">Habilita o deshabilita la asistencia de IA para tus hijos</p>
        </div>
      </div>
      
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>Acceso a Teacher IA</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {children.map(child => (
            <div key={child.id} className="card card-p" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: child.color || 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                  {child.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{child.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{child.age ? `${child.age} años` : 'Participante'}</div>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={child.ai_teacher_enabled === true} 
                  onChange={(e) => onToggle(child.id, e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--purple-500)' }}
                />
              </label>
            </div>
          ))}
          {children.length === 0 && (
            <div className="empty-state">No hay participantes registrados.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function TeacherChat({ user }) {
  const [messages, setMessages] = useState([{
    id: 'welcome',
    isUser: false,
    text: `¡Hola ${user.name}! Soy tu Teacher IA 👨‍🏫. Estoy aquí para ayudarte con tus tareas del colegio o la universidad. ¿En qué te puedo ayudar hoy?`,
    image: null
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  
  const messagesEndRef = useRef(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage({
        dataUrl: e.target.result,
        file: file
      })
    }
    reader.readAsDataURL(file)
    e.target.value = '' // reset
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if ((!input.trim() && !selectedImage) || loading) return

    const newMessage = {
      id: Date.now().toString(),
      isUser: true,
      text: input,
      image: selectedImage?.dataUrl
    }
    
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setSelectedImage(null)
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
      if (!apiKey) throw new Error("API Key no configurada")

      const ai = new GoogleGenAI({ apiKey })
      
      const contents = messages.filter(m => m.id !== 'welcome').map(msg => ({
        role: msg.isUser ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))

      const newParts = [{ text: newMessage.text || "Por favor analiza esta imagen" }]
      
      // If there is an image, we strip the data url prefix to send base64
      if (newMessage.image) {
        const base64Data = newMessage.image.split(',')[1]
        const mimeType = newMessage.image.substring(newMessage.image.indexOf(':') + 1, newMessage.image.indexOf(';'))
        newParts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        })
      }

      contents.push({ role: 'user', parts: newParts })

      const systemInstruction = `Eres "Teacher", un asistente de inteligencia artificial amigable, paciente y alentador diseñado exclusivamente para ayudar a niños y jóvenes con sus tareas escolares y universitarias. 
      TUS REGLAS ESTRICTAS:
      1. SÓLO puedes responder a temas educativos (matemáticas, ciencias, historia, lenguaje, programación, etc.).
      2. Si el usuario pregunta sobre algo no relacionado con el estudio (ej. videojuegos, chistes genéricos, opiniones personales, contenido inapropiado), DEBES negarte educadamente recordando que tu único propósito es ayudar con la escuela.
      3. Sé claro y usa un lenguaje adecuado para estudiantes. Si no conoces la edad exacta, asume un tono intermedio comprensible.
      4. NO generes imágenes ni uses markdown para insertar imágenes externas.
      5. Guía al estudiante para encontrar la respuesta, no le des solo el resultado final de inmediato si es un problema a resolver paso a paso.`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7
        }
      })

      const replyText = response.text || "Lo siento, tuve un problema procesando tu petición."

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        isUser: false,
        text: replyText
      }])

      // Track AI Usage
      try {
        const count = (user.ai_usage_count || 0) + 1
        await FamilyMember.update(user.id || user.userId, { ai_usage_count: count })
        user.ai_usage_count = count
      } catch (trackErr) {
        console.error("Error al registrar uso de IA:", trackErr)
      }

    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        isUser: false,
        text: "Lo siento, ocurrió un error al comunicarme con mis servidores. Asegúrate de tener conexión y vuelve a intentarlo. (Error: " + err.message + ")"
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header" style={{ flexShrink: 0, marginBottom: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={24} color="var(--purple-500)" /> Teacher IA
          </h1>
          <p className="page-subtitle">Tu asistente personal para el colegio</p>
        </div>
      </div>

      <div style={{ flex: 1, background: 'var(--background)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Messages */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ 
                maxWidth: '85%', 
                background: msg.isUser ? 'var(--purple-500)' : '#fff',
                color: msg.isUser ? '#fff' : 'var(--text-primary)',
                padding: '12px 16px',
                borderRadius: '16px',
                borderBottomRightRadius: msg.isUser ? 4 : 16,
                borderBottomLeftRadius: !msg.isUser ? 4 : 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: msg.isUser ? 'none' : '1px solid var(--border)'
              }}>
                {msg.image && (
                  <img src={msg.image} alt="uploaded" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
                )}
                {msg.text && (
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14 }}>
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '16px', borderBottomLeftRadius: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <img src={selectedImage.dataUrl} style={{ height: 60, borderRadius: 8, border: '1px solid var(--border)' }} />
              <button 
                onClick={() => setSelectedImage(null)}
                style={{ position: 'absolute', top: -6, right: -6, background: 'var(--red-500)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Imagen adjunta lista para enviar</div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} style={{ borderTop: '1px solid var(--border)', background: '#fff', padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          
          <label style={{ cursor: 'pointer', padding: 8, color: 'var(--text-muted)', transition: 'color .2s' }}>
            <ImageIcon size={20} />
            <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
          </label>
          
          <input 
            type="text" 
            placeholder="Hazme una pregunta sobre tus tareas..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{ flex: 1, padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', outline: 'none', fontSize: 14 }}
          />

          <button 
            type="submit" 
            disabled={loading || (!input.trim() && !selectedImage)}
            style={{ 
              background: loading || (!input.trim() && !selectedImage) ? 'var(--gray-200)' : 'var(--purple-500)', 
              color: loading || (!input.trim() && !selectedImage) ? 'var(--text-muted)' : 'white', 
              border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: loading || (!input.trim() && !selectedImage) ? 'not-allowed' : 'pointer', transition: 'background .2s'
            }}>
            <Send size={18} style={{ marginLeft: -2 }} />
          </button>
        </form>

      </div>
      
      <style>{`
        .typing-dot {
          width: 6px; height: 6px; background: var(--text-muted); border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default function Teacher() {
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const u = Auth.getCurrentUser()
      setUser(u)
      try {
        const m = await FamilyMember.list()
        setMembers(m)
        // If current user is child, update `user` to get real `ai_teacher_enabled` value
        if (u && u.role === 'child') {
          const freshUser = m.find(x => x.id === (u.userId || u.id))
          if (freshUser) setUser(freshUser)
        }
      } catch (e) {
        console.error("Teacher load error", e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleToggle = async (id, val) => {
    try {
      await FamilyMember.update(id, { ai_teacher_enabled: val })
      setMembers(members.map(m => m.id === id ? { ...m, ai_teacher_enabled: val } : m))
    } catch (e) {
      alert("Error al actualizar permisos: " + e.message)
    }
  }

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>
  
  if (!user) return <div>Inicia sesión para continuar</div>

  const isPremium = members.some(m => m.role === 'admin' && m.plan === 'premium') || user.role === 'superadmin' || user.plan === 'premium'

  if (!isPremium) {
    return (
      <div className="anim-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, background: '#fff', borderRadius: 20, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: 80, height: 80, background: 'var(--purple-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-600)', marginBottom: 20 }}>
           <Lock size={32} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple-800)', marginBottom: 12 }}>Teacher IA Premium</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
          Descubre el poder de la Inteligencia Artificial para asistir a tus hijos con sus tareas escolares. Actualiza al Plan Premium para desbloquear esta poderosa herramienta.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Volver al Inicio</button>
      </div>
    )
  }

  if (user.role === 'admin') {
    return <AdminTeacherPanel members={members} onToggle={handleToggle} />
  }

  // Role: Child
  if (user.ai_teacher_enabled !== true) {
    return (
      <div className="anim-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, background: 'var(--red-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red-500)', marginBottom: 20 }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Teacher IA Desactivado</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
          El acceso a tu asistente personal de tareas está bloqueado en este momento. Por favor pídele a tu papá o mamá que lo habilite desde su panel de control.
        </p>
      </div>
    )
  }

  return <TeacherChat user={user} />
}
