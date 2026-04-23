import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function fmtDisplay(s) { if(!s)return''; const[y,m,d]=s.split('-'); return `${d}/${m}/${y}` }
function initials(n) { return (n||'').split(' ').map(x=>x[0]).filter(Boolean).slice(0,2).join('').toUpperCase() }
const TM = {'09:30':'09:30–11:00','11:00':'11:00–12:30','14:30':'14:30–16:00','16:00':'16:00–17:30'}

export default function Admin() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [tab, setTab] = useState('agentes')
  const [agents, setAgents] = useState([])
  const [citas, setCitas] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [citaFilter, setCitaFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { loadAgents(); loadCitas(); loadBloqueos() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  async function loadAgents() {
    const { data } = await supabase.from('profiles').select('*').neq('role','admin').order('created_at', { ascending: false })
    setAgents(data || [])
  }

  async function loadCitas() {
    const { data } = await supabase.from('citas').select('*, profiles(full_name)').order('created_at', { ascending: false })
    setCitas(data || [])
  }

  async function loadBloqueos() {
    const { data } = await supabase.from('disponibilidad_bloqueada').select('*, profiles(full_name)').order('fecha')
    setBloqueos(data || [])
  }

  async function approveAgent(id) {
    await supabase.from('profiles').update({ status: 'approved', is_active: true }).eq('id', id)
    await loadAgents(); showToast('Agente aprobado y activado.')
  }

  async function toggleAgent(id, active) {
    await supabase.from('profiles').update({ is_active: !active }).eq('id', id)
    await loadAgents(); showToast(!active ? 'Agente activado.' : 'Agente desactivado.')
  }

  function askDeleteAgent(a) {
    const hasPending = citas.some(c => c.agente_id === a.id && c.status === 'pending')
    if (hasPending) { showToast('No puedes eliminar un agente con citas pendientes.'); return }
    setConfirm({ title: '¿Eliminar este agente?', sub: `Se eliminará la cuenta de <strong>${a.full_name}</strong>.`, onOk: async () => {
      await supabase.from('profiles').delete().eq('id', a.id)
      await loadAgents(); showToast('Agente eliminado.')
    }})
  }

  async function atenderCita(id) {
    await supabase.from('citas').update({ status: 'done' }).eq('id', id)
    await loadCitas(); showToast('Cita marcada como atendida.')
  }

  function askDeleteCita(id) {
    setConfirm({ title: '¿Eliminar esta cita?', sub: 'Esta acción no se puede deshacer.', onOk: async () => {
      await supabase.from('citas').delete().eq('id', id)
      await loadCitas(); showToast('Cita eliminada.')
    }})
  }

  const filtered = citaFilter === 'all' ? citas : citas.filter(c => c.status === citaFilter)
  const SL = {pending:'Pendiente',done:'Atendida',cancelled:'Cancelada'}
  const BC = {pending:'badge-pending',done:'badge-done',cancelled:'badge-cancelled'}

  return (
    <div style={{ background: '#f8f6f0', minHeight: '100vh' }}>
      {toast && <div className="toast show">{toast}</div>}

      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          <div className="logo-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,fontWeight:500}}>Administrador</div>
            <div style={{fontSize:11,color:'#aaa'}}>Control total del sistema</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={async()=>{await signOut();navigate('/login')}}>Cerrar sesión</button>
        </div>
      </nav>

      <div className="wrap-lg">
        <div className="tabs">
          <button className={`tab-btn${tab==='agentes'?' active':''}`} onClick={()=>setTab('agentes')}>Agentes</button>
          <button className={`tab-btn${tab==='citas'?' active':''}`} onClick={()=>{setTab('citas');loadCitas()}}>Todas las citas</button>
          <button className={`tab-btn${tab==='dispon'?' active':''}`} onClick={()=>{setTab('dispon');loadBloqueos()}}>Disponibilidad</button>
        </div>

        {tab === 'agentes' && (
          <div>
            <div style={{fontSize:15,fontWeight:500,marginBottom:'.2rem'}}>Gestión de agentes</div>
            <div style={{fontSize:12,color:'#888',marginBottom:'1rem'}}>Aprueba solicitudes, activa o desactiva cuentas</div>
            {agents.length === 0
              ? <div style={{textAlign:'center',padding:'2.5rem',color:'#bbb',fontSize:14}}>No hay agentes registrados.</div>
              : agents.map(a => (
                <div key={a.id} className="agent-item-card">
                  <div className="agent-ava">{initials(a.full_name)}</div>
                  <div style={{flex:1,minWidth:140}}>
                    <div style={{fontSize:14,fontWeight:500}}>{a.full_name}</div>
                    <div style={{fontSize:12,color:'#888',marginTop:2}}>Cédula: {a.cedula}</div>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                    <span className={`badge ${a.status==='approved'?'badge-approved':'badge-pendingagent'}`}>{a.status==='approved'?'Aprobado':'Pendiente'}</span>
                    <span className={`badge ${a.is_active?'badge-done':'badge-inactive'}`}>{a.is_active?'Activo':'Inactivo'}</span>
                    {a.status === 'pending' && <button className="btn btn-green btn-sm" onClick={()=>approveAgent(a.id)}>Aprobar</button>}
                    {a.status === 'approved' && <button className={`btn ${a.is_active?'btn-danger':'btn-outline'} btn-sm`} onClick={()=>toggleAgent(a.id,a.is_active)}>{a.is_active?'Desactivar':'Activar'}</button>}
                    <button className="btn btn-danger btn-sm" onClick={()=>askDeleteAgent(a)}>Eliminar</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab === 'citas' && (
          <div>
            <div style={{fontSize:15,fontWeight:500,marginBottom:'.2rem'}}>Todas las citas</div>
            <div style={{fontSize:12,color:'#888',marginBottom:'1rem'}}>Gestiona cualquier cita del sistema</div>
            <div className="filter-bar">
              {['all','pending','done','cancelled'].map(f => (
                <button key={f} className={`fbtn${citaFilter===f?' active':''}`} onClick={()=>setCitaFilter(f)}>
                  {f==='all'?'Todas':f==='pending'?'Pendientes':f==='done'?'Atendidas':'Canceladas'}
                </button>
              ))}
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>N° Investigación</th><th>Ciudadano</th><th>Trámite</th><th>Agente</th><th>Fecha / Turno</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={7} style={{textAlign:'center',padding:'2rem',color:'#bbb'}}>No hay citas en esta categoría.</td></tr>
                    : filtered.map(c => (
                      <tr key={c.id}>
                        <td style={{fontWeight:500,color:'#c9991a'}}>{c.num_investigacion}</td>
                        <td>{c.nombre_usuario}<br/><span style={{fontSize:11,color:'#aaa'}}>{c.telefono_usuario}</span></td>
                        <td>{c.tipo_tramite}</td>
                        <td>{c.profiles?.full_name || '—'}</td>
                        <td>{fmtDisplay(c.fecha)}<br/><span style={{fontSize:11,color:'#aaa'}}>{c.hora_inicio}</span></td>
                        <td><span className={`badge ${BC[c.status]}`}>{SL[c.status]}</span></td>
                        <td><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                          {c.status==='pending'&&<button className="btn btn-green btn-sm" onClick={()=>atenderCita(c.id)}>Atender</button>}
                          <button className="btn btn-danger btn-sm" onClick={()=>askDeleteCita(c.id)}>Eliminar</button>
                        </div></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'dispon' && (
          <div>
            <div style={{fontSize:15,fontWeight:500,marginBottom:'.2rem'}}>Bloqueos de disponibilidad</div>
            <div style={{fontSize:12,color:'#888',marginBottom:'1rem'}}>Vista de solo lectura — los agentes gestionan sus propios bloqueos</div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Agente</th><th>Fecha</th><th>Tipo</th><th>Turnos bloqueados</th><th>Motivo</th></tr></thead>
                <tbody>
                  {bloqueos.length === 0
                    ? <tr><td colSpan={5} style={{textAlign:'center',padding:'2rem',color:'#bbb'}}>No hay bloqueos registrados.</td></tr>
                    : bloqueos.map(b => (
                      <tr key={b.id}>
                        <td><strong>{b.profiles?.full_name || '—'}</strong></td>
                        <td>{fmtDisplay(b.fecha)}</td>
                        <td>{b.tipo==='dia_completo'?'Día completo':'Turnos específicos'}</td>
                        <td>{b.tipo==='dia_completo'
                          ? <span className="badge badge-cancelled" style={{fontSize:10}}>Día completo</span>
                          : (b.turnos||[]).map(h=><span key={h} className="badge badge-pending" style={{fontSize:10,marginRight:3}}>{TM[h]||h}</span>)
                        }</td>
                        <td style={{color:'#888',fontStyle:'italic'}}>{b.motivo||'—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {confirm && (
        <div className="modal-overlay" onClick={e=>e.target.className==='modal-overlay'&&setConfirm(null)}>
          <div className="modal-box" style={{maxWidth:360,textAlign:'center'}}>
            <div className="confirm-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <div style={{fontSize:15,fontWeight:500,marginBottom:'.35rem'}}>{confirm.title}</div>
            <div style={{fontSize:13,color:'#888',marginBottom:'1.25rem',lineHeight:1.6}} dangerouslySetInnerHTML={{__html:confirm.sub}}></div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-gray" style={{flex:1,justifyContent:'center'}} onClick={()=>setConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{flex:1,justifyContent:'center'}} onClick={()=>{confirm.onOk();setConfirm(null)}}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
