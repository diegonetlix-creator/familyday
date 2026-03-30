import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Check, XCircle, Users } from 'lucide-react'
import { Auth } from '../lib/auth.js'

export default function NotificationBell() {
  const [invites, setInvites]     = useState([])
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [responding, setResponding] = useState(null) // id being responded to

  const load = useCallback(async () => {
    const data = await Auth.getPendingInvites()
    setInvites(data || [])
  }, [])

  useEffect(() => {
    load()
    // Poll every 30s while mounted
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const respond = async (id, accept) => {
    setResponding(id)
    const result = await Auth.respondToInvite(id, accept)
    if (result.ok) {
      if (accept) {
        // Re-sync session locally and reload
        await Auth.refreshSession()
        window.location.reload()
      } else {
        setInvites(prev => prev.filter(i => i.id !== id))
      }
    }
    setResponding(null)
  }

  const count = invites.length

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-icon"
        title="Notificaciones"
        style={{ position: 'relative', width: 36, height: 36 }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--red-500)', color: '#fff',
            fontSize: 10, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />

          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 360, maxHeight: 480, overflowY: 'auto',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, boxShadow: 'var(--shadow-lg)', zIndex: 200
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                🔔 Notificaciones
              </span>
              <button className="btn-icon" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>

            {/* Content */}
            {count === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin notificaciones pendientes</p>
              </div>
            ) : (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {invites.map(invite => (
                  <div key={invite.id} style={{
                    border: '1.5px solid var(--purple-200)', borderRadius: 10,
                    overflow: 'hidden', background: 'var(--purple-50)'
                  }}>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Users size={14} color="var(--purple-600)" />
                        <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--purple-800)' }}>
                          Solicitud de familia
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        <strong>{invite.requester_name || 'Alguien'}</strong>{' '}
                        ({invite.requester_email}) te ha invitado a unirte a su familia.
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(invite.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div style={{
                      borderTop: '1px solid var(--purple-200)', padding: '10px 14px',
                      display: 'flex', gap: 8, background: 'var(--bg-card)'
                    }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={responding === invite.id}
                        onClick={() => respond(invite.id, true)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        {responding === invite.id
                          ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          : <><Check size={13} /> Aceptar</>
                        }
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={responding === invite.id}
                        onClick={() => respond(invite.id, false)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <XCircle size={13} /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
