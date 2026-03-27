import { Navigate } from 'react-router-dom'
import { Auth } from '../lib/auth.js'

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const user = Auth.getCurrentUser()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (superAdminOnly && user.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />
  }

  if (adminOnly && user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
