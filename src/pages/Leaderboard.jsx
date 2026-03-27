import { useState, useEffect } from 'react'
import { Trophy, CheckCircle, Star, TrendingUp } from 'lucide-react'
import { FamilyMember, TaskCompletion, getLevelInfo } from '../lib/store.js'

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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
              <div className="card" style={{ padding: '32px 40px', display: 'inline-block' }}>
                <div className="podium-wrap" style={{ alignItems: 'flex-end', gap: 20 }}>
                  {/* Reorder: 2nd | 1st | 3rd */}
                  {[ranked[1], ranked[0], ranked[2]].map((member, i) => {
                    if (!member) return <div key={i} style={{ width: 80 }} />
                    const realIdx = i === 0 ? 1 : i === 1 ? 0 : 2
                    const lvl     = getLevelInfo(member.total_points || 0)
                    const sz      = PODIUM_SIZES[realIdx]
                    // proportional height: 1st gets full max, others proportional
                    const propH   = Math.round((PODIUM_HEIGHTS[realIdx] * (member.total_points || 0)) / maxPts)
                    const blockH  = Math.max(realIdx === 0 ? 90 : realIdx === 1 ? 60 : 40, propH)

                    return (
                      <div key={member.id} className="podium-col" style={{ gap: 6 }}>
                        {realIdx === 0 && <span style={{ fontSize: 22, marginBottom: 2 }}>👑</span>}
                        <XpRingPodium progress={lvl.progress} size={sz} color={member.color || 'var(--purple-500)'} label={member.name?.[0]?.toUpperCase()} avatarUrl={member.avatar_url} />
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-800)', maxWidth: 90, textAlign: 'center', lineHeight: 1.2 }}>{member.name}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: member.color || 'var(--purple-600)' }}>{member.total_points || 0}</div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 'var(--r-full)', fontWeight: 700 }}>
                          Nv {lvl.level}
                        </span>
                        <div className="podium-block"
                          style={{ width: realIdx === 0 ? 90 : realIdx === 1 ? 75 : 65, height: blockH, background: MEDAL_COLORS[realIdx] + '30', border: `2px solid ${MEDAL_COLORS[realIdx]}40` }}>
                          <span style={{ fontSize: realIdx === 0 ? 28 : 22 }}>{MEDALS[realIdx]}</span>
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
                const available = (member.total_points || 0) - (member.redeemed_points || 0)
                const rowBg     = idx === 0 ? 'rgba(239,159,39,.07)' : idx === 1 ? 'rgba(136,135,128,.05)' : idx === 2 ? 'rgba(216,90,48,.05)' : 'transparent'
                return (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', background: rowBg, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                    <div style={{ width: 32, textAlign: 'center', fontSize: 20, flexShrink: 0 }}>
                      {MEDALS[idx] || <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' }}>{idx+1}</span>}
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: member.color || 'var(--purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        member.name?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{member.name}</div>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
                          <span>Nv {lvl.level} · {lvl.name}</span><span>{lvl.progress}%</span>
                        </div>
                        <div className="progress-wrap" style={{ height: 6 }}>
                          <div className="progress-fill" style={{ width: `${lvl.progress}%`, background: member.color || 'var(--purple-500)' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tareas</div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--blue-500)' }}>{stats.approved}</div>
                      </div>
                      {stats.avgRating > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rating</div>
                          <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--amber-600)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Star size={13} fill="var(--amber-400)" color="var(--amber-400)" />{stats.avgRating}
                          </div>
                        </div>
                      )}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Puntos</div>
                        <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--purple-600)' }}>{member.total_points || 0}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{available} disp.</div>
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
