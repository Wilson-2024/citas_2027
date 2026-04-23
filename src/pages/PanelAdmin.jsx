import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Scale, LogOut, Users, Calendar, Shield,
  CheckCircle2, XCircle, Trash2, ToggleLeft, ToggleRight,
  Search, RefreshCw, Edit2, Save, Lock
} from 'lucide-react'
import {
  useToast, ToastContainer, Spinner, EmptyState,
  StatusBadge, Modal, ConfirmDialog
} from '../components/ui/UIComponents'
import { formatFechaCorta, TURNOS } from '../utils/business'

export default function PanelAdmin() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  const [tab, setTab]           = useState('agentes')
  const [agentes, setAgentes]   = useState([])
  const [citas, setCitas]       = useState([])
  // Admin solo VE los bloqueos (no los crea ni elimina — eso es del agente)
  const [bloqueos, setBloqueos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [confirmData, setConfirmData] = useState(null)
  const [editCita, setEditCita]       = useState(null)

  const hoy = new Date().toISOString().slice(0, 10)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [{ data: ag }, { data: ci }, { data: bl }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase
        .from('citas')
        .select('*, profiles(full_name)')
        .order('fecha', { ascending: false }),
      supabase
        .from('disponibilidad_bloqueada')
        .select('*, profiles(full_name)')
        .order('fecha', { ascending: false }),
    ])
    setAgentes(ag || [])
    setCitas(ci || [])
    setBloqueos(bl || [])
    setLoading(false)
  }, [])

  // Realtime para el admin
  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disponibilidad_bloqueada' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadAll])

  // ── Agentes ───────────────────────────────────────────────────────────────
  const approveAgent = async (id) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'approved', is_active: true })
      .eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Agente aprobado y activado ✓', 'success'); loadAll() }
  }

  const rejectAgent = async (id) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'pending', is_active: false })
      .eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Solicitud rechazada', 'success'); loadAll() }
  }

  const toggleActive = async (agent) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !agent.is_active })
      .eq('id', agent.id)
    if (error) addToast('Error: ' + error.message, 'error')
    else {
      addToast(agent.is_active ? 'Agente desactivado' : 'Agente activado ✓', 'success')
      loadAll()
    }
  }

  // Borrar perfil con registro erróneo
  const deleteProfile = async (id) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) addToast('Error al eliminar: ' + error.message, 'error')
    else { addToast('Perfil eliminado del sistema', 'success'); loadAll() }
  }

  // ── Citas ─────────────────────────────────────────────────────────────────
  const updateCitaStatus = async (id, status) => {
    const { error } = await supabase.from('citas').update({ status }).eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Cita actualizada ✓', 'success'); loadAll() }
  }

  const deleteCita = async (id) => {
    const { error } = await supabase.from('citas').delete().eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Cita eliminada ✓', 'success'); loadAll() }
  }

  const saveCita = async () => {
    const { id, profiles: _p, created_at: _c, ...fields } = editCita
    const { error } = await supabase.from('citas').update(fields).eq('id', id)
    if (error) addToast('Error: ' + error.message, 'error')
    else { addToast('Cita guardada ✓', 'success'); setEditCita(null); loadAll() }
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  const q = searchTerm.toLowerCase()
  const filtAgentes  = agentes.filter(a =>
    a.full_name?.toLowerCase().includes(q) || a.cedula?.includes(searchTerm)
  )
  const filtCitas    = citas.filter(c =>
    c.nombre_usuario?.toLowerCase().includes(q) ||
    c.num_investigacion?.toLowerCase().includes(q) ||
    c.profiles?.full_name?.toLowerCase().includes(q)
  )
  const filtBloqueos = bloqueos.filter(b =>
    b.profiles?.full_name?.toLowerCase().includes(q) ||
    b.fecha?.includes(searchTerm)
  )

  const turnoLabel     = (h) => TURNOS.find(t => t.inicio === h)?.label || h
  const pendingAgents  = agentes.filter(a => a.status === 'pending').length
  const pendingCitas   = citas.filter(c => c.status === 'pending').length

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-5"
        style={{ background: 'radial-gradient(ellipse at top, #a07a20 0%, transparent 50%)' }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 border-b border-gold/10 bg-navy-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gold" />
          <div>
            <p className="font-display text-gold text-sm leading-tight">Panel Administrativo</p>
            <p className="font-body text-xs text-slate-500">{profile?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="p-2 text-slate-400 hover:text-gold transition-colors rounded-lg hover:bg-navy-lighter"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/') }}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-navy-lighter"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Stats rápidas */}
      <div className="relative z-10 grid grid-cols-3 gap-3 px-4 pt-4 flex-shrink-0">
        <StatCard label="Ag. Pendientes" value={pendingAgents}   color="text-amber-400" />
        <StatCard label="Citas Pend."    value={pendingCitas}    color="text-blue-400" />
        <StatCard label="Bloqueos"       value={bloqueos.length} color="text-purple-400" />
      </div>

      {/* Búsqueda */}
      <div className="relative z-10 px-4 pt-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="input-field pl-10 text-sm"
            placeholder="Buscar por nombre, cédula o N° investigación..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 flex border-b border-navy-lighter mx-4 mt-3 flex-shrink-0">
        {[
          { id: 'agentes',  label: 'Agentes',      badge: pendingAgents },
          { id: 'citas',    label: 'Citas',         badge: pendingCitas },
          { id: 'bloqueos', label: 'Disponibilidad', badge: 0 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              tab === t.id
                ? 'border-gold text-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="bg-red-700 text-white text-xs rounded-full px-1.5 min-w-[1.2rem] text-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* ── TAB AGENTES ── */}
            {tab === 'agentes' && (
              filtAgentes.length === 0
                ? <EmptyState icon={Users} title="Sin resultados" />
                : filtAgentes.map(agent => (
                  <div key={agent.id} className="card space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white text-sm">{agent.full_name}</p>
                        <p className="font-mono text-xs text-slate-400">CI: {agent.cedula}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {agent.role === 'admin' ? '👑 Administrador' : '🔍 Agente Investigador'}
                        </p>
                      </div>
                      <StatusBadge status={
                        agent.status === 'approved' && agent.is_active ? 'approved'
                        : agent.status === 'approved' && !agent.is_active ? 'inactive'
                        : agent.status
                      } />
                    </div>

                    {agent.role !== 'admin' && (
                      <div className="flex gap-2 flex-wrap pt-1 border-t border-navy-lighter">
                        {/* Aprobar / rechazar agentes pendientes */}
                        {agent.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveAgent(agent.id)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border-[2px] font-semibold text-green-400 border-green-700/50 hover:bg-green-900/20 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                            </button>
                            <button
                              onClick={() => setConfirmData({
                                title: 'Rechazar Solicitud',
                                message: `¿Rechazar la solicitud de ${agent.full_name}?`,
                                onConfirm: () => rejectAgent(agent.id),
                                danger: true, confirmLabel: 'Rechazar',
                              })}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border-[2px] font-semibold text-red-400 border-red-700/50 hover:bg-red-900/20 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Rechazar
                            </button>
                          </>
                        )}

                        {/* Activar / desactivar agentes aprobados */}
                        {agent.status === 'approved' && (
                          <button
                            onClick={() => setConfirmData({
                              title: agent.is_active ? 'Desactivar Agente' : 'Activar Agente',
                              message: `¿${agent.is_active ? 'Desactivar' : 'Activar'} la cuenta de ${agent.full_name}?`,
                              onConfirm: () => toggleActive(agent),
                              danger: agent.is_active,
                              confirmLabel: agent.is_active ? 'Desactivar' : 'Activar',
                            })}
                            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border-[2px] font-semibold transition-colors ${
                              agent.is_active
                                ? 'text-red-400 border-red-700/50 hover:bg-red-900/20'
                                : 'text-green-400 border-green-700/50 hover:bg-green-900/20'
                            }`}
                          >
                            {agent.is_active
                              ? <><ToggleRight className="w-4 h-4" /> Desactivar</>
                              : <><ToggleLeft  className="w-4 h-4" /> Activar</>}
                          </button>
                        )}

                        {/* Eliminar perfil erróneo */}
                        <button
                          onClick={() => setConfirmData({
                            title: 'Eliminar Perfil',
                            message: `¿Eliminar permanentemente el perfil de ${agent.full_name}? Se borrarán también todas sus citas y bloqueos. Úsalo solo si el registro fue un error.`,
                            onConfirm: () => deleteProfile(agent.id),
                            danger: true, confirmLabel: 'Eliminar permanentemente',
                          })}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border-[2px] font-semibold text-red-400 border-red-700/30 hover:bg-red-900/20 transition-colors ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))
            )}

            {/* ── TAB CITAS ── */}
            {tab === 'citas' && (
              filtCitas.length === 0
                ? <EmptyState icon={Calendar} title="Sin resultados" />
                : filtCitas.map(cita => (
                  <div key={cita.id} className="card space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white text-sm">{cita.nombre_usuario}</p>
                        <p className="font-mono text-xs text-gold/70">{cita.num_investigacion}</p>
                        <p className="text-xs text-slate-400">
                          Agente: {cita.profiles?.full_name || '—'}
                        </p>
                      </div>
                      <StatusBadge status={cita.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatFechaCorta(cita.fecha)} · {turnoLabel(cita.hora_inicio)} · {cita.tipo_tramite}
                    </p>
                    <div className="flex gap-2 pt-1 border-t border-navy-lighter flex-wrap">
                      <button
                        onClick={() => setEditCita({ ...cita })}
                        className="flex items-center gap-1 text-xs text-blue-400 px-2 py-1 rounded border border-blue-800/40 hover:bg-blue-900/20 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      {cita.status === 'pending' && (
                        <button
                          onClick={() => updateCitaStatus(cita.id, 'done')}
                          className="flex items-center gap-1 text-xs text-green-400 px-2 py-1 rounded border border-green-800/40 hover:bg-green-900/20 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Atendida
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmData({
                          title: 'Eliminar Cita',
                          message: `¿Eliminar la cita de ${cita.nombre_usuario}? Esta acción es permanente.`,
                          onConfirm: () => deleteCita(cita.id),
                          danger: true, confirmLabel: 'Eliminar',
                        })}
                        className="flex items-center gap-1 text-xs text-red-400 px-2 py-1 rounded border border-red-800/40 hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))
            )}

            {/* ── TAB DISPONIBILIDAD (solo lectura para admin) ── */}
            {tab === 'bloqueos' && (
              <div className="space-y-3">
                {/* Aviso: admin solo consulta, no modifica */}
                <div className="bg-navy-card border border-gold/20 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-gold/60 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 font-body leading-relaxed">
                      Los bloqueos de disponibilidad son gestionados exclusivamente por cada agente desde su dashboard.
                      Aquí puedes consultar el estado actual de todos los agentes.
                    </p>
                  </div>
                </div>

                {filtBloqueos.length === 0
                  ? <EmptyState
                      icon={Calendar}
                      title="Sin bloqueos registrados"
                      description="Ningún agente tiene horarios bloqueados actualmente."
                    />
                  : filtBloqueos.map(b => (
                    <div
                      key={b.id}
                      className={`card border-l-4 ${
                        b.tipo === 'dia_completo' ? 'border-l-red-600' : 'border-l-amber-600'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{b.profiles?.full_name}</p>
                      <p className="text-xs text-gold/70 mt-0.5">{formatFechaCorta(b.fecha)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {b.tipo === 'dia_completo'
                          ? '📅 Día completo bloqueado'
                          : `🕐 Turno bloqueado: ${turnoLabel(b.hora_inicio)}`}
                      </p>
                      {b.motivo && (
                        <p className="text-xs text-slate-500 mt-1 italic">"{b.motivo}"</p>
                      )}
                    </div>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal editar cita */}
      <Modal isOpen={!!editCita} onClose={() => setEditCita(null)} title="Editar Cita">
        {editCita && (
          <div className="space-y-4">
            <div>
              <label className="input-label">N° Investigación</label>
              <input
                className="input-field font-mono"
                value={editCita.num_investigacion}
                onChange={e => setEditCita({ ...editCita, num_investigacion: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Nombre del Ciudadano</label>
              <input
                className="input-field"
                value={editCita.nombre_usuario}
                onChange={e => setEditCita({ ...editCita, nombre_usuario: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Teléfono</label>
              <input
                className="input-field font-mono"
                value={editCita.telefono_usuario}
                onChange={e => setEditCita({ ...editCita, telefono_usuario: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Fecha</label>
                <input
                  type="date"
                  className="input-field"
                  value={editCita.fecha}
                  onChange={e => setEditCita({ ...editCita, fecha: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">Turno</label>
                <select
                  className="input-field"
                  value={editCita.hora_inicio}
                  onChange={e => setEditCita({ ...editCita, hora_inicio: e.target.value })}
                >
                  {TURNOS.map(t => (
                    <option key={t.id} value={t.inicio}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Estado</label>
              <select
                className="input-field"
                value={editCita.status}
                onChange={e => setEditCita({ ...editCita, status: e.target.value })}
              >
                <option value="pending">Pendiente</option>
                <option value="done">Atendida</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditCita(null)} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button onClick={saveCita} className="btn-gold flex-1">
                <Save className="w-4 h-4" /> Guardar Cambios
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm genérico */}
      <ConfirmDialog
        isOpen={!!confirmData}
        onClose={() => setConfirmData(null)}
        onConfirm={confirmData?.onConfirm}
        title={confirmData?.title}
        message={confirmData?.message}
        confirmLabel={confirmData?.confirmLabel}
        danger={confirmData?.danger}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card text-center py-3">
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
      <p className="font-body text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
