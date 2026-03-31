import { useState, useEffect, useRef } from 'react'
import { Users, UserPlus, Baby, ClipboardList, Gift, Bot, Home, ArrowRight, ShieldCheck, Mail, Database, Radio } from 'lucide-react'
import { SuperAdmin } from '../lib/superadmin.js'
import { supabase } from '../lib/supabase.js'

function StatCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--gray-800)', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRealtime, setIsRealtime] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const statsFetched = useRef(false)

  useEffect(() => {
    loadAll()
    
    // Configurar canal global con actualización instantánea
    const channel = supabase
      .channel('master-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fd_members' }, () => {
        console.log('RT: Miembros actualizados');
        loadAll(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fd_tasks' }, () => {
        console.log('RT: Tareas actualizadas');
        loadAll(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fd_completions' }, () => {
        console.log('RT: Completions actualizadas');
        loadAll(true);
      })
      .subscribe((status) => {
        console.log('Realtime status:', status);
        setIsRealtime(status === 'SUBSCRIBED');
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadAll = async (isSilent = false) => {
    if (!isSilent && !statsFetched.current) setLoading(true)
    setError(null)
    try {
      const startTime = Date.now();
      
      // Intentar obtener de la Edge Function (si existe) o fallback directo
      const data = await SuperAdmin.getStatsFallback()
      if (data) setStats(data)
      
      const userList = await SuperAdmin.getGlobalUsers()
      setUsers(userList || [])
      
      setLastUpdate(new Date())
      statsFetched.current = true;
      
      // Si cargamos muy rápido, simular un poco de carga para que el usuario lo note
      if (!isSilent && Date.now() - startTime < 300) {
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err) {
      console.error("SuperAdmin load error:", err)
      setError("No se pudo conectar con los datos en tiempo real.")
    } finally {
      setLoading(false)
    }
  }

  const familiesCount = new Set(users.map(u => u.family_id)).size

  return (
    <div className="anim-fade-in" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            🛡️ Panel Realtime
            {isRealtime && (
              <span className="chip chip-green" style={{ fontSize: 10, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite' }} />
                EN VIVO
              </span>
            )}
          </h1>
          <p className="page-subtitle">Actualizado: {lastUpdate.toLocaleTimeString()} — Datos globales de la plataforma</p>
        </div>
        <button className="btn btn-secondary" onClick={() => loadAll()} disabled={loading}>
          {loading ? 'Sincronizando...' : '↻ Forzar actualización'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--red-50)', color: 'var(--red-600)', padding: 16, borderRadius: 12, marginBottom: 20, borderLeft: '4px solid var(--red-500)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldCheck size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading && !stats ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <div className="card" style={{ padding: 16 }}>
               <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14}/> Usuarios y Familias</h3>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13 }}>Total Registrados</span> <b style={{ fontSize: 14 }}>{stats.totalUsers}</b></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13 }}>Familias Activas</span> <b style={{ fontSize: 14 }}>{familiesCount}</b></div>
               <div style={{ height: 1, background: 'var(--gray-100)', margin: '8px 0' }} />
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 12, color: 'var(--purple-600)' }}>Padres/Madres</span> <b style={{ fontSize: 13 }}>{stats.totalAdmins}</b></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--blue-600)' }}>Hijos/as</span> <b style={{ fontSize: 13 }}>{stats.totalChildren}</b></div>
            </div>

            <div className="card" style={{ padding: 16 }}>
               <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14}/> Tareas Globales</h3>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13 }}>Total Creadas</span> <b style={{ fontSize: 14 }}>{stats.totalTasks}</b></div>
               <div style={{ height: 1, background: 'var(--gray-100)', margin: '8px 0' }} />
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 13, color: 'var(--green-600)', display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}/> Activas</span> <b>{stats.activeTasks}</b></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 13, color: 'var(--amber-600)', display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}/> Inactivas</span> <b>{stats.inactiveTasks}</b></div>
            </div>

            <div className="card" style={{ padding: 16 }}>
               <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14}/> Estado de Revisiones</h3>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: 'var(--amber-600)' }}>Pendientes</span> <b style={{ fontSize: 14 }}>{stats.pendingCompletions}</b></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: 'var(--green-600)' }}>Aprobadas</span> <b style={{ fontSize: 14 }}>{stats.approvedCompletions}</b></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--red-600)' }}>Rechazadas</span> <b style={{ fontSize: 14 }}>{stats.rejectedCompletions}</b></div>
            </div>

            <div className="card" style={{ padding: 16 }}>
               <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Gift size={14}/> Premios en Sistema</h3>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13 }}>Premios Creados</span> <b style={{ fontSize: 14 }}>{stats.totalRewards}</b></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: 'var(--indigo-600)' }}>Premios Entregados</span> <b style={{ fontSize: 14 }}>{stats.rewardsRedeemed}</b></div>
            </div>

            <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, var(--purple-50), white)', border: '1px solid var(--purple-100)' }}>
               <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple-800)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Bot size={14}/> Uso de Teacher AI</h3>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, color: 'var(--purple-700)' }}>Hijos con acceso</span> <b style={{ fontSize: 14, color: 'var(--purple-900)' }}>{stats.premiumChildrenCount}</b></div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--purple-700)' }}>Peticiones Totales</span> <b style={{ fontSize: 14, color: 'var(--purple-900)' }}>{stats.aiUsageCount}</b></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">👥 Usuarios Registrados</span>
                <span className="chip chip-gray">{users.length} total</span>
              </div>
              {(() => {
                const familiesMap = {}
                const superadmins = []
                const unassigned = []

                users.forEach(u => {
                  if (u.role === 'superadmin') {
                    superadmins.push(u)
                  } else if (!u.family_id) {
                    unassigned.push(u)
                  } else {
                    if (!familiesMap[u.family_id]) familiesMap[u.family_id] = []
                    familiesMap[u.family_id].push(u)
                  }
                })

                const familiesList = Object.entries(familiesMap).map(([id, members]) => {
                  const admin = members.find(m => m.role === 'admin')
                  return { id, members: members.sort((a, b) => a.role === 'admin' ? -1 : 1), admin }
                })

                const renderUserRow = u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'white', borderRadius: 8, border: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || 'var(--purple-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {u.name}
                          {u.plan === 'premium' && <span style={{ fontSize: 10, background: 'var(--amber-100)', color: 'var(--amber-700)', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>PRO</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`chip chip-${u.role === 'admin' ? 'purple' : u.role === 'superadmin' ? 'red' : 'blue'}`} style={{ fontSize: 10 }}>
                        {u.role === 'admin' ? 'Padre/Madre' : u.role === 'superadmin' ? 'SuperAdmin' : 'Hijo/a'}
                      </span>
                      <span className={`chip chip-${u.status === 'active' ? 'green' : 'amber'}`} style={{ fontSize: 10 }}>
                        {u.status === 'active' ? 'Activo' : 'Invitado'}
                      </span>
                    </div>
                  </div>
                )

                return (
                  <div className="card-body" style={{ padding: 20, maxHeight: '600px', overflowY: 'auto' }}>
                    {familiesList.length === 0 && superadmins.length === 0 && unassigned.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay usuarios registrados</div>
                    ) : (
                      <>
                        {familiesList.map(fam => {
                          const isPremium = fam.admin?.plan === 'premium' || fam.members.some(m => m.plan === 'premium')
                          return (
                            <div key={fam.id} style={{ marginBottom: 24, padding: 16, border: '1px solid var(--gray-200)', borderRadius: 12, background: 'var(--gray-50)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                                <div>
                                  <div style={{ fontSize: 16, fontWeight: 800 }}>Familia de {fam.admin?.name || 'Desconocido'}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {fam.id}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span className={`chip chip-${isPremium ? 'purple' : 'gray'}`} style={{ fontWeight: 800, fontSize: 12 }}>
                                    {isPremium ? '💎 Premium' : '🌱 Gratuito'}
                                  </span>
                                  {isPremium && (
                                    <span style={{ fontSize: 11, color: 'var(--purple-600)', background: 'var(--purple-100)', padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <Bot size={12} /> Hijos con Teacher AI
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {fam.members.map(renderUserRow)}
                              </div>
                            </div>
                          )
                        })}

                        {superadmins.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <ShieldCheck size={16} color="var(--red-500)" /> SuperAdministradores
                            </h3>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {superadmins.map(renderUserRow)}
                            </div>
                          </div>
                        )}

                        {unassigned.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Users size={16} color="var(--gray-500)" /> Sin Familia Asignada
                            </h3>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {unassigned.map(renderUserRow)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--gray-800), var(--gray-900))', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Database size={20} color="var(--purple-400)" />
                  <span style={{ fontWeight: 800, fontSize: 14 }}>Estado del Sistema</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ opacity: 0.6 }}>Conexión Supabase</span>
                    <span style={{ color: 'var(--green-400)', fontWeight: 700 }}>Activa ✓</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ opacity: 0.6 }}>Edge Functions</span>
                    <span style={{ color: stats.aiUsageCount !== undefined ? 'var(--green-400)' : 'var(--amber-400)', fontWeight: 700 }}>
                      {stats.aiUsageCount !== undefined ? 'OK' : 'Limitado'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ opacity: 0.6 }}>RLS Bypass</span>
                    <span style={{ color: 'var(--purple-400)', fontWeight: 700 }}>Habilitado ✓</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserPlus size={18} color="var(--purple-500)" /> Composición de Usuarios
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Administradores', count: stats.totalAdmins, color: 'var(--purple-500)' },
                    { label: 'Participantes', count: stats.totalChildren, color: 'var(--green-500)' },
                    { label: 'Soporte / Super', count: users.filter(u => u.role === 'superadmin').length, color: 'var(--red-500)' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>{item.label}</span>
                        <span style={{ fontWeight: 800 }}>{item.count}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${(item.count / (stats.totalUsers || 1)) * 100}%`, height: '100%', background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
