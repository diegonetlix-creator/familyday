import { Check, Mail } from 'lucide-react'

export default function InvitationModal({ invitation, member, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">✉️ Invitación enviada</span>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20, color: 'white' }}>
              {member.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{member.name}</div>
              <div style={{ display: 'inline-block', background: 'var(--purple-50)', color: 'var(--purple-700)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>
                {member.role === 'admin' ? '👑 Admin' : '⭐ Hijo/a'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--green-50)', borderRadius: 12, border: '1px solid var(--green-200)' }}>
            <div style={{ background: 'var(--green-500)', color: 'white', borderRadius: '50%', padding: '8px', display: 'flex' }}>
               <Mail size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--green-700)', fontSize: 15 }}>¡Correo electrónico enviado!</h4>
              <p style={{ margin: 0, color: 'var(--green-600)', fontSize: 13, marginTop: 4 }}>
                Se ha enviado un enlace de acceso seguro a <b>{member.email}</b>. 
              </p>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--gray-50)', padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span>Pídele a {member.name} que revise su bandeja de entrada (o la carpeta de Spam) y haga clic en el botón para establecer su contraseña.</span>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
            Listo, entendido
          </button>
        </div>
      </div>
    </div>
  )
}
