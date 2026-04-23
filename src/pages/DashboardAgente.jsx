import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, addDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Bell, Calendar, Scale, LogOut, CheckCircle2,
  XCircle, Clock, Plus, Trash2, ChevronLeft, ChevronRight,
  Phone, FileText, ToggleLeft, ToggleRight
} from 'lucide-react'
import {
  useToast, ToastContainer, Spinner, EmptyState,
  StatusBadge, Modal, ConfirmDialog
} from '../components/ui/UIComponents'
import { TURNOS, formatFechaES, formatFechaCorta } from '../utils/business'

export default function DashboardAgente() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  const [tab, setTab]       = useState('citas')
  const [citas, setCitas]   = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevasCitas, setNuevasCitas] = useState([])

  // Modal nuevo bloqueo
  const [modalBloqueo, setModalBloqueo]   = useState(false)
  const [formBloqueo, setFormBloqueo]     = useState({ fecha: '', tipo: 'dia_completo', hora_inicio: '', motivo: '' })
  const [savingBloqueo, setSavingBloqueo] = useState(false)

  // Confirm dialog
  const [confirmCita, setConfirmCita]     = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmBloqueo, setConfirmBloqueo] = useState(null)

  const hoy = format(new Date(), 'yyyy-MM-dd')

  const loadData = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    const [{ data: c }, { data: b }] = await Promise.all([
      // Agente solo ve SUS citas (RLS lo garantiza en BD, aquí filtramos también)
      supabase
        .from('citas')
        .select('*')
        .eq('agente_id', profile.id)
        .order('fecha', { ascending: true })
        .order('hora_inicio'),
      supabase
        .from('disponibilidad_bloqueada')
        .select('*')
        .eq('agente_id', profile.id)
        .gte('fecha', hoy)
        .order('fecha', { ascending: true }),
    ])
    setCitas(c || [])
    setBloqueos(b || [])

    // Alerta: citas pendientes (todas las futuras, no solo hoy)
    const pendientes = (c || []).filter(
      cita => cita.status === 'pending' && cita.fecha >= hoy
    )
    setNuevasCitas(pendientes)
    setLoading(false)
  }, [profile?.id, hoy])

  useEffect(() => { loadData() }, [loadData])

  // Realtime: se notifica cuando llega una cita nueva para este agente
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel(`agente-${profile.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'citas',
        filter: `agente_id=eq.${profile.id}`,
      }, () => loadData())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile?.id, loadData])

  // Actualizar estado de una cita
  const updateCita = async (id, status) => {
    const { error } = await supabase.from('citas').update({ status }).eq('id', id)
    if (error) addToast('Error al actualizar cita', 'error')
    else {
      addToast(status === 'done' ? 'Cita marcada como atendida ✓' : 'Cita cancelada', 'success')
      loadData()
    }
  }

  // Guardar bloqueo de disponibilidad
  const saveBloqueo = async (e) => {
    e.preventDefault()
    if (!formBloqueo.fecha) { addToast('Selecciona una fecha', 'error'); return }
    if (formBloqueo.fecha < hoy) { addToast('No puedes bloquear fechas pasadas', 'error'); return }
    if (formBloqueo.tipo === 'turno' && !formBloqueo.hora_inicio) {
      addToast('Selecciona el turno a bloquear', 'error'); return
    }
    setSavingBloqueo(true)
    const { error } = await supabase.from('disponibilidad_bloqueada').insert({
      agente_id:   profile.id,
      fecha:       formBloqueo.fecha,
      tipo:        formBloqueo.tipo,
      hora_inicio: formBloqueo.tipo === 'turno' ? formBloqueo.hora_inicio : null,
      motivo:      formBloqueo.motivo.trim() || null,
    })
    setSavingBloqueo(false)
    if (error) {
      const msg = error.message.includes('unique')
        ? 'Ya existe un bloqueo para esa fecha y turno'
        : 'Error al guardar: ' + error.message
      addToast(msg, 'error')
      return
    }
    addToast('Bloqueo registrado. Los ciudadanos no podrán agendar ese horario.', 'success')
    setModalBloqueo(false)
    setFormBloqueo({ fecha: '', tipo: 'dia_completo', hora_inicio: '', motivo: '' })
    loadData()
  }

  const deleteBloqueo = async (id) => {
    const { error } = await supabase.from('disponibilidad_bloqueada').delete().eq('id', id)
    if (error) addToast('Error al eliminar bloqueo', 'error')
    else { addToast('Bloqueo eliminado. Horario disponible nuevamente.', 'success'); loadData() }
  }

  const turnoLabel = (h) => TURNOS.find(t => t.inicio === h)?.label || h

  const pendientes = citas.filter(c => c.status === 'pending' && c.fecha >= hoy)
  const historial  = citas.filter(c => c.status !== 'pending' || c.fecha < hoy)

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-5"
        style={{ background: 'radial-gradient(ellipse at top right, #a07a20 0%, transparent 60%)' }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 border-b border-gold/10 bg-navy-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-gold" />
          <div>
            <p className="font-display text-gold text-sm leading-tight">Panel de Agente</p>
            <p className="font-body text-xs text-slate-500">{profile?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nuevasCitas.length > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {nuevasCitas.length}
              </span>
            </div>
          )}
          <button
            onClick={async () => { await signOut(); navigate('/') }}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-navy-lighter"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Alerta persistente — citas pendientes sin atender */}
      {nuevasCitas.length > 0 && (
        <div className="relative z-10 mx-4 mt-4 bg-amber-950/60 border-[2px] border-amber-600/60 rounded-xl p-3 animate-pulse-gold flex-shrink-0">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">
                {nuevasCitas.length} cita{nuevasCitas.length > 1 ? 's' : ''} pendiente{nuevasCitas.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Esta alerta desaparecerá cuando todas sean atendidas o canceladas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="relative z-10 flex border-b border-navy-lighter mx-4 mt-4 flex-shrink-0">
        {[
          { id: 'citas',        label: 'Mis Citas',       badge: pendientes.length },
          { id: 'disponibilidad', label: 'Mi Disponibilidad', badge: 0 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === t.id
                ? 'border-gold text-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="bg-amber-700 text-amber-100 text-xs rounded-full px-1.5 py-0.5 min-w-[1.2rem] text-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* ── TAB CITAS ── */}
            {tab === 'citas' && (
              <div className="space-y-4">
                {pendientes.length === 0 && historial.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Sin citas registradas"
                    description="Cuando un ciudadano agende una cita contigo, aparecerá aquí."
                  />
                ) : (
                  <>
                    {pendientes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold tracking-widest uppercase text-gold/60 mb-3">
                          Pendientes ({pendientes.length})
                        </p>
                        <div className="space-y-3">
                          {pendientes.map(cita => (
                            <CitaCard
                              key={cita.id}
                              cita={cita}
                              turnoLabel={turnoLabel}
                              onDone={() => { setConfirmCita(cita); setConfirmAction('done') }}
                              onCancel={() => { setConfirmCita(cita); setConfirmAction('cancelled') }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {historial.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold tracking-widest uppercase text-gold/60 mb-3">
                          Historial
                        </p>
                        <div className="space-y-3">
                          {historial.slice(0, 30).map(cita => (
                            <CitaCard key={cita.id} cita={cita} turnoLabel={turnoLabel} readonly />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── TAB DISPONIBILIDAD ── */}
            {tab === 'disponibilidad' && (
              <div className="space-y-4">
                <div className="bg-navy-card border border-navy-lighter rounded-xl p-4">
                  <p className="text-sm text-slate-300 font-body leading-relaxed">
                    Bloquea los días o turnos en los que <strong className="text-gold">no</strong> quieres recibir citas. 
                    Los ciudadanos verán esos horarios como no disponibles al agendar.
                  </p>
                </div>

                <button onClick={() => setModalBloqueo(true)} className="btn-gold w-full">
                  <Plus className="w-4 h-4" /> Agregar Bloqueo
                </button>

                {bloqueos.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Sin bloqueos registrados"
                    description="Todos tus turnos están disponibles para que los ciudadanos agenden."
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold tracking-widest uppercase text-gold/60">
                      Bloqueos activos ({bloqueos.length})
                    </p>
                    {bloqueos.map(b => (
                      <BloqueoCard
                        key={b.id}
                        bloqueo={b}
                        turnoLabel={turnoLabel}
                        onDelete={() => setConfirmBloqueo(b)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal — Nuevo bloqueo */}
      <Modal isOpen={modalBloqueo} onClose={() => setModalBloqueo(false)} title="Agregar Bloqueo de Disponibilidad">
        <form onSubmit={saveBloqueo} className="space-y-4">
          <div>
            <label className="input-label">Fecha *</label>
            <input
              type="date"
              className="input-field"
              value={formBloqueo.fecha}
              min={hoy}
              onChange={e => setFormBloqueo({ ...formBloqueo, fecha: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="input-label">Tipo de Bloqueo *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'dia_completo', label: '📅 Día Completo', desc: 'Bloquea todos los turnos del día' },
                { val: 'turno',        label: '🕐 Turno Específico', desc: 'Bloquea solo un horario' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setFormBloqueo({ ...formBloqueo, tipo: opt.val, hora_inicio: '' })}
                  className={`p-3 rounded-xl border-[2px] text-left transition-all ${
                    formBloqueo.tipo === opt.val
                      ? 'border-gold bg-gold/10'
                      : 'border-navy-lighter hover:border-gold/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {formBloqueo.tipo === 'turno' && (
            <div>
              <label className="input-label">Turno a Bloquear *</label>
              <div className="grid grid-cols-2 gap-2">
                {TURNOS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormBloqueo({ ...formBloqueo, hora_inicio: t.inicio })}
                    className={`p-3 rounded-lg border-[2px] text-left transition-all ${
                      formBloqueo.hora_inicio === t.inicio
                        ? 'border-gold bg-gold/10'
                        : 'border-navy-lighter hover:border-gold/40'
                    }`}
                  >
                    <p className="font-mono text-xs font-bold text-white">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Motivo (opcional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Capacitación, reunión interna..."
              value={formBloqueo.motivo}
              onChange={e => setFormBloqueo({ ...formBloqueo, motivo: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalBloqueo(false)} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={savingBloqueo} className="btn-gold flex-1">
              {savingBloqueo ? <Spinner /> : 'Guardar Bloqueo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm — Cambiar estado de cita */}
      <ConfirmDialog
        isOpen={!!confirmCita}
        onClose={() => { setConfirmCita(null); setConfirmAction(null) }}
        onConfirm={() => updateCita(confirmCita?.id, confirmAction)}
        title={confirmAction === 'done' ? 'Marcar como Atendida' : 'Cancelar Cita'}
        message={
          confirmAction === 'done'
            ? `¿Confirmas que atendiste la cita de ${confirmCita?.nombre_usuario}?`
            : `¿Cancelar la cita de ${confirmCita?.nombre_usuario}? Esta acción no se puede deshacer.`
        }
        confirmLabel={confirmAction === 'done' ? 'Sí, atendida' : 'Sí, cancelar'}
        danger={confirmAction === 'cancelled'}
      />

      {/* Confirm — Eliminar bloqueo */}
      <ConfirmDialog
        isOpen={!!confirmBloqueo}
        onClose={() => setConfirmBloqueo(null)}
        onConfirm={() => deleteBloqueo(confirmBloqueo?.id)}
        title="Eliminar Bloqueo"
        message={`¿Eliminar el bloqueo del ${formatFechaCorta(confirmBloqueo?.fecha || '')}? Los ciudadanos podrán agendar ese horario nuevamente.`}
        confirmLabel="Sí, eliminar"
        danger
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────
function CitaCard({ cita, turnoLabel, onDone, onCancel, readonly = false }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white text-sm">{cita.nombre_usuario}</p>
          <p className="font-mono text-xs text-gold/70">{cita.num_investigacion}</p>
        </div>
        <StatusBadge status={cita.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 flex-shrink-0" />{formatFechaCorta(cita.fecha)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 flex-shrink-0" />{turnoLabel(cita.hora_inicio)}
        </span>
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3 flex-shrink-0" />{cita.telefono_usuario}
        </span>
        <span className="flex items-center gap-1 col-span-2">
          <FileText className="w-3 h-3 flex-shrink-0" />{cita.tipo_tramite}
        </span>
      </div>
      {!readonly && (
        <div className="flex gap-2 pt-1 border-t border-navy-lighter">
          <button
            onClick={onDone}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg hover:bg-green-900/40 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" /> Atendida
          </button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg hover:bg-red-900/40 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

function BloqueoCard({ bloqueo, turnoLabel, onDelete }) {
  return (
    <div className={`card border-l-4 ${
      bloqueo.tipo === 'dia_completo' ? 'border-l-red-600' : 'border-l-amber-600'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-white">
            {bloqueo.tipo === 'dia_completo' ? '📅 Día Completo' : '🕐 Turno Específico'}
          </p>
          <p className="text-xs text-gold/70 mt-0.5">{formatFechaES(bloqueo.fecha)}</p>
          {bloqueo.tipo === 'turno' && bloqueo.hora_inicio && (
            <p className="font-mono text-xs text-amber-400 mt-1">{turnoLabel(bloqueo.hora_inicio)}</p>
          )}
          {bloqueo.motivo && (
            <p className="text-xs text-slate-500 mt-1">"{bloqueo.motivo}"</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
          title="Eliminar bloqueo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
