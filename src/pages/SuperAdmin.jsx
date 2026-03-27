import { useState, useEffect } from 'react'
import { Users, UserPlus, Baby, ClipboardList, Gift, Bot, Home, ArrowRight, ShieldCheck, Mail, Database } from 'lucide-react'
import { SuperAdmin } from '../lib/superadmin.js'

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

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await SuperAdmin.getGlobalStats()
      if (data) {
        setStats(data)
      } else {
        // Fallback local counts if Edge Function fails (now allowed by RLS)
        const localStats = await SuperAdmin.getStatsFallback()
        setStats(localStats)
      }
      
      const userList = await SuperAdmin.getGlobalUsers()
      setUsers(userList || [])
    } catch (err) {
      console.error("SuperAdmin load error:", err)
      setError("No se pudieron cargar los datos globales.")
    } finally {
      setLoading(false)
    }
  }

  const familiesCount = new Set(users.map(u => u.family_id)).size

  return (
    <div className="anim-fade-in" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Panel SuperAdmin</h1>
          <p className="page-subtitle">Estadísticas globales de la plataforma</p>
        </div>
        <button className="btn btn-secondary" onClick={loadAll} disabled={loading}>
          {loading ? 'Recargando...' : '↻ Refrescar datos'}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard 
              title="Total Usuarios" 
              value={stats.totalUsers} 
              icon={Users} 
              color="#4f46e5" 
              bg="#e0e7ff" 
            />
            <StatCard 
              title="Familias" 
              value={familiesCount} 
              icon={Home} 
              color="#0ea5e9" 
              bg="#e0f2fe" 
            />
            <StatCard 
              title="Tareas Globales" 
              value={stats.totalTasks} 
              icon={ClipboardList} 
              color="#f59e0b" 
              bg="#fef3c7" 
            />
            <StatCard 
              title="Aprobaciones" 
              value={stats.totalRewardsDelivered} 
              icon={ShieldCheck} 
              color="#10b981" 
              bg="#d1fae5" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">👥 Usuarios Registrados</span>
                <span className="chip chip-gray">{users.length} total</span>
              </div>
              <div className="card-body" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                    <tr>
                      <th style={{ padding: '12px 20px', fontWeight: 800, color: 'var(--text-muted)' }}>Usuario</th>
                      <th style={{ padding: '12px 20px', fontWeight: 800, color: 'var(--text-muted)' }}>Rol</th>
                      <th style={{ padding: '12px 20px', fontWeight: 800, color: 'var(--text-muted)' }}>Estado</th>
                      <th style={{ padding: '12px 20px', fontWeight: 800, color: 'var(--text-muted)' }}>Familia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay usuarios registrados</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--gray-50)' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.color || 'var(--purple-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800 }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Mail size={10} /> {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span className={`chip chip-${u.role === 'admin' ? 'purple' : u.role === 'superadmin' ? 'red' : 'blue'}`} style={{ fontSize: 10 }}>
                            {u.role === 'admin' ? 'Padre/Madre' : u.role === 'superadmin' ? 'SuperAdmin' : 'Hijo/a'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span className={`chip chip-${u.status === 'active' ? 'green' : 'amber'}`} style={{ fontSize: 10 }}>
                            {u.status === 'active' ? 'Activo' : 'Invitado'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}>
                          {u.family_id?.split('-')[0]}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
