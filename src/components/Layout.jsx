import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, CheckSquare, Star, Gift, Trophy, Menu, X, Home, Bell, LogOut, Bot, Settings } from 'lucide-react'
import { FamilyMember, TaskCompletion, getLevelInfo } from '../lib/store.js'
import { Auth } from '../lib/auth.js'

function XpRing({ progress, size = 44, color = '#7c3aed' }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const filled = circ * (progress / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [member, setMember] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = Auth.getCurrentUser()

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (open) setOpen(false) }, [location.pathname])

  const loadData = async () => {
    try {
      // Usar datos de sesion local para respuesta inmediata en UI
      if (currentUser) setMember(currentUser)

      // Carga paralela optimizada
      const [members, pending] = await Promise.all([FamilyMember.list(), TaskCompletion.countPending()])
      
      const activeMember = currentUser ? (members.find(m => m.id === (currentUser.userId || currentUser.id)) || currentUser) : (members[0] || currentUser)
      setMember(activeMember)
      setPendingCount(pending)
    } catch (err) {
      console.error("Layout optimized load error:", err)
    }
  }

  const handleLogout = () => {
    Auth.logout()
    navigate('/login', { replace: true })
  }

  const levelInfo = member ? getLevelInfo(member.total_points || 0) : null

  const currentRole = member?.role || currentUser?.role
  
  const navItems = currentRole === 'superadmin' ? [
    { to: '/superadmin',  icon: Trophy,           label: 'Panel SuperAdmin' },
    { to: '/settings',    icon: Settings,         label: 'Ajustes' },
  ] : [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Inicio' },
    { to: '/tasks',       icon: ClipboardList,   label: 'Tareas' },
    { to: '/my-tasks',    icon: CheckSquare,      label: 'Mis Tareas' },
    { to: '/members',     icon: Users,            label: 'Familia' },
    { to: '/review',      icon: Star,             label: 'Revisar', badge: pendingCount },
    { to: '/rewards',     icon: Gift,             label: 'Premios' },
    { to: '/teacher',     icon: Bot,              label: 'Teacher IA' },
    { to: '/leaderboard', icon: Trophy,           label: 'Ranking' },
    { to: '/settings',    icon: Settings,         label: 'Ajustes' },
  ]

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">🏠</div>
          <div>
            <div className="logo-name">Family Day</div>
            <div className="logo-sub">Tareas con Premios</div>
          </div>
        </div>
      </div>

      {/* User */}
      {member && levelInfo && (
        <>
          <div className="sidebar-user">
            <div className="user-avatar-wrap">
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XpRing progress={levelInfo.progress} size={44} color={member.color || '#7c3aed'} />
              </div>
              <div className="user-avatar" style={{
                width: 32, height: 32, background: member.color || '#7c3aed',
                position: 'relative', margin: '6px', overflow: 'hidden'
              }}>
                {member.avatar_url ? (
                  <img src={member.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  member.name?.[0]?.toUpperCase()
                )}
              </div>
              <span className="level-badge">N{levelInfo.level}</span>
            </div>
            <div className="user-info">
              <div className="user-name">{member.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>
                  {member.role === 'admin' ? '👑 Admin' : `⭐ ${member.total_points || 0} pts`}
                </span>
              </div>
            </div>
          </div>
          <div className="sidebar-xp">
            <div className="xp-row">
              <span>{levelInfo.name}</span>
              <span>{levelInfo.progress}% → Nv {levelInfo.level + 1}</span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${levelInfo.progress}%`, background: member.color || '#7c3aed' }} />
            </div>
          </div>
        </>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          if (currentRole !== 'superadmin' && (to === '/tasks' || to === '/review' || to === '/members') && currentRole !== 'admin') return null;
          return (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon className="nav-icon" size={18} />
              <span>{label}</span>
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '12px 16px',
          background: 'transparent', border: 'none',
          borderTop: '1px solid rgba(255,255,255,.06)',
          color: 'rgba(255,255,255,.45)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', transition: 'var(--transition)',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.8)'; e.currentTarget.style.background = 'rgba(239,68,68,.15)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.45)'; e.currentTarget.style.background = 'transparent' }}
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>

      <div className="sidebar-footer">Family Day v1.0 · 2026</div>
    </>
  )

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <div className={`mobile-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      {/* Mobile header */}
      <div className="mobile-header">
        <div className="sidebar-logo-mark">
          <div className="logo-icon" style={{ width: 30, height: 30, fontSize: 16 }}>🏠</div>
          <span className="logo-name" style={{ fontSize: 16 }}>Family Day</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pendingCount > 0 && (
            <div style={{ position: 'relative' }}>
              <Bell size={18} color="rgba(255,255,255,.7)" />
              <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {pendingCount}
              </span>
            </div>
          )}
          <button className="mobile-menu-btn" onClick={() => setOpen(!open)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="main-content">
        <div className="page-body">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
