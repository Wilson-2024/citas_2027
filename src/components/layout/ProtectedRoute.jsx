import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingScreen from '../../components/ui/LoadingScreen'

export default function ProtectedRoute({ children, requireRole, requireApproved = true }) {
  const { session, profile, loading, isApproved } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />

  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to="/" replace />
  }

  if (requireApproved && !isApproved) {
    return <Navigate to="/pendiente" replace />
  }

  return children
}
