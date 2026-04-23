import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, hashPassword } from '../lib/supabase'

export default function RecuperarPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [cedula, setCedula] = useState('')
  const [profile, setProfile] = useState(null)
  const [selectedQ, setSelectedQ] = useState(null)
  const [answer, setAnswer] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [showP, setShowP] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function step1() {
    setError('')
    if (!cedula || cedula.length !== 10) { setError('Ingresa tu cédula de 10 dígitos.'); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, security_questions_set, security_q1, security_a1, security_q2, security_a2, security_q3, security_a3, security_q4, security_a4')
      .eq('cedula', cedula)
      .single()
    setLoading(false)
    if (err || !data) { setError('No se encontró ninguna cuenta con esa cédula.'); return }
    if (!data.security_questions_set) { setError('Esta cuenta no tiene preguntas de seguridad configuradas.'); return }
    setProfile(data); setStep(2)
  }

  function step2() {
    setError('')
    if (selectedQ === null) { setError('Selecciona una pregunta.'); return }
    if (!answer.trim()) { setError('Escribe tu respuesta.'); return }
    const keys = ['security_a1','security_a2','security_a3','security_a4']
    const correct = profile[keys[selectedQ]]
    if (answer.toLowerCase().trim() !== correct) { setError('Respuesta incorrecta. Intenta con otra pregunta.'); return }
    setStep(3)
  }

  async function step3() {
    setError('')
    if (!newPass || newPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (newPass !== newPass2) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const passHash = await hashPassword(newPass)
      const { error: err } = await supabase
        .from('profiles')
        .update({ password_hash: passHash })
        .eq('id', profile.id)
      if (err) { setError('Error al actualizar. Intenta de nuevo.'); setLoading(false); return }
      setStep(4)
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  const questions = profile ? [profile.security_q1, profile.security_q2, profile.security_q3, profile.security_q4] : []

  return (
    <div style={{ background:'#f8f6f0',minHeight:'100vh' }}>
      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="logo-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
        <button className="btn btn-gray btn-sm" onClick={() => navigate('/login')}>← Login</button>
      </nav>
      <div className="wrap">
        <div className="card">
          {step === 1 && <>
            <h2 style={{ fontSize:20,fontWeight:500,textAlign:'center',marginBottom:'.25rem' }}>Recuperar contraseña</h2>
            <p style={{ fontSize:13,color:'#888',textAlign:'center',marginBottom:'1.25rem' }}>Ingresa tu cédula para continuar</p>
            {error && <div className="err-msg show">{error}</div>}
            <div className="form-group">
              <label className="form-label">Número de cédula <span className="req">*</span></label>
              <input type="text" className="form-input" placeholder="0000000000" maxLength={10}
                value={cedula} onChange={e => setCedula(e.target.value.replace(/\D/g,'').slice(0,10))} />
            </div>
            <button className="btn btn-gold btn-full" onClick={step1} disabled={loading}>
              {loading ? <><span className="spinner"></span></> : 'Continuar'}
            </button>
          </>}
          {step === 2 && <>
            <h2 style={{ fontSize:20,fontWeight:500,textAlign:'center',marginBottom:'.25rem' }}>Pregunta de seguridad</h2>
            <p style={{ fontSize:13,color:'#888',textAlign:'center',marginBottom:'1rem',lineHeight:1.6 }}>Selecciona una y respóndela correctamente</p>
            <div className="info-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Solo necesitas responder <strong>&nbsp;1 pregunta&nbsp;</strong> correctamente.
            </div>
            {error && <div className="err-msg show">{error}</div>}
            <div className="form-group">
              {questions.map((q, i) => (
                <div key={i} onClick={() => { setSelectedQ(i); setAnswer('') }}
                  style={{ border:`1.5px solid ${selectedQ===i?'#c9991a':'#ddd'}`,borderRadius:10,padding:'.9rem 1rem',cursor:'pointer',marginBottom:8,display:'flex',alignItems:'center',gap:10,background:selectedQ===i?'#fdf6e3':'#fff',transition:'all .15s' }}>
                  <div style={{ width:16,height:16,borderRadius:'50%',border:`1.5px solid ${selectedQ===i?'#c9991a':'#ddd'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:selectedQ===i?'#c9991a':'transparent' }}>
                    {selectedQ===i && <div style={{ width:6,height:6,borderRadius:'50%',background:'#fff' }}></div>}
                  </div>
                  <span style={{ fontSize:13 }}>{q}</span>
                </div>
              ))}
            </div>
            {selectedQ !== null && (
              <div className="form-group">
                <label className="form-label">Tu respuesta <span className="req">*</span></label>
                <input type="text" className="form-input" placeholder="Escribe tu respuesta..."
                  value={answer} onChange={e => setAnswer(e.target.value)} />
              </div>
            )}
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-gray btn-sm" onClick={() => setStep(1)}>← Atrás</button>
              <button className="btn btn-gold" style={{ flex:1,justifyContent:'center' }} onClick={step2}>Verificar</button>
            </div>
          </>}
          {step === 3 && <>
            <h2 style={{ fontSize:20,fontWeight:500,textAlign:'center',marginBottom:'.25rem' }}>Nueva contraseña</h2>
            <p style={{ fontSize:13,color:'#888',textAlign:'center',marginBottom:'1.25rem' }}>Respuesta verificada. Define tu nueva contraseña.</p>
            {error && <div className="err-msg show">{error}</div>}
            <div className="form-group">
              <label className="form-label">Nueva contraseña <span className="req">*</span></label>
              <div className="pass-wrap">
                <input type={showP?'text':'password'} className="form-input" placeholder="Mínimo 6 caracteres"
                  style={{ paddingRight:38 }} value={newPass} onChange={e => setNewPass(e.target.value)} />
                <button className="eye-btn" onClick={() => setShowP(!showP)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña <span className="req">*</span></label>
              <input type="password" className="form-input" placeholder="Repite la contraseña"
                value={newPass2} onChange={e => setNewPass2(e.target.value)} />
            </div>
            <button className="btn btn-green btn-full" onClick={step3} disabled={loading}>
              {loading ? <><span className="spinner"></span></> : 'Guardar nueva contraseña'}
            </button>
          </>}
          {step === 4 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:64,height:64,background:'#eaf7ef',border:'2px solid #a8ddb8',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a7040" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize:20,fontWeight:500,marginBottom:'.25rem' }}>¡Contraseña actualizada!</h2>
              <p style={{ fontSize:13,color:'#888',marginBottom:'1.25rem' }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button className="btn btn-gold btn-full" onClick={() => navigate('/login')}>Ir al login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

