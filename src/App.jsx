import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Cita from './pages/Cita'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Pendiente from './pages/Pendiente'
import SetupPreguntas from './pages/SetupPreguntas'
import RecuperarPassword from './pages/RecuperarPassword'
import Agente from './pages/Agente'
import Admin from './pages/Admin'

function ProtectedAgent({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',color:'#888'}}>Cargando...</div>
  if (!profile) return <Navigate to="/login" />
  if (profile.status === 'pending') return <Navigate to="/pendiente" />
  if (!profile.is_active) return <Navigate to="/pendiente" />
  if (!profile.security_questions_set) return <Navigate to="/setup-preguntas" />
  if (profile.role !== 'agent') return <Navigate to="/login" />
  return children
}

function ProtectedAdmin({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',color:'#888'}}>Cargando...</div>
  if (!profile) return <Navigate to="/login" />
  if (profile.role !== 'admin') return <Navigate to="/login" />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cita" element={<Cita />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/pendiente" element={<Pendiente />} />
      <Route path="/setup-preguntas" element={<SetupPreguntas />} />
      <Route path="/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/agente" element={<ProtectedAgent><Agente /></ProtectedAgent>} />
      <Route path="/admin" element={<ProtectedAdmin><Admin /></ProtectedAdmin>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
