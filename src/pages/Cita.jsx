import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const TURNOS = [{h:'09:30',fin:'11:00',lbl:'T1'},{h:'11:00',fin:'12:30',lbl:'T2'},{h:'14:30',fin:'16:00',lbl:'T3'},{h:'16:00',fin:'17:30',lbl:'T4'}]
const TRAMITES = ['Versión','Reconocimiento del lugar','Seguimiento del caso']

function fmtISO(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
function fmtDisplay(s) { if(!s)return''; const[y,m,d]=s.split('-'); return `${d}/${m}/${y}` }
function initials(n) { return n.split(' ').map(x=>x[0]).filter(Boolean).slice(0,2).join('').toUpperCase() }

export default function Cita() {
  const navigate = useNavigate()
  const today = new Date()
  const todayStr = fmtISO(today)
  const maxDate = new Date(today); maxDate.setMonth(maxDate.getMonth()+3)
  const maxStr = fmtISO(maxDate)

  const [step, setStep] = useState(1)
  const [agents, setAgents] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [citasPendientes, setCitasPendientes] = useState([])
  const [form, setForm] = useState({ inv: '09010182', nombre: '', tel: '', tramite: '', agente: null, fecha: null, hora: null })
  const [calY, setCalY] = useState(today.getFullYear())
  const [calM, setCalM] = useState(today.getMonth())
  const [ticket, setTicket] = useState(null)
  const [ticketAt, setTicketAt] = useState(null)
  const [timerDisplay, setTimerDisplay] = useState('30:00')
  const [timerExpired, setTimerExpired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    loadAgents()
    loadBloqueos()
    loadCitasPendientes()
  }, [])

  useEffect(() => {
    if (form.agente) loadBloqueos()
  }, [form.agente])

  async function loadAgents() {
    const { data } = await supabase.from('profiles').select('id, full_name, cedula').eq('status','approved').eq('is_active',true).eq('role','agent')
    setAgents(data || [])
  }

  async function loadBloqueos() {
    const { data } = await supabase.from('disponibilidad_bloqueada').select('*')
    setBloqueos(data || [])
  }

  async function loadCitasPendientes() {
    const { data } = await supabase.from('citas').select('num_investigacion, agente_id, fecha, hora_inicio, status').eq('status','pending')
    setCitasPendientes(data || [])
  }

  function isDayBlocked(agentId, dateStr) {
    return bloqueos.some(b => b.agente_id === agentId && b.fecha === dateStr && b.tipo === 'dia_completo')
  }

  function isTurnoBlocked(agentId, dateStr, hora) {
    if (isDayBlocked(agentId, dateStr)) return true
    const turnosBlocked = bloqueos.filter(b => b.agente_id === agentId && b.fecha === dateStr && b.tipo === 'turno').flatMap(b => b.turnos || [])
    if (turnosBlocked.includes(hora)) return true
    return citasPendientes.some(c => c.agente_id === agentId && c.fecha === dateStr && c.hora_inicio === hora)
  }

  useEffect(() => {
    if (!ticketAt) return
    timerRef.current = setInterval(() => {
      const rem = 1800 - Math.floor((Date.now() - ticketAt) / 1000)
      if (rem <= 0) { setTimerExpired(true); setTimerDisplay('00:00'); clearInterval(timerRef.current); return }
      setTimerDisplay(String(Math.floor(rem/60)).padStart(2,'0')+':'+String(rem%60).padStart(2,'0'))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [ticketAt])

  function renderProg() {
    const steps = ['Datos','Agente','Fecha','Turno','Confirmar']
    return (
      <div className="prog-bar">
        {steps.map((s, i) => {
          const n = i+1
          const cls = n < step ? 'done' : n === step ? 'active' : ''
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length-1 ? 1 : 0 }}>
              <div className="prog-step">
                <div className={`prog-circle ${cls}`}>{n < step ? '✓' : n}</div>
                <div className={`prog-label ${cls}`}>{s}</div>
              </div>
              {i < steps.length-1 && <div className={`prog-line ${n < step ? 'done' : ''}`}></div>}
            </div>
          )
        })}
      </div>
    )
  }

  function renderCal() {
    const first = new Date(calY, calM, 1).getDay()
    const days = new Date(calY, calM+1, 0).getDate()
    const cells = []
    for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} className="cal-d cal-empty">x</div>)
    for (let d = 1; d <= days; d++) {
      const ds = `${calY}-${String(calM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const isPast = ds < todayStr, isOver = ds > maxStr
      const isBlocked = form.agente && isDayBlocked(form.agente, ds)
      const isSel = form.fecha === ds, isToday = ds === todayStr
      let cls = 'cal-d'
      if (isPast || isOver) cls += ' cal-past'
      else if (isBlocked) cls += ' cal-blocked'
      else if (isSel) cls += ' cal-selected'
      else if (isToday) cls += ' cal-today'
      cells.push(
        <div key={d} className={cls}
          onClick={!isPast && !isOver && !isBlocked ? () => setForm(f => ({...f, fecha: ds, hora: null})) : undefined}>
          {isBlocked && !isPast && !isOver
            ? <span style={{fontSize:9,display:'block',lineHeight:1.2}}>{d}<br/>No disp.</span>
            : d}
        </div>
      )
    }
    return cells
  }

  async function confirmar() {
    setLoading(true)
    const ag = agents.find(a => a.id === form.agente)
    const code = 'TKT-' + Math.random().toString(36).substr(2,6).toUpperCase()
    const { error: err } = await supabase.from('citas').insert({
      num_investigacion: form.inv,
      nombre_usuario: form.nombre,
      telefono_usuario: form.tel,
      tipo_tramite: form.tramite,
      agente_id: form.agente,
      fecha: form.fecha,
      hora_inicio: form.hora,
      status: 'pending',
      ticket_code: code,
    })
    setLoading(false)
    if (err) { setError('Error al guardar la cita: ' + err.message); return }
    setTicket({ code, inv: form.inv, fecha: form.fecha, hora: form.hora, agente: ag?.full_name })
    setTicketAt(Date.now())
    await loadCitasPendientes()
    setStep(6)
  }

  async function cancelarCita() {
    if (!ticket) return
    await supabase.from('citas').update({ status: 'cancelled' }).eq('ticket_code', ticket.code)
    navigate('/')
  }

  const turno = TURNOS.find(t => t.h === form.hora)
  const agente = agents.find(a => a.id === form.agente)

  return (
    <div style={{ background: '#f8f6f0', minHeight: '100vh' }}>
      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="logo-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
        <button className="btn btn-gray btn-sm" onClick={() => navigate('/')}>← Inicio</button>
      </nav>

      <div className="wrap-md">
        {renderProg()}

        {step === 1 && (
          <div className="card">
            <h2 className="card-title" style={{fontSize:17,fontWeight:500,marginBottom:'.2rem'}}>Tus datos personales</h2>
            <p style={{fontSize:13,color:'#888',marginBottom:'1.25rem'}}>Completa la información para continuar</p>
            {error && <div className="err-msg show">{error}</div>}
            <div className="form-group">
              <label className="form-label">Número de investigación <span className="req">*</span></label>
              <input type="text" className="form-input" placeholder="Ej: 09010182-001"
                value={form.inv} onChange={e => setForm(f => ({...f, inv: e.target.value}))}
                style={{fontWeight:500}} />
              <div className="hint">Puedes editar o borrar el valor sugerido e ingresar el número de tu caso.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre completo <span className="req">*</span></label>
              <input type="text" className="form-input" placeholder="Tu nombre completo"
                value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teléfono <span className="req">*</span></label>
                <input type="text" className="form-input" placeholder="09XXXXXXXX" maxLength={10}
                  value={form.tel} onChange={e => setForm(f => ({...f, tel: e.target.value.replace(/\D/g,'').slice(0,10)}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de trámite <span className="req">*</span></label>
                <select className="form-select" value={form.tramite} onChange={e => setForm(f => ({...f, tramite: e.target.value}))}>
                  <option value="">Selecciona...</option>
                  {TRAMITES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="bottom-nav">
              <div></div>
              <button className="btn btn-gold" onClick={() => {
                if (!form.inv) { setError('Ingresa el número de investigación.'); return }
                if (!form.nombre.trim()) { setError('Ingresa tu nombre completo.'); return }
                if (!form.tel || form.tel.length < 9) { setError('Ingresa un teléfono válido.'); return }
                if (!form.tramite) { setError('Selecciona el tipo de trámite.'); return }
                const dup = citasPendientes.find(c => c.num_investigacion === form.inv)
                if (dup) { setError('Ya existe una cita vigente con ese número de investigación.'); return }
                setError(''); setStep(2)
              }}>Siguiente →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h2 style={{fontSize:17,fontWeight:500,marginBottom:'.2rem'}}>Selecciona un agente</h2>
            <p style={{fontSize:13,color:'#888',marginBottom:'1.25rem'}}>Elige el investigador que atenderá tu caso</p>
            {error && <div className="err-msg show">{error}</div>}
            {agents.length === 0 && <div style={{textAlign:'center',padding:'2rem',color:'#bbb',fontSize:14}}>No hay agentes disponibles en este momento.</div>}
            <div className="agent-list">
              {agents.map(a => (
                <div key={a.id} className={`agent-item-sel${form.agente === a.id ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({...f, agente: a.id, fecha: null, hora: null}))}>
                  <div className="agent-ava">{initials(a.full_name)}</div>
                  <div><div style={{fontSize:14,fontWeight:500}}>{a.full_name}</div></div>
                  <div className={`check-dot${form.agente === a.id ? ' on' : ''}`}>
                    {form.agente === a.id && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </div>
              ))}
            </div>
            <div className="bottom-nav">
              <button className="btn btn-gray" onClick={() => {setError('');setStep(1)}}>← Atrás</button>
              <button className="btn btn-gold" onClick={() => { if (!form.agente){setError('Selecciona un agente.');return} setError('');setStep(3) }}>Siguiente →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h2 style={{fontSize:17,fontWeight:500,marginBottom:'.2rem'}}>Elige la fecha</h2>
            <p style={{fontSize:13,color:'#888',marginBottom:'1.25rem'}}>Selecciona un día disponible en el calendario</p>
            {error && <div className="err-msg show">{error}</div>}
            <div className="cal-nav-row">
              <button className="cal-nav-btn" onClick={() => { let m=calM-1,y=calY; if(m<0){m=11;y--} setCalM(m);setCalY(y) }}>&#8249;</button>
              <span className="cal-month-lbl">{MESES[calM]} {calY}</span>
              <button className="cal-nav-btn" onClick={() => { let m=calM+1,y=calY; if(m>11){m=0;y++} setCalM(m);setCalY(y) }}>&#8250;</button>
            </div>
            <div className="cal-grid">
              {DIAS.map(d => <div key={d} className="cal-dh">{d}</div>)}
              {renderCal()}
            </div>
            <div style={{display:'flex',gap:12,marginTop:'.6rem',flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#888'}}><div style={{width:12,height:12,background:'#f5f5f5',border:'1px solid #ddd',borderRadius:3}}></div>No disponible</div>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#888'}}><div style={{width:12,height:12,background:'#fdf6e3',border:'1.5px solid #c9991a',borderRadius:3}}></div>Seleccionado</div>
            </div>
            <div className="bottom-nav">
              <button className="btn btn-gray" onClick={() => {setError('');setStep(2)}}>← Atrás</button>
              <button className="btn btn-gold" onClick={() => { if (!form.fecha){setError('Selecciona una fecha.');return} setError('');setStep(4) }}>Siguiente →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card">
            <h2 style={{fontSize:17,fontWeight:500,marginBottom:'.2rem'}}>Selecciona el turno</h2>
            <p style={{fontSize:13,color:'#888',marginBottom:'1.25rem'}}>Fecha: <strong>{fmtDisplay(form.fecha)}</strong></p>
            {error && <div className="err-msg show">{error}</div>}
            <div className="turno-grid">
              {TURNOS.map(t => {
                const off = isTurnoBlocked(form.agente, form.fecha, t.h)
                return (
                  <div key={t.h} className={`turno-opt${form.hora===t.h?' selected':''}${off?' turno-off':''}`}
                    onClick={!off ? () => setForm(f => ({...f, hora: t.h})) : undefined}>
                    <div className="turno-tag">{t.lbl} — {t.h}</div>
                    <div className="turno-time">{t.h} – {t.fin}</div>
                    <div className={`turno-status${off?' off':''}`}>{off ? 'No disponible' : 'Disponible'}</div>
                  </div>
                )
              })}
            </div>
            <div className="bottom-nav">
              <button className="btn btn-gray" onClick={() => {setError('');setStep(3)}}>← Atrás</button>
              <button className="btn btn-gold" onClick={() => { if (!form.hora){setError('Selecciona un turno.');return} setError('');setStep(5) }}>Siguiente →</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="card">
            <h2 style={{fontSize:17,fontWeight:500,marginBottom:'.2rem'}}>Confirma tu cita</h2>
            <p style={{fontSize:13,color:'#888',marginBottom:'1.25rem'}}>Revisa los datos antes de finalizar</p>
            {error && <div className="err-msg show">{error}</div>}
            <div style={{background:'#f8f6f0',borderRadius:10,padding:'1rem',marginBottom:'1rem'}}>
              <table className="confirm-table">
                <tbody>
                  <tr><td>N° investigación</td><td>{form.inv}</td></tr>
                  <tr><td>Nombre</td><td>{form.nombre}</td></tr>
                  <tr><td>Teléfono</td><td>{form.tel}</td></tr>
                  <tr><td>Trámite</td><td>{form.tramite}</td></tr>
                  <tr><td>Agente</td><td>{agente?.full_name}</td></tr>
                  <tr><td>Fecha</td><td>{fmtDisplay(form.fecha)}</td></tr>
                  <tr><td>Turno</td><td>{turno?.h} – {turno?.fin}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="bottom-nav">
              <button className="btn btn-gray" onClick={() => {setError('');setStep(4)}}>← Atrás</button>
              <button className="btn btn-green" onClick={confirmar} disabled={loading}>
                {loading ? <><span className="spinner"></span> Guardando...</> : 'Confirmar cita'}
              </button>
            </div>
          </div>
        )}

        {step === 6 && ticket && (
          <div className="ticket">
            <div style={{width:52,height:52,background:'#fdf6e3',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto .75rem'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9991a" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div style={{fontSize:12,color:'#aaa',marginBottom:3}}>Código de tu cita</div>
            <div className="ticket-code">{ticket.code}</div>
            <div style={{fontSize:13,color:'#1a7040',fontWeight:500,marginBottom:'.75rem'}}>¡Tu cita fue agendada con éxito!</div>
            <div className="ticket-data">
              <div className="ticket-row"><span>Fecha</span><span>{fmtDisplay(ticket.fecha)}</span></div>
              <div className="ticket-row"><span>Hora</span><span>{ticket.hora} – {TURNOS.find(t=>t.h===ticket.hora)?.fin}</span></div>
              <div className="ticket-row"><span>N° investigación</span><span>{ticket.inv}</span></div>
              <div className="ticket-row"><span>Agente asignado</span><span>{ticket.agente}</span></div>
            </div>
            {!timerExpired ? (
              <>
                <div className="timer-box">
                  <div className="timer-label">Tiempo para editar o cancelar tu cita</div>
                  <div className="timer-val">{timerDisplay}</div>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:'.75rem'}}>
                  <button className="btn btn-outline btn-sm" style={{flex:1,justifyContent:'center'}} onClick={() => { setStep(1); setTicket(null); clearInterval(timerRef.current) }}>Editar cita</button>
                  <button className="btn btn-danger btn-sm" style={{flex:1,justifyContent:'center'}} onClick={cancelarCita}>Cancelar cita</button>
                </div>
              </>
            ) : (
              <div style={{fontSize:12,color:'#bbb',marginBottom:'.75rem',textAlign:'center'}}>El período de edición ha finalizado.</div>
            )}
            <button className="btn btn-gray btn-full" onClick={() => navigate('/')}>Volver al inicio</button>
          </div>
        )}
      </div>
    </div>
  )
}
