import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, CheckSquare, Star, Gift, Trophy, Menu, X, Home, LogOut, Bot, Settings } from 'lucide-react'
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
  const [members, setMembers] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = Auth.getCurrentUser()

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (open) setOpen(false) }, [location.pathname])

  const loadData = async () => {
    try {
      if (currentUser) setMember(currentUser)
      const [allM, pending] = await Promise.all([FamilyMember.list(), TaskCompletion.countPending()])
      setMembers(allM)
      const activeMember = currentUser ? (allM.find(m => m.id === (currentUser.userId || currentUser.id)) || currentUser) : (allM[0] || currentUser)
      setMember(activeMember)
      setPendingCount(pending)
      if (currentUser && activeMember && currentUser.family_id !== activeMember.family_id) {
        await Auth.refreshSession()
        window.location.reload()
      }
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
  // isPremium: if admin profile has premium plan, or if superadmin, or if any admin in current family members has premium plan
  const isPremium = currentRole === 'superadmin' || 
                    member?.plan === 'premium' || 
                    (members.some(m => m.role === 'admin' && m.plan === 'premium'))

  const navItems = currentRole === 'superadmin' ? [
    { to: '/superadmin',  icon: Trophy,          label: 'Panel SuperAdmin' },
    { to: '/settings',    icon: Settings,        label: 'Ajustes' },
  ] : [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Inicio' },
    { to: '/tasks',       icon: ClipboardList,   label: 'Tareas' },
    { to: '/my-tasks',    icon: CheckSquare,     label: 'Mis Tareas' },
    { to: '/members',     icon: Users,           label: 'Familia' },
    { to: '/review',      icon: Star,            label: 'Revisar', badge: pendingCount },
    { to: '/rewards',     icon: Gift,            label: 'Premios' },
    { to: '/leaderboard', icon: Trophy,          label: 'Ranking' },
    ...(isPremium ? [
      { to: '/teacher',   icon: Bot,             label: 'Teacher IA' },
      { to: '/settings',  icon: Settings,        label: 'Ajustes' }
    ] : [])
  ]

  const bottomNavItems = currentRole === 'superadmin' ? [
    { to: '/superadmin', icon: Trophy,           label: 'Panel' },
    { to: '/settings',   icon: Settings,         label: 'Ajustes' },
  ] : currentRole === 'child' ? [
    { to: '/dashboard',  icon: LayoutDashboard,  label: 'Inicio' },
    { to: '/my-tasks',   icon: CheckSquare,      label: 'Tareas' },
    { to: '/rewards',    icon: Gift,             label: 'Premios' },
    { to: '/leaderboard',icon: Trophy,           label: 'Ranking' },
    ...(isPremium ? [
      { to: '/teacher',   icon: Bot,             label: 'Teacher' }
    ] : []),
    { to: '/settings',   icon: Settings,         label: 'Ajustes' }
  ] : [
    { to: '/dashboard',  icon: LayoutDashboard,  label: 'Inicio' },
    { to: '/review',     icon: Star,             label: 'Revisar', badge: pendingCount },
    { to: '/leaderboard',icon: Trophy,           label: 'Ranking' },
    ...(isPremium ? [
      { to: '/teacher',   icon: Bot,             label: 'Teacher' }
    ] : []),
    { to: '/members',    icon: Users,            label: 'Familia' },
    { to: '/settings',   icon: Settings,         label: 'Ajustes' }
  ]

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <img src="/logo home-day.jpeg" alt="Home Day Logo" className="logo-icon" style={{ width: 32, height: 32, objectFit: 'contain', background: 'transparent', border: 'none', boxShadow: 'none' }} />
          <div>
            <div className="logo-name">Home Day</div>
            <div className="logo-sub">Tareas con Premios</div>
          </div>
        </div>
      </div>

      {member && levelInfo && (
        <>
          <div className="sidebar-user">
            <div className="user-avatar-wrap">
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XpRing progress={levelInfo.progress} size={44} color={member.color || '#7c3aed'} />
              </div>
              <div className="user-avatar" style={{ width: 32, height: 32, background: member.color || '#7c3aed', position: 'relative', margin: '6px', overflow: 'hidden' }}>
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

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          if (currentRole !== 'superadmin' && (to === '/tasks' || to === '/review' || to === '/members') && currentRole !== 'admin') return null;
          if (currentRole === 'admin' && to === '/my-tasks') return null;
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
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.45)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.8)'; e.currentTarget.style.background = 'rgba(239,68,68,.15)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.45)'; e.currentTarget.style.background = 'transparent' }}
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>

      <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div className="sidebar-footer" style={{ border: 'none', padding: 0, margin: 0 }}>Home Day v1.0</div>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <SidebarContent />
      </aside>

      <div className={`mobile-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <div className="mobile-header">
        <div className="sidebar-logo-mark">
          <img src="/logo home-day.jpeg" alt="Home Day Logo" className="logo-icon" style={{ width: 28, height: 28, objectFit: 'contain', background: 'transparent', border: 'none', boxShadow: 'none' }} />
          <span className="logo-name" style={{ fontSize: 16 }}>Home Day</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {member && (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: member.color || '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
              {member.avatar_url
                ? <img src={member.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : member.name?.[0]?.toUpperCase()}
            </div>
          )}
          <button className="mobile-menu-btn" onClick={() => setOpen(!open)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Navegación principal">
        <div className="bottom-nav-inner">
          {bottomNavItems.map(({ to, icon: Icon, label, badge }) => {
            const isActive = location.pathname === to ||
              (to !== '/dashboard' && to !== '/superadmin' && location.pathname.startsWith(to))
            return (
              <NavLink
                key={to}
                to={to}
                className={`bottom-nav-item${isActive ? ' active' : ''}`}
              >
                <div className="bottom-nav-icon-wrap">
                  <Icon size={20} />
                  {badge > 0 && <span className="bottom-nav-badge">{badge > 9 ? '9+' : badge}</span>}
                </div>
                <span className="bottom-nav-label">{label}</span>
              </NavLink>
            )
          })}
          <button className="bottom-nav-item" onClick={handleLogout} aria-label="Cerrar sesión">
            <div className="bottom-nav-icon-wrap">
              <LogOut size={20} />
            </div>
            <span className="bottom-nav-label">Salir</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="page-body">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
