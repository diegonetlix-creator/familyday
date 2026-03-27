import { useState, useEffect } from 'react'
import { Users, UserPlus, Baby, ClipboardList, Gift, Bot } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    const data = await SuperAdmin.getGlobalStats()
    setStats(data || { totalUsers: 0, totalAdmins: 0, totalChildren: 0, totalTasks: 0, totalRewardsDelivered: 0, aiUsageCount: 0 })
    setLoading(false)
  }

  return (
    <div className="anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Panel SuperAdmin</h1>
          <p className="page-subtitle">Estadísticas globales de la plataforma (Bypass RLS)</p>
        </div>
        <button className="btn btn-secondary" onClick={loadStats} disabled={loading}>
          {loading ? 'Recargando...' : '↻ Refrescar datos'}
        </button>
      </div>

      {loading && !stats ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <StatCard 
            title="Total Usuarios Registrados" 
            value={stats.totalUsers} 
            icon={Users} 
            color="#4f46e5" 
            bg="#e0e7ff" 
          />
          <StatCard 
            title="Padres / Administradores" 
            value={stats.totalAdmins} 
            icon={UserPlus} 
            color="#0ea5e9" 
            bg="#e0f2fe" 
          />
          <StatCard 
            title="Participantes (Hijos)" 
            value={stats.totalChildren} 
            icon={Baby} 
            color="#10b981" 
            bg="#d1fae5" 
          />
          <StatCard 
            title="Tareas Globales Creadas" 
            value={stats.totalTasks} 
            icon={ClipboardList} 
            color="#f59e0b" 
            bg="#fef3c7" 
          />
          <StatCard 
            title="Premios Entregados" 
            value={stats.totalRewardsDelivered} 
            icon={Gift} 
            color="#ec4899" 
            bg="#fce7f3" 
          />
          <StatCard 
            title="Uso de Teacher IA (Peticiones)" 
            value={stats.aiUsageCount} 
            icon={Bot} 
            color="#8b5cf6" 
            bg="#ede9fe" 
          />
        </div>
      )}
    </div>
  )
}
