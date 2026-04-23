import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export default function Home() {
  const navigate = useNavigate()
  const qrRef = useRef(null)

  useEffect(() => {
    if (!qrRef.current || qrRef.current.children.length > 0) return
    const p = [1,1,1,1,1,1,1,0,0,1,0,1,1,1,1,1,1,0,0,1,0,1,1,1,1,1,0,0,1,1,0,1,1,1,0,0,0,1,1,0,0,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1,1,0,0,1,1,0,1,1,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,1,1,1,0,1,1,0,0,1]
    p.forEach(v => {
      const c = document.createElement('div')
      c.style.cssText = `border-radius:1px;background:${v ? '#1a1a1a' : '#fff'}`
      qrRef.current.appendChild(c)
    })
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(window.location.origin + '/cita').catch(() => {})
    showToast('Enlace copiado al portapapeles')
  }

  function copyQR() {
    showToast('QR copiado — pégalo en tu editor de imágenes')
  }

  function showToast(msg) {
    const t = document.getElementById('toast')
    if (!t) return
    t.textContent = msg
    t.classList.add('show')
    setTimeout(() => t.classList.remove('show'), 2200)
  }

  return (
    <div style={{ background: '#f8f6f0', minHeight: '100vh' }}>
      <div id="toast" className="toast"></div>

      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="logo-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')}>Agentes / Admin</button>
          <button className="btn btn-gold btn-sm" onClick={() => navigate('/cita')}>Solicitar cita</button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8dfc8', padding: '3rem 1.5rem 2.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#fdf6e3', color: '#a07a20', border: '1px solid #e8c97a', fontSize: '12px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 500 }}>
          Sistema de Agendamiento Digital
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 500, marginBottom: '.5rem' }}>
          Agenda tu cita<br /><span style={{ color: '#c9991a' }}>fácil y sin filas</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#666', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.7 }}>
          Reserva tu turno de atención desde cualquier dispositivo. Solo necesitas tu número de caso y unos pocos datos.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button onClick={() => navigate('/cita')} style={{ background: '#c9991a', color: '#fff', border: 'none', padding: '13px 26px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Solicitar una cita ahora
          </button>
          <button onClick={() => navigate('/login')} style={{ background: '#fff', color: '#1a7040', border: '1.5px solid #1a7040', padding: '13px 26px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
            Acceso agentes
          </button>
        </div>

        {/* QR BOX */}
        <div className="qr-box">
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '.9rem', textAlign: 'center' }}>Comparte el enlace directo para agendar</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="qr-img" ref={qrRef}></div>
            <div style={{ flex: 1 }}>
              <div style={{ background: '#f8f6f0', border: '1px solid #ddd', borderRadius: '7px', padding: '7px 10px', fontSize: '11px', color: '#666', marginBottom: '8px', wordBreak: 'break-all' }}>
                {window.location.origin}/cita
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={copyLink} style={{ flex: 1, padding: '7px 6px', borderRadius: '7px', fontSize: '11px', fontWeight: 500, border: '1px solid #e8c97a', background: '#fdf6e3', color: '#a07a20', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Copiar enlace
                </button>
                <button onClick={copyQR} style={{ flex: 1, padding: '7px 6px', borderRadius: '7px', fontSize: '11px', fontWeight: 500, border: 'none', background: '#1a7040', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
                  Copiar QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEPS */}
      <div style={{ padding: '2.5rem 1.5rem 3rem', maxWidth: '840px', margin: '0 auto' }}>
        <div className="sec-label">¿CÓMO FUNCIONA?</div>
        <div className="sec-title">Solo 3 pasos para tu cita</div>
        <div className="steps-grid">
          {[
            { n: 1, title: 'Ingresa tus datos', desc: 'Tu número de investigación, nombre completo, teléfono y el tipo de trámite que necesitas.' },
            { n: 2, title: 'Elige fecha y hora', desc: 'Selecciona el día y el turno disponible que mejor se ajuste a ti.' },
            { n: 3, title: 'Recibe la confirmación', desc: 'Al finalizar verás un mensaje con la fecha, hora y número de investigación de tu cita agendada.' },
          ].map(s => (
            <div key={s.n} className="step-card">
              <div className="step-num">{s.n}</div>
              <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{s.title}</h3>
              <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="home-footer">© 2027 <span>Agendamiento de Citas</span> — Sistema v2.0</div>
    </div>
  )
}
