import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, hashPassword } from '../lib/supabase'

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

export default function Registro() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ cedula: '', nombre: '', password: '', password2: '' })
  const [showP1, setShowP1] = useState(false)
  const [showP2, setShowP2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [cedulaValid, setCedulaValid] = useState(null)
  const [strength, setStrength] = useState(0)

  function handleCedula(val) {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setForm(f => ({ ...f, cedula: clean }))
    if (clean.length === 10) setCedulaValid(validateCedula(clean))
    else setCedulaValid(null)
  }

  function checkStrength(p) {
    let s = 0
    if (p.length >= 6) s++
    if (p.length >= 10) s++
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    setStrength(s)
  }

  const strengthColors = ['#e74c3c','#f39c12','#3498db','#1a7040']
  const strengthLabels = ['Muy débil','Regular','Buena','Muy segura']

  async function handleRegistro() {
    setError(''); setOk('')
    if (!form.cedula || form.cedula.length !== 10) { setError('Ingresa una cédula de 10 dígitos.'); return }
    if (!validateCedula(form.cedula)) { setError('La cédula ingresada no es válida.'); return }
    if (!form.nombre.trim()) { setError('Ingresa tu nombre completo.'); return }
    if (!form.password || form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (form.password !== form.password2) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('cedula', form.cedula).single()
      if (existing) { setError('Ya existe una cuenta con esa cédula.'); setLoading(false); return }

      const passHash = await hashPassword(form.password)

      const { error: insertErr } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(),
        cedula: form.cedula,
        full_name: form.nombre.trim(),
        role: 'agent',
        is_active: false,
        status: 'pending',
        password_hash: passHash,
        security_questions_set: false,
      })

      if (insertErr) { setError('Error al registrar: ' + insertErr.message); setLoading(false); return }

      setOk('Solicitud enviada. El administrador revisará tu cuenta.')
      setTimeout(() => navigate('/pendiente'), 1400)
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background:'#f8f6f0',minHeight:'100vh' }}>
      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="logo-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
        <button className="btn btn-gray btn-sm" onClick={() => navigate('/login')}>← Volver</button>
      </nav>
      <div style={{ maxWidth:460,margin:'2rem auto',padding:'0 1rem' }}>
        <div className="card">
          <h2 style={{ fontSize:20,fontWeight:500,textAlign:'center',marginBottom:'.25rem' }}>Crear cuenta de agente</h2>
          <p style={{ fontSize:13,color:'#888',textAlign:'center',marginBottom:'1.25rem',lineHeight:1.6 }}>
            Tu solicitud será revisada por el administrador antes de activarse.
          </p>
          {error && <div className="err-msg show">{error}</div>}
          {ok && <div className="ok-msg show">{ok}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cédula <span className="req">*</span></label>
              <input type="text" className="form-input" placeholder="0000000000" maxLength={10}
                value={form.cedula} onChange={e => handleCedula(e.target.value)} />
              {cedulaValid === true && <div className="cedula-check cedula-ok">✓ Cédula válida</div>}
              {cedulaValid === false && <div className="cedula-check cedula-err">✗ Cédula inválida</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Nombre completo <span className="req">*</span></label>
              <input type="text" className="form-input" placeholder="Tu nombre completo"
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña <span className="req">*</span></label>
            <div className="pass-wrap">
              <input type={showP1 ? 'text' : 'password'} className="form-input"
                placeholder="Mínimo 6 caracteres" style={{ paddingRight:38 }}
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); checkStrength(e.target.value) }} />
              <button className="eye-btn" onClick={() => setShowP1(!showP1)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            {form.password && (
              <>
                <div className="strength-bar">
                  {[0,1,2,3].map(i => <div key={i} className="strength-seg" style={{ background: i < strength ? strengthColors[strength-1] : '#eee' }}></div>)}
                </div>
                <div style={{ fontSize:11,marginTop:3,color: strength > 0 ? strengthColors[strength-1] : '#bbb' }}>
                  {strength > 0 ? strengthLabels[strength-1] : 'Ingresa una contraseña'}
                </div>
              </>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar contraseña <span className="req">*</span></label>
            <div className="pass-wrap">
              <input type={showP2 ? 'text' : 'password'} className="form-input"
                placeholder="Repite tu contraseña" style={{ paddingRight:38 }}
                value={form.password2}
                onChange={e => setForm(f => ({ ...f, password2: e.target.value }))} />
              <button className="eye-btn" onClick={() => setShowP2(!showP2)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button className="btn btn-gold btn-full" onClick={handleRegistro} disabled={loading}>
            {loading ? <><span className="spinner"></span> Enviando...</> : 'Enviar solicitud de registro'}
          </button>
          <div style={{ textAlign:'center',marginTop:'1rem',fontSize:13,color:'#888' }}>
            ¿Ya tienes cuenta?{' '}
            <span style={{ color:'#c9991a',cursor:'pointer',fontWeight:500 }} onClick={() => navigate('/login')}>Iniciar sesión</span>
          </div>
        </div>
      </div>
    </div>
  )
}
