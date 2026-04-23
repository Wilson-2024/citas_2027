import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function validateCedula(ced) {
  if (ced.length !== 10) return false
  const digits = ced.split('').map(Number)
  const prov = parseInt(ced.substring(0, 2))
  if (prov < 1 || prov > 24) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let d = digits[i]
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return (10 - (sum % 10)) % 10 === digits[9]
}

export default function Login() {
  const navigate = useNavigate()
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [cedulaValid, setCedulaValid] = useState(null)

  function handleCedula(val) {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setCedula(clean)
    if (clean.length === 10) setCedulaValid(validateCedula(clean))
    else setCedulaValid(null)
  }

  async function handleLogin() {
    setError(''); setOk('')
    if (!cedula || cedula.length !== 10) { setError('Ingresa tu cédula de 10 dígitos.'); return }
    if (!validateCedula(cedula)) { setError('La cédula ingresada no es válida.'); return }
    if (!password) { setError('Ingresa tu contraseña.'); return }
    setLoading(true)
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('email_auth, status, is_active, role, security_questions_set')
        .eq('cedula', cedula)
        .single()

      if (profileErr || !profileData) {
        setError('Cédula o contraseña incorrecta.'); setLoading(false); return
      }

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: profileData.email_auth,
        password,
      })

      if (authErr) {
        setError('Cédula o contraseña incorrecta.'); setLoading(false); return
      }

      if (profileData.status === 'pending' || !profileData.is_active) {
        navigate('/pendiente'); return
      }

      if (!profileData.security_questions_set) {
        navigate('/setup-preguntas'); return
      }

      setOk('Acceso correcto. Ingresando...')
      setTimeout(() => {
        navigate(profileData.role === 'admin' ? '/admin' : '/agente')
      }, 800)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
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
        <button className="btn btn-gray btn-sm" onClick={() => navigate('/')}>← Inicio</button>
      </nav>

      <div className="wrap">
        <div className="card">
          <div style={{ width: 52, height: 52, background: '#fdf6e3', border: '1.5px solid #e8c97a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .9rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9991a" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 500, textAlign: 'center', marginBottom: '.25rem' }}>Acceso al sistema</h2>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: '1.25rem' }}>Ingresa con tu número de cédula y contraseña</p>

          {error && <div className="err-msg show">{error}</div>}
          {ok && <div className="ok-msg show">{ok}</div>}

          <div className="form-group">
            <label className="form-label">Número de cédula <span className="req">*</span></label>
            <input type="text" className="form-input" placeholder="0000000000" maxLength={10}
              value={cedula} onChange={e => handleCedula(e.target.value)} />
            {cedulaValid === true && <div className="cedula-check cedula-ok">✓ Cédula válida</div>}
            {cedulaValid === false && <div className="cedula-check cedula-err">✗ Cédula inválida</div>}
            <div className="hint">10 dígitos, sin guiones ni espacios</div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña <span className="req">*</span></label>
            <div className="pass-wrap">
              <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="••••••••"
                style={{ paddingRight: 38 }} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button className="eye-btn" onClick={() => setShowPass(!showPass)}>
                {showPass
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          <button className="btn btn-gold btn-full" onClick={handleLogin} disabled={loading}>
            {loading ? <><span className="spinner"></span> Verificando...</> : 'Iniciar sesión'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '.75rem' }}>
            <span style={{ fontSize: 13, color: '#888' }}>¿Olvidaste tu contraseña? </span>
            <span style={{ fontSize: 13, color: '#c9991a', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => navigate('/recuperar-password')}>Recuperar acceso</span>
          </div>

          <div className="divider"><div className="divider-line"></div><span className="divider-text">¿No tienes cuenta?</span><div className="divider-line"></div></div>
          <button className="btn btn-outline btn-full" onClick={() => navigate('/registro')}>Registrarme como agente</button>
        </div>
      </div>
    </div>
  )
}
