import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Auth } from '../lib/auth.js'
import { TrendingUp, ArrowRight, Zap, Plus, Gift, Trophy, Clock } from 'lucide-react'
import { Task, TaskCompletion, FamilyMember, Reward, getLevelInfo, CATEGORY_EMOJI, STATUS_LABEL } from '../lib/store.js'

function StatCard({ label, value, sub, subClass, barPct, barColor, accent }) {
  return (
    <div className={`stat-card ${accent}`} style={{ animationDelay: '0ms' }}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent}`}>{value}</div>
      {sub && <div className={`stat-trend ${subClass || ''}`}>{sub}</div>}
      {barPct !== undefined && (
        <div className="xp-track-sm" style={{ marginTop: 10 }}>
          <div className="xp-fill-sm" style={{ width: `${barPct}%`, background: barColor, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
        </div>
      )}
    </div>
  )
}

function StatusDot({ status }) {
  const cls = { pendiente: 'status-pendiente', aprobada: 'status-aprobada', rechazada: 'status-rechazada', en_revision: 'status-en_revision' }
  const emoji = { pendiente: '⏳', aprobada: '✅', rechazada: '❌', en_revision: '🔍' }
  return <span className={`status-badge ${cls[status]}`}>{emoji[status]} {STATUS_LABEL[status]}</span>
}

export default function Dashboard() {
  const user = Auth.getCurrentUser()
  const [tasks, setTasks]           = useState([])
  const [completions, setCompletions] = useState([])
  const [members, setMembers]       = useState([])
  const [rewards, setRewards]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 12000)
    try {
      setLoading(true)
      const [t, m, r, c] = await Promise.all([
        Task.filter({ is_active: true }),
        FamilyMember.list(),
        Reward.filter({ is_active: true }),
        TaskCompletion.list('-createdAt', 15)
      ])
      setTasks(t); setMembers(m); setRewards(r); setCompletions(c)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="loading-wrap">
      <div className="spinner" />
      <span className="loading-text">Cargando tu hogar...</span>
    </div>
  )

  const currentUserObj = members.find(m => m.id === (user?.id || user?.userId)) || user
  const isPremium = currentUserObj?.plan === 'premium' || currentUserObj?.role === 'superadmin' || members.some(m => m.role === 'admin' && m.plan === 'premium')

  if (user?.role === 'child') {
    const myCompletions = completions.filter(c => c.member_id === user.id)
    const activeTasks   = tasks.slice(0, 3)
    const pointsAvailable = (user.total_points || 0) - (user.redeemed_points || 0)
    const currentLevel  = getLevelInfo(user.total_points || 0)
    const levelProgress = currentLevel.progress
    
    return (
      <div className="anim-fade-in" style={{ paddingBottom: 40 }}>
        {/* Header Hero */}
        <div style={{ 
          background: 'linear-gradient(135deg, var(--purple-600), var(--pink-500))', 
          borderRadius: 'var(--r-xl)', 
          padding: '32px 24px', 
          color: 'white', 
          marginBottom: 32,
          boxShadow: 'var(--shadow-purple)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>¡Hola, {user.name}! 👋</h1>
                <p style={{ opacity: 0.9, fontSize: 16 }}>¡Tienes un gran día por delante para ganar puntos!</p>
              </div>
              {isPremium ? (
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  👑 Premium
                </div>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⭐ Plan Gratuito
                </div>
              )}
            </div>
            
            <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.15)', padding: 20, borderRadius: 'var(--r-lg)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>Nv. {currentLevel.level} - {currentLevel.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{levelProgress}% para Nv. {currentLevel.level + 1}</span>
              </div>
              <div style={{ height: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${levelProgress}%`, height: '100%', background: 'white', boxShadow: '0 0 15px white' }} />
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', right: -20, bottom: -20, fontSize: 120, opacity: 0.15, transform: 'rotate(-15deg)' }}>🚀</div>
        </div>

        <div className="responsive-grid">
          {/* Points & Stats */}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24, textAlign: 'center', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Puntos para canjear</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--purple-600)', lineHeight: 1 }}>{pointsAvailable}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>¡Sigue así para conseguir premios!</div>
              <Link to="/rewards">
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>
                  <Gift size={18} /> Ver Catálogo de Premios
                </button>
              </Link>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="var(--purple-500)" /> Tu Actividad reciente
              </h3>
              {myCompletions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No has completado tareas todavía.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {myCompletions.slice(0, 4).map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {CATEGORY_EMOJI[c.task_category] || '📌'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }} className="truncate">{c.task_title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                      </div>
                      <StatusDot status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Missions / Tasks */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="var(--amber-500)" /> Misiones Disponibles
              </h3>
              <Link to="/my-tasks" className="btn btn-ghost btn-sm">Ver todas</Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontWeight: 700 }}>¡Todo listo!</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No hay nuevas misiones asignadas.</div>
                </div>
              ) : activeTasks.map(t => (
                <div key={t.id} style={{ 
                  padding: 16, 
                  borderRadius: 'var(--r-md)', 
                  border: '1.5px solid var(--gray-100)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ fontSize: 24 }}>{CATEGORY_EMOJI[t.category] || '📌'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--purple-600)', fontWeight: 700 }}>+{t.base_points} pts</div>
                  </div>
                  <Link to="/my-tasks">
                    <button className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>Ir</button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pending     = completions.filter(c => c.status === 'pendiente').length
  const todayOk     = completions.filter(c => c.status === 'aprobada' && new Date(c.createdAt).toDateString() === new Date().toDateString()).length
  const totalPts    = members.reduce((s, m) => s + (m.total_points || 0), 0)
  const children    = members.filter(m => m.role === 'child')
  const topMembers  = [...children].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 5)
  const recent      = completions.slice(0, 8)
  const goalPts     = 1500

  return (
    <div className="anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏠 ¡Bienvenidos!</h1>
          <p className="page-subtitle">Gestiona tareas y premia el esfuerzo familiar</p>
        </div>
        <Link to="/tasks">
          <button className="btn btn-primary">
            <Plus size={16} /> Nueva Tarea
          </button>
        </Link>
      </div>

      {!isPremium ? (
        <div style={{ background: 'linear-gradient(135deg, var(--purple-600), var(--pink-500))', padding: '16px 24px', borderRadius: 16, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, boxShadow: 'var(--shadow-md)', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>🚀 Estás en el Plan Gratuito</h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 13, marginTop: 4 }}>Tienes {tasks.length}/5 tareas permitidas y límite de perfiles (1 hijo, 1 padre).</p>
          </div>
          <button className="btn" style={{ background: 'white', color: 'var(--purple-600)', width: 'auto' }}>
            👑 Mejorar a Premium
          </button>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, var(--green-500), var(--emerald-500))', padding: '12px 20px', borderRadius: 12, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>👑</span>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Plan Premium Activo</h3>
              <p style={{ margin: 0, opacity: 0.9, fontSize: 12 }}>Disfrutando de tareas ilimitadas, miembros ilimitados y Teacher IA.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stat grid */}
      <div className="stat-grid">
        <StatCard
          label="Tareas activas"
          value={tasks.length}
          sub={`${todayOk} completadas hoy`}
          subClass={todayOk > 0 ? 'up' : ''}
          barPct={Math.min((todayOk / Math.max(tasks.length, 1)) * 100, 100)}
          barColor="var(--purple-500)"
          accent="purple"
        />
        <StatCard
          label="Por revisar"
          value={pending}
          sub={pending > 0 ? `${pending} esperan tu aprobación` : 'Al día ✓'}
          subClass={pending > 0 ? 'warn' : 'up'}
          barPct={Math.min((pending / Math.max(completions.length, 1)) * 100, 100)}
          barColor="var(--amber-500)"
          accent="amber"
        />
        <StatCard
          label="Puntos familia"
          value={totalPts.toLocaleString()}
          sub={`Meta: ${goalPts} pts`}
          barPct={Math.min((totalPts / goalPts) * 100, 100)}
          barColor="var(--green-500)"
          accent="green"
        />
        <StatCard
          label="Premios"
          value={rewards.length}
          sub={`${members.length} integrantes`}
          accent="pink"
        />
      </div>

      <div className="responsive-dashboard-main">
        {/* Left column */}

        <div>
          {/* Recent activity */}
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title"><TrendingUp size={18} color="var(--purple-500)" /> Actividad reciente</span>
              <Link to="/review"><button className="btn btn-ghost btn-sm">Ver todo <ArrowRight size={14} /></button></Link>
            </div>
            <div style={{ padding: '8px 0' }}>
              {recent.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <span className="empty-icon">📋</span>
                  <span className="empty-title">Sin actividad aún</span>
                  <span className="empty-desc">Completa tu primera tarea para verla aquí</span>
                  <Link to="/my-tasks"><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Ir a mis tareas</button></Link>
                </div>
              ) : recent.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--purple-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {CATEGORY_EMOJI['otros']}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }} className="truncate">{c.task_title || 'Tarea'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.member_name} · {new Date(c.createdAt).toLocaleDateString('es-ES')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.points_awarded > 0 && (
                      <span className="chip chip-purple">+{c.points_awarded} pts</span>
                    )}
                    <StatusDot status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { to: '/tasks',   icon: '➕', title: 'Nueva tarea', desc: 'Crear tarea del hogar', color: 'var(--purple-500)', bg: 'var(--purple-50)' },
              { to: '/rewards', icon: '🎁', title: 'Gestionar premios', desc: `${rewards.length} disponibles`, color: 'var(--pink-500)', bg: 'var(--pink-50)' },
            ].map(({ to, icon, title, desc, color, bg }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: 20, cursor: 'pointer', transition: 'box-shadow .2s, transform .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, background: color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-800)' }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pending alert */}
          {pending > 0 && (
            <div className="card" style={{ background: 'var(--amber-50)', borderColor: '#fde68a', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Zap size={20} color="var(--amber-600)" />
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--amber-600)' }}>¡{pending} tarea{pending > 1 ? 's' : ''} por revisar!</span>
              </div>
              <Link to="/review">
                <button className="btn btn-sm w-full" style={{ background: 'var(--amber-500)', color: '#fff', justifyContent: 'center' }}>
                  Revisar ahora <ArrowRight size={14} />
                </button>
              </Link>
            </div>
          )}

          {/* Ranking */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Trophy size={18} color="var(--amber-500)" /> Ranking familiar</span>
              <Link to="/leaderboard"><button className="btn btn-ghost btn-sm">Ver más</button></Link>
            </div>
            <div style={{ padding: '8px 0' }}>
              {topMembers.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 20px' }}>
                  <span className="empty-icon">👥</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin miembros aún</span>
                </div>
              ) : topMembers.map((m, idx) => {
                const lvl = getLevelInfo(m.total_points || 0)
                const medals = ['🥇','🥈','🥉']
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <span style={{ fontSize: 18, width: 26 }}>{medals[idx] || idx + 1}</span>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.color || 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                      {m.avatar_url ? (
                        <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        m.name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }} className="truncate">{m.name}</div>
                      <div className="xp-track-sm" style={{ marginTop: 3, width: '100%' }}>
                        <div className="xp-fill-sm" style={{ width: `${lvl.progress}%`, background: m.color || 'var(--purple-500)' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--purple-600)' }}>{m.total_points || 0}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Nv {lvl.level}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: 32, paddingBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          💎 Mi Plan
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          
          {/* Free Plan */}
          <div className="card" style={{ 
            padding: 24, 
            border: !isPremium ? '2px solid var(--purple-500)' : '1px solid var(--border)',
            position: 'relative' 
          }}>
            {!isPremium && <div style={{ position: 'absolute', top: -12, right: 24, background: 'var(--purple-500)', color: 'white', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>Plan Actual</div>}
            <h4 style={{ fontSize: 20, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>Plan Gratuito</h4>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--purple-600)', marginBottom: 16 }}>$0 <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>/ mes</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
              <li>✔️ 1 Administrador (Padre/Madre)</li>
              <li>✔️ 1 Hijo (Participante)</li>
              <li>✔️ Límite de 5 tareas activas por mes</li>
              <li style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>❌ Teacher IA (Bloqueado)</li>
              <li style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>❌ Ajustes y Foto de Perfil</li>
            </ul>
          </div>

          {/* Premium Plan */}
          <div className="card" style={{ 
            padding: 24, 
            background: 'linear-gradient(to bottom right, var(--purple-50), #fff)',
            border: isPremium ? '2px solid var(--green-500)' : '1px solid var(--purple-200)',
            position: 'relative' 
          }}>
            {isPremium && <div style={{ position: 'absolute', top: -12, right: 24, background: 'var(--green-500)', color: 'white', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>Plan Actual</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <h4 style={{ fontSize: 20, fontWeight: 900, color: 'var(--purple-800)', margin: 0 }}>Plan Premium</h4>
              <span style={{ fontSize: 20 }}>👑</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--purple-600)', marginBottom: 16 }}>$4.99 <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>/ mes</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--purple-800)', fontWeight: 500 }}>
              <li>✔️ <strong>Padres/Madres sin límites</strong></li>
              <li>✔️ <strong>Hijos sin límites</strong></li>
              <li>✔️ <strong>Tareas ilimitadas</strong></li>
              <li>✔️ <strong>Teacher IA:</strong> Asistente virtual escolar</li>
              <li>✔️ <strong>Ajustes y fotos de perfil reales</strong></li>
            </ul>
            {!isPremium && (
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center', background: 'linear-gradient(135deg, var(--green-500), var(--emerald-500))', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                Adquirir Premium
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
