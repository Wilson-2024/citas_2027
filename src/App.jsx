import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoadingScreen from './components/ui/LoadingScreen'

// Pages
import HomePage from './pages/HomePage'
import CitaPage from './pages/CitaPage'
import { LoginPage, RegisterPage, PendientePage } from './pages/AuthPages'
import DashboardAgente from './pages/DashboardAgente'
import PanelAdmin from './pages/PanelAdmin'

// Smart redirect: si ya está logueado, va al dashboard correcto
function AuthRedirect({ children }) {
  const { session, profile, loading, isApproved } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !session || !profile) return
    if (!isApproved) {
      navigate('/pendiente', { replace: true })
      return
    }
    if (profile.role === 'admin') navigate('/admin', { replace: true })
    else if (profile.role === 'agent') navigate('/agente', { replace: true })
  }, [session, profile, loading, isApproved, navigate])

  if (loading) return <LoadingScreen />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Públicas ── */}
      <Route path="/"      element={<HomePage />} />
      <Route path="/cita"  element={<CitaPage />} />

      {/* ── Auth ── */}
      <Route path="/login"    element={<AuthRedirect><LoginPage /></AuthRedirect>} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/pendiente" element={
        <ProtectedRoute requireApproved={false}>
          <PendientePage />
        </ProtectedRoute>
      } />

      {/* ── Agente ── */}
      <Route path="/agente" element={
        <ProtectedRoute requireRole="agent" requireApproved={true}>
          <DashboardAgente />
        </ProtectedRoute>
      } />

      {/* ── Admin ── */}
      <Route path="/admin" element={
        <ProtectedRoute requireRole="admin" requireApproved={true}>
          <PanelAdmin />
        </ProtectedRoute>
      } />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
