import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const TURNOS_DATA = [{h:'09:30',fin:'11:00'},{h:'11:00',fin:'12:30'},{h:'14:30',fin:'16:00'},{h:'16:00',fin:'17:30'}]
const TM = {'09:30':'09:30–11:00','11:00':'11:00–12:30','14:30':'14:30–16:00','16:00':'16:00–17:30'}

function fmtDisplay(s) { if(!s)return''; const[y,m,d]=s.split('-'); return `${d}/${m}/${y}` }

export default function Agente() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const today = new Date()
  const todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0')
  const maxDate = new Date(today); maxDate.setMonth(maxDate.getMonth()+3)
  const maxStr = maxDate.getFullYear()+'-'+String(maxDate.getMonth()+1).padStart(2,'0')+'-'+String(maxDate.getDate()).padStart(2,'0')

  const [tab, setTab] = useState('citas')
  const [citas, setCitas] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [filter, setFilter] = useState('all')
  const [calY, setCalY] = useState(today.getFullYear())
  const [calM, setCalM] = useState(today.getMonth())
  const [showModal, setShowModal] = useState(false)
  const [bForm, setBForm] = useState({ fecha: todayStr, tipo: 'dia_completo', turnos: [], motivo: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { loadCitas(); loadBloqueos() }, [])

  useEffect(() => {
    if (!profile) return
    const channel = supabase.channel('agent-citas')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'citas', filter: `agente_id=eq.${profile.id}` },
        () => loadCitas())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  async function loadCitas() {
    if (!profile) return
    const { data } = await supabase.from('citas').select('*').eq('agente_id', profile.id).order('fecha', { ascending: false })
    setCitas(data || [])
  }

  async function loadBloqueos() {
    if (!profile) return
    const { data } = await supabase.from('disponibilidad_bloqueada').select('*').eq('agente_id', profile.id)
    setBloqueos(data || [])
  }

  async function atenderCita(id) {
    await supabase.from('citas').update({ status: 'done' }).eq('id', id)
    await loadCitas(); showToast('Cita marcada como atendida.')
  }

  async function cancelarCita(id) {
    await supabase.from('citas').update({ status: 'cancelled' }).eq('id', id)
    await loadCitas(); showToast('Cita cancelada.')
  }

  async function saveBloqueo() {
    if (!bForm.fecha) { showToast('Selecciona una fecha.'); return }
    if (bForm.tipo === 'turno' && bForm.turnos.length === 0) { showToast('Selecciona al menos un turno.'); return }
    setLoading(true)
    const { error } = await supabase.from('disponibilidad_bloqueada').insert({
      agente_id: profile.id,
      fecha: bForm.fecha,
      tipo: bForm.tipo,
      turnos: bForm.tipo === 'turno' ? bForm.turnos : [],
      motivo: bForm.motivo,
    })
    setLoading(false)
    if (error) { showToast('Error al guardar bloqueo.'); return }
    setShowModal(false); await loadBloqueos(); showToast('Bloqueo guardado correctamente.')
  }

  async function deleteBloqueo(id) {
    await supabase.from('disponibilidad_bloqueada').delete().eq('id', id)
    await loadBloqueos(); showToast('Bloqueo eliminado.')
  }

  const pendientes = citas.filter(c => c.status === 'pending')
  const filtered = filter === 'all' ? citas : citas.filter(c => c.status === filter)
  const SL = {pending:'Pendiente',done:'Atendida',cancelled:'Cancelada'}
  const BC = {pending:'badge-pending',done:'badge-done',cancelled:'badge-cancelled'}

  function renderCalendar() {
    const blocked = new Set(bloqueos.filter(b=>b.tipo==='dia_completo').map(b=>b.fecha))
    const partial = new Set(bloqueos.filter(b=>b.tipo==='turno'&&b.turnos?.length>0).map(b=>b.fecha))
    const first = new Date(calY, calM, 1).getDay()
    const days = new Date(calY, calM+1, 0).getDate()
    const cells = []
    for (let i=0;i<first;i++) cells.push(<div key={`e${i}`} className="cal-d cal-empty">x</div>)
    for (let d=1;d<=days;d++) {
      const ds = `${calY}-${String(calM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const isPast=ds<todayStr,isFull=blocked.has(ds),isPartial=partial.has(ds),isToday=ds===todayStr
      let cls='cal-d'
      if(isFull)cls+=' cal-blocked'
      else if(isPartial)cls+=' cal-partial' // amarillo
      else if(isPast)cls+=' cal-past'
      else if(isToday)cls+=' cal-today'
      cells.push(<div key={d} className={cls}>{isFull&&!isPast?<span style={{fontSize:9,display:'block',lineHeight:1.2}}>{d}<br/>No disp.</span>:isPartial&&!isPast?<span style={{fontSize:9,display:'block',lineHeight:1.2}}>{d}<br/>Parcial</span>:d}</div>)
    }
    return cells
  }

  function toggleTurno(h) {
    setBForm(f => ({ ...f, turnos: f.turnos.includes(h) ? f.turnos.filter(x=>x!==h) : [...f.turnos, h] }))
  }

  return (
    <div style={{ background: '#f8f6f0', minHeight: '100vh' }}>
      {toast && <div className="toast show">{toast}</div>}

      {pendientes.length > 0 && (
        <div className="alert-banner">
          <div className="alert-dot"></div>
          <span style={{fontSize:13,color:'#92600a',fontWeight:500,flex:1}}>
            Tienes <strong>{pendientes.length} cita{pendientes.length>1?'s':''} pendiente{pendientes.length>1?'s':''}</strong> de atención.
          </span>
          <span className="badge badge-pending">{pendientes.length}</span>
        </div>
      )}

      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="logo-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div className="rt-badge"><div className="rt-dot"></div>En línea</div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,fontWeight:500}}>{profile?.full_name}</div>
            <div style={{fontSize:11,color:'#aaa'}}>Agente investigador</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={async()=>{await signOut();navigate('/login')}}>Cerrar sesión</button>
        </div>
      </nav>

      <div className="wrap-lg">
        <div className="tabs">
          <button className={`tab-btn${tab==='citas'?' active':''}`} onClick={()=>setTab('citas')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Mis citas
            {pendientes.length > 0 && <span className="badge badge-pending">{pendientes.length}</span>}
          </button>
          <button className={`tab-btn${tab==='dispon'?' active':''}`} onClick={()=>setTab('dispon')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Mi disponibilidad
          </button>
        </div>

        {tab === 'citas' && (
          <div>
            <div className="filter-bar">
              {['all','pending','done','cancelled'].map(f => (
                <button key={f} className={`fbtn${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
                  {f==='all'?'Todas':f==='pending'?'Pendientes':f==='done'?'Atendidas':'Canceladas'}
                </button>
              ))}
            </div>
            {filtered.length === 0
              ? <div style={{textAlign:'center',padding:'2.5rem',color:'#bbb',fontSize:14}}>No hay citas en esta categoría.</div>
              : filtered.map(c => (
                <div key={c.id} className={`cita-card ${c.status}`}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:9}}>
                    <div><div style={{fontSize:12,color:'#c9991a',fontWeight:500}}>{c.num_investigacion}</div><div style={{fontSize:14,fontWeight:500}}>{c.nombre_usuario}</div></div>
                    <span className={`badge ${BC[c.status]}`}>{SL[c.status]}</span>
                  </div>
                  <div className="meta-grid">
                    <div className="meta-cell"><div className="meta-lbl">Fecha</div><div className="meta-val">{fmtDisplay(c.fecha)}</div></div>
                    <div className="meta-cell"><div className="meta-lbl">Turno</div><div className="meta-val">{c.hora_inicio}</div></div>
                    <div className="meta-cell"><div className="meta-lbl">Trámite</div><div className="meta-val" style={{fontSize:11}}>{c.tipo_tramite}</div></div>
                  </div>
                  <div style={{fontSize:12,color:'#888',marginBottom:9}}>Tel: {c.telefono_usuario}</div>
                  <div style={{display:'flex',gap:7}}>
                    {c.status === 'pending'
                      ? <><button className="btn btn-green btn-sm" onClick={()=>atenderCita(c.id)}>Marcar atendida</button><button className="btn btn-danger btn-sm" onClick={()=>cancelarCita(c.id)}>Cancelar</button></>
                      : <span style={{fontSize:12,color:'#bbb'}}>Sin acciones disponibles</span>}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab === 'dispon' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div>
                <div style={{fontSize:15,fontWeight:500}}>Mis bloqueos de disponibilidad</div>
                <div style={{fontSize:12,color:'#888',marginTop:2}}>Puedes bloquear hasta 3 meses adelante desde hoy</div>
              </div>
              <button className="btn btn-gold btn-sm" onClick={()=>{setBForm({fecha:todayStr,tipo:'dia_completo',turnos:[],motivo:''});setShowModal(true)}}>+ Agregar bloqueo</button>
            </div>

            <div className="bloqueo-grid">
              {bloqueos.length === 0
                ? <div style={{gridColumn:'1/-1',textAlign:'center',padding:'1.5rem',color:'#bbb',fontSize:13}}>Sin bloqueos registrados.</div>
                : bloqueos.map(b => (
                  <div key={b.id} className="bloqueo-item">
                    <div>
                      <div style={{fontSize:14,fontWeight:500}}>{fmtDisplay(b.fecha)}</div>
                      <div style={{fontSize:12,color:'#888',marginTop:2}}>{b.tipo==='dia_completo'?'Día completo':`Turnos: ${(b.turnos||[]).map(h=>TM[h]||h).join(', ')}`}</div>
                      {b.motivo && <div style={{fontSize:11,color:'#c9991a',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {b.motivo}
                      </div>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                      <span className={`badge ${b.tipo==='dia_completo'?'badge-cancelled':'badge-pending'}`}>{b.tipo==='dia_completo'?'Día completo':'Turnos'}</span>
                      <button className="btn btn-danger btn-sm" onClick={()=>deleteBloqueo(b.id)}>Eliminar</button>
                    </div>
                  </div>
                ))
              }
            </div>

            <div style={{background:'#fff',border:'1px solid #e8dfc8',borderRadius:12,padding:'1.1rem'}}>
              <div className="cal-nav-row">
                <button className="cal-nav-btn" onClick={()=>{let m=calM-1,y=calY;if(m<0){m=11;y--}setCalM(m);setCalY(y)}}>&#8249;</button>
                <span className="cal-month-lbl">{MESES[calM]} {calY}</span>
                <button className="cal-nav-btn" onClick={()=>{let m=calM+1,y=calY;if(m>11){m=0;y++}setCalM(m);setCalY(y)}}>&#8250;</button>
              </div>
              <div className="cal-grid">
                {DIAS.map(d=><div key={d} className="cal-dh">{d}</div>)}
                {renderCalendar()}
              </div>
              <div style={{display:'flex',gap:12,marginTop:'.6rem',flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#888'}}><div style={{width:12,height:12,background:'#f5f5f5',border:'1px solid #ddd',borderRadius:3}}></div>Día completo bloqueado</div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#888'}}><div style={{width:12,height:12,background:'#fff8e1',border:'1px solid #f5c96a',borderRadius:3}}></div>Turnos parciales</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target.className==='modal-overlay'&&setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Agregar bloqueo de disponibilidad</div>
            <p style={{fontSize:12,color:'#aaa',marginBottom:'1.25rem'}}>Solo tú verás el motivo. Los ciudadanos solo verán "No disponible".</p>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-input" min={todayStr} max={maxStr}
                value={bForm.fecha} onChange={e=>setBForm(f=>({...f,fecha:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">¿Qué deseas bloquear?</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {['dia_completo','turno'].map(tipo => (
                  <div key={tipo} onClick={()=>setBForm(f=>({...f,tipo,turnos:[]}))}
                    style={{border:`1.5px solid ${bForm.tipo===tipo?'#c9991a':'#ddd'}`,borderRadius:10,padding:'.75rem',cursor:'pointer',textAlign:'center',background:bForm.tipo===tipo?'#fdf6e3':'#fff',transition:'all .15s'}}>
                    <div style={{fontSize:12,fontWeight:500,color:bForm.tipo===tipo?'#a07a20':'#1a1a1a'}}>{tipo==='dia_completo'?'Día completo':'Turnos específicos'}</div>
                  </div>
                ))}
              </div>
            </div>
            {bForm.tipo === 'turno' && (
              <div className="form-group">
                <label className="form-label">Selecciona los turnos a bloquear</label>
                <div className="turnos-check-grid">
                  {TURNOS_DATA.map(t => (
                    <div key={t.h} className={`turno-check${bForm.turnos.includes(t.h)?' checked':''}`} onClick={()=>toggleTurno(t.h)}>
                      <div className="turno-check-box">{bForm.turnos.includes(t.h)&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div>
                      <div><div className="turno-check-tag">T{TURNOS_DATA.indexOf(t)+1}</div><div className="turno-check-time">{t.h} – {t.fin}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Motivo (opcional)</label>
              <input type="text" className="form-input" placeholder="Ej: Diligencia externa..."
                value={bForm.motivo} onChange={e=>setBForm(f=>({...f,motivo:e.target.value}))} />
              <div className="hint" style={{display:'flex',alignItems:'center',gap:4}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Solo visible para ti.
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-gray" style={{flex:1,justifyContent:'center',padding:10}} onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-gold" style={{flex:1,justifyContent:'center',padding:10}} onClick={saveBloqueo} disabled={loading}>
                {loading?<span className="spinner"></span>:'Guardar bloqueo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
