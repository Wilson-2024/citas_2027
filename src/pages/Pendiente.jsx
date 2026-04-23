import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Pendiente() {
  const navigate = useNavigate()
  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }
  return (
    <div style={{ background: '#f8f6f0', minHeight: '100vh' }}>
      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="logo-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
      </nav>
      <div className="wrap">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, background: '#fff8e1', border: '1.5px solid #f5c96a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: '.25rem' }}>Solicitud en revisión</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Tu solicitud fue recibida. El administrador revisará tu cuenta y recibirás acceso una vez aprobada.
          </p>
          <div style={{ background: '#fff8e1', border: '1px solid #f5c96a', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', textAlign: 'left' }}>
            <div style={{ fontSize: 12, color: '#92600a', fontWeight: 500, marginBottom: '.35rem' }}>¿Qué pasa ahora?</div>
            <div style={{ fontSize: 12, color: '#92600a', lineHeight: 1.7 }}>
              1. El administrador revisará tu solicitud.<br />
              2. Una vez aprobada podrás iniciar sesión.<br />
              3. Al primer acceso configurarás tus preguntas de seguridad.
            </div>
          </div>
          <button className="btn btn-outline btn-full" onClick={handleLogout}>Volver al login</button>
        </div>
      </div>
    </div>
  )
}
