import { useState, useEffect } from 'react'
import { Trophy, CheckCircle, Star, TrendingUp } from 'lucide-react'
import { FamilyMember, TaskCompletion, getLevelInfo } from '../lib/store.js'
import { useRealtime } from '../lib/realtime.js'

function XpRingPodium({ progress, size, color, label, avatarUrl }) {
  const r   = (size - 6) / 2
  const c   = 2 * Math.PI * r
  const arc = c * (progress / 100)
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth="4"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', width: size - 12, height: size - 12, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: size * .28, color: '#fff', overflow: 'hidden' }}>
        {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : label}
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const [members,     setMembers]     = useState([])
  const [completions, setCompletions] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { loadData() }, [])
  useRealtime(['fd_members', 'fd_completions'], () => loadData())

  const loadData = async () => {
    setLoading(true)
    try {
      const [m, c] = await Promise.all([FamilyMember.list(), TaskCompletion.list()])
      setMembers(m); setCompletions(c)
    } catch (err) {
      console.error('Leaderboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStats = memberId => {
    const mc       = completions.filter(c => c.member_id === memberId)
    const approved = mc.filter(c => c.status === 'aprobada')
    const ratings  = approved.filter(c => c.performance_rating > 0)
    const avgRating = ratings.length > 0
      ? (ratings.reduce((s, c) => s + c.performance_rating, 0) / ratings.length).toFixed(1)
      : 0
    const earnedPts = approved.reduce((s, c) => s + (c.points_awarded || 0) + (c.bonus_awarded || 0), 0)
    return { total: mc.length, approved: approved.length, avgRating, earnedPts }
  }

  const children = members.filter(m => m.role === 'child')
  const ranked   = [...children].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
  const maxPts   = ranked[0]?.total_points || 1

  const PODIUM_SIZES  = [70, 56, 48]
  const PODIUM_HEIGHTS = [100, 70, 50]
  const MEDALS = ['🥇','🥈','🥉']
  const MEDAL_COLORS = ['#EF9F27','#888780','#D85A30']

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>

  return (
    <div className="anim-fade-in">
      <div className="page-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <h1 className="page-title"><Trophy size={28} color="var(--amber-500)" /> Ranking Familiar</h1>
        <p className="page-subtitle">¡Completa tareas y sube al podio!</p>
      </div>

      {ranked.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏆</span>
          <span className="empty-title">Sin participantes aún</span>
          <span className="empty-desc">Agrega miembros y empieza a completar tareas</span>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {ranked.length >= 1 && (
            <div className="leaderboard-podium-section">
              <div className="card podium-card">
                <div className="podium-wrap">
                  {/* Reorder: 2nd | 1st | 3rd */}
                  {[ranked[1], ranked[0], ranked[2]].map((member, i) => {
                    if (!member) return <div key={i} className="podium-spacer" />
                    const realIdx = i === 0 ? 1 : i === 1 ? 0 : 2
                    const lvl     = getLevelInfo(member.total_points || 0)
                    const sz      = realIdx === 0 ? 80 : realIdx === 1 ? 64 : 54; // Sized relative to rank
                    
                    const propH   = Math.round((PODIUM_HEIGHTS[realIdx] * (member.total_points || 0)) / maxPts)
                    const blockH  = Math.max(realIdx === 0 ? 90 : realIdx === 1 ? 60 : 40, propH)

                    return (
                      <div key={member.id} className={`podium-col rank-${realIdx}`} style={{ gap: 6 }}>
                        {realIdx === 0 && <span className="crown-icon">👑</span>}
                        <XpRingPodium progress={lvl.progress} size={sz} color={member.color || 'var(--purple-500)'} label={member.name?.[0]?.toUpperCase()} avatarUrl={member.avatar_url} />
                        <div className="podium-name">{member.name}</div>
                        <div className="podium-points" style={{ color: member.color || 'var(--purple-600)' }}>{member.total_points || 0}</div>
                        <span className="podium-level-badge">
                          Nv {lvl.level}
                        </span>
                        <div className="podium-block"
                          style={{ height: blockH, background: MEDAL_COLORS[realIdx] + '20', border: `2.5px solid ${MEDAL_COLORS[realIdx]}40` }}>
                          <span className="medal-icon">{MEDALS[realIdx]}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Full ranking table */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title"><TrendingUp size={18} color="var(--purple-500)" /> Tabla de posiciones</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {ranked.map((member, idx) => {
                const stats     = getStats(member.id)
                const lvl       = getLevelInfo(member.total_points || 0)
                const rowBg     = idx === 0 ? 'rgba(239,159,39,.07)' : idx === 1 ? 'rgba(136,135,128,.05)' : idx === 2 ? 'rgba(216,90,48,.05)' : 'transparent'
                return (
                  <div key={member.id} className="ranking-row" style={{ background: rowBg }}>
                    <div className="ranking-rank">
                      {MEDALS[idx] || <span className="rank-num">{idx+1}</span>}
                    </div>
                    <div className="ranking-avatar" style={{ background: member.color || 'var(--purple-500)' }}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.name} />
                      ) : (
                        member.name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="ranking-info">
                      <div className="ranking-name">{member.name}</div>
                      <div className="ranking-progress-zone">
                        <div className="ranking-progress-text">
                          <span>Nv {lvl.level} · {lvl.name}</span><span>{lvl.progress}%</span>
                        </div>
                        <div className="progress-wrap" style={{ height: 5 }}>
                          <div className="progress-fill" style={{ width: `${lvl.progress}%`, background: member.color || 'var(--purple-500)' }} />
                        </div>
                      </div>
                    </div>
                    <div className="ranking-stats">
                      <div className="ranking-stat-item hide-mobile">
                        <div className="stat-label">Tareas</div>
                        <div className="stat-val val-blue">{stats.approved}</div>
                      </div>
                      <div className="ranking-stat-item">
                        <div className="stat-label">Puntos</div>
                        <div className="stat-val val-purple">{member.total_points || 0}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Individual stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {ranked.map(member => {
              const stats = getStats(member.id)
              const lvl   = getLevelInfo(member.total_points || 0)
              return (
                <div key={member.id} className="card card-p">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <XpRingPodium progress={lvl.progress} size={52} color={member.color || 'var(--purple-500)'} label={member.name?.[0]?.toUpperCase()} avatarUrl={member.avatar_url} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{member.name}</div>
                      {member.age && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.age} años</div>}
                      <span style={{ fontSize: 10, background: 'var(--purple-50)', color: 'var(--purple-700)', padding: '2px 8px', borderRadius: 'var(--r-full)', fontWeight: 700 }}>
                        Nv {lvl.level} · {lvl.name}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[
                      { label: 'Pts totales', value: member.total_points || 0, color: 'var(--purple-600)' },
                      { label: 'Aprobadas',   value: stats.approved,           color: 'var(--green-600)' },
                      { label: 'Promedio',    value: stats.avgRating || '—',   color: 'var(--amber-600)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--gray-50)', borderRadius: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
