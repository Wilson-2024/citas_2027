import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import {
  ArrowLeft, User, Phone, FileText, Hash, Users,
  ChevronRight, ChevronLeft, CheckCircle2
} from 'lucide-react'
import CalendarioInteractivo from '../components/calendar/CalendarioInteractivo'
import TicketCita from '../components/tickets/TicketCita'
import { useToast, ToastContainer, Spinner, EmptyState } from '../components/ui/UIComponents'
import {
  TURNOS, TIPOS_TRAMITE, PREFIJO_INVESTIGACION, formatFechaES
} from '../utils/business'

const STEPS = ['Datos', 'Agente', 'Fecha', 'Horario', 'Confirmar']

export default function CitaPage() {
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  const [step, setStep]           = useState(0)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [citaCreada, setCitaCreada] = useState(null)

  // Formulario — solo el prefijo viene por defecto, todo lo demás vacío
  const [form, setForm] = useState({
    num_investigacion: PREFIJO_INVESTIGACION,
    nombre_usuario:    '',
    telefono_usuario:  '',
    tipo_tramite:      '',
    agente_id:         '',
    fecha:             null,
    turno_id:          '',
  })

  // Datos de apoyo
  const [agentes, setAgentes]               = useState([])
  const [turnosBloqueados, setTurnosBloqueados] = useState(new Set())
  const [turnosOcupados, setTurnosOcupados]     = useState([])
  // FIX Bug #2: fechas reales de bloqueos del agente para el calendario
  const [fechasBloqueadas, setFechasBloqueadas] = useState([])
  const [fechasDiaCompleto, setFechasDiaCompleto] = useState([])

  // Cargar agentes aprobados y activos
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'agent')
      .eq('status', 'approved')
      .eq('is_active', true)
      .then(({ data }) => setAgentes(data || []))
  }, [])

  // Cuando cambia el agente, cargar TODAS sus fechas bloqueadas (para el calendario)
  useEffect(() => {
    if (!form.agente_id) return
    supabase
      .from('disponibilidad_bloqueada')
      .select('fecha, tipo, hora_inicio')
      .eq('agente_id', form.agente_id)
      .then(({ data }) => {
        const bloq = data || []
        // días completos bloqueados → marcar en calendario como rojo
        setFechasDiaCompleto(
          bloq.filter(b => b.tipo === 'dia_completo').map(b => b.fecha)
        )
        // fechas que tienen al menos un turno bloqueado (para referencia visual)
        setFechasBloqueadas(bloq.map(b => b.fecha))
      })
  }, [form.agente_id])

  // Cuando cambia agente + fecha, cargar disponibilidad de ese día
  useEffect(() => {
    if (!form.agente_id || !form.fecha) return
    const fechaStr = format(form.fecha, 'yyyy-MM-dd')
    loadDisponibilidad(form.agente_id, fechaStr)
  }, [form.agente_id, form.fecha])

  const loadDisponibilidad = async (agenteId, fecha) => {
    const [{ data: bloqueos }, { data: citas }] = await Promise.all([
      supabase
        .from('disponibilidad_bloqueada')
        .select('tipo, hora_inicio')
        .eq('agente_id', agenteId)
        .eq('fecha', fecha),
      supabase
        .from('citas')
        .select('hora_inicio')
        .eq('agente_id', agenteId)
        .eq('fecha', fecha)
        .eq('status', 'pending'),
    ])

    const bl = bloqueos || []
    const bloqueadoSet = new Set()

    // Si hay bloqueo de día completo, bloquear todos los turnos
    if (bl.some(b => b.tipo === 'dia_completo')) {
      TURNOS.forEach(t => bloqueadoSet.add(t.id))
    } else {
      // Bloquear turnos individuales designados por el agente
      bl.filter(b => b.tipo === 'turno').forEach(b => {
        const turno = TURNOS.find(t => t.inicio === b.hora_inicio)
        if (turno) bloqueadoSet.add(turno.id)
      })
    }

    setTurnosBloqueados(bloqueadoSet)
    setTurnosOcupados((citas || []).map(c => c.hora_inicio))
  }

  // Validar que no exista cita pendiente para ese número de investigación
  const validarNumInvestigacion = async (num) => {
    const { data } = await supabase
      .from('citas')
      .select('id')
      .eq('num_investigacion', num)
      .eq('status', 'pending')
      .limit(1)
    return !data || data.length === 0
  }

  const nextStep = async () => {
    if (step === 0) {
      if (!form.num_investigacion.trim()) {
        addToast('Ingresa el número de investigación', 'error'); return
      }
      if (!form.nombre_usuario.trim() || form.nombre_usuario.trim().length < 3) {
        addToast('Ingresa tu nombre completo (mín. 3 caracteres)', 'error'); return
      }
      if (!/^\d{7,15}$/.test(form.telefono_usuario.replace(/\s/g, ''))) {
        addToast('Teléfono inválido (7–15 dígitos)', 'error'); return
      }
      if (!form.tipo_tramite) {
        addToast('Selecciona el tipo de trámite', 'error'); return
      }
      setLoading(true)
      const libre = await validarNumInvestigacion(form.num_investigacion.trim())
      setLoading(false)
      if (!libre) {
        addToast(
          'Ya existe una cita PENDIENTE para ese número de investigación. Espera a que sea atendida o cancelada.',
          'error'
        )
        return
      }
    }
    if (step === 1 && !form.agente_id) {
      addToast('Selecciona un agente investigador', 'error'); return
    }
    if (step === 2 && !form.fecha) {
      addToast('Selecciona una fecha', 'error'); return
    }
    if (step === 3 && !form.turno_id) {
      addToast('Selecciona un horario disponible', 'error'); return
    }
    setStep(s => s + 1)
  }

  const prevStep = () => setStep(s => Math.max(0, s - 1))

  const handleSubmit = async () => {
    const turno = TURNOS.find(t => t.id === form.turno_id)
    if (!turno) { addToast('Error: turno no válido', 'error'); return }

    setLoading(true)
    const { data, error } = await supabase
      .from('citas')
      .insert({
        num_investigacion: form.num_investigacion.trim(),
        nombre_usuario:    form.nombre_usuario.trim(),
        telefono_usuario:  form.telefono_usuario.trim(),
        tipo_tramite:      form.tipo_tramite,
        agente_id:         form.agente_id,
        fecha:             format(form.fecha, 'yyyy-MM-dd'),
        hora_inicio:       turno.inicio,
        status:            'pending',
      })
      .select('*, profiles(full_name)')
      .single()

    setLoading(false)
    if (error) {
      addToast('Error al crear la cita: ' + error.message, 'error')
      return
    }
    setCitaCreada(data)
    setSuccess(true)
  }

  // ── Vista de ticket tras éxito ───────────────────────────────────────────
  if (success && citaCreada) {
    return (
      <PageShell>
        <div className="px-4 py-6">
          <h2 className="font-display text-gold text-xl mb-5 text-center">¡Cita Registrada!</h2>
          <TicketCita
            cita={citaCreada}
            onEdit={() => { setSuccess(false); setStep(0) }}
            onCancel={async () => {
              await supabase.from('citas').update({ status: 'cancelled' }).eq('id', citaCreada.id)
              navigate('/')
            }}
          />
          <button onClick={() => navigate('/')} className="btn-ghost w-full mt-4">
            Volver al Inicio
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Barra de progreso */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 mb-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-gold' : 'bg-navy-lighter'
            }`} />
          ))}
        </div>
        <p className="text-xs text-gold/60 font-body">
          Paso {step + 1} de {STEPS.length}:{' '}
          <span className="text-gold">{STEPS[step]}</span>
        </p>
      </div>

      {/* Contenido del paso actual */}
      <div className="px-4 py-5 space-y-4 animate-fade-in">
        {step === 0 && <StepDatos form={form} setForm={setForm} />}
        {step === 1 && <StepAgente agentes={agentes} form={form} setForm={setForm} />}
        {step === 2 && (
          <StepFecha
            form={form}
            setForm={setForm}
            fechasDiaCompleto={fechasDiaCompleto}
          />
        )}
        {step === 3 && (
          <StepHorario
            form={form}
            setForm={setForm}
            turnosBloqueados={turnosBloqueados}
            turnosOcupados={turnosOcupados}
          />
        )}
        {step === 4 && <StepConfirmar form={form} agentes={agentes} />}
      </div>

      {/* Navegación */}
      <div className="px-4 pb-6 flex gap-3">
        {step > 0 && (
          <button onClick={prevStep} className="btn-ghost flex-1 py-3">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        )}
        {step < 4 ? (
          <button onClick={nextStep} disabled={loading} className="btn-primary flex-1 py-3">
            {loading ? <Spinner /> : <><span>Siguiente</span><ChevronRight className="w-4 h-4" /></>}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="btn-gold flex-1 py-3">
            {loading ? <Spinner /> : <><CheckCircle2 className="w-4 h-4" /> Confirmar Cita</>}
          </button>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </PageShell>
  )
}

// ── Paso 1: Datos del ciudadano ────────────────────────────────────────────
function StepDatos({ form, setForm }) {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-gold text-lg">Datos de la Solicitud</h3>

      <div>
        <label className="input-label">N° de Investigación</label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="input-field pl-10 font-mono"
            value={form.num_investigacion}
            onChange={(e) => setForm({ ...form, num_investigacion: e.target.value })}
            placeholder={PREFIJO_INVESTIGACION}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Prefijo sugerido: <span className="font-mono text-gold/70">{PREFIJO_INVESTIGACION}</span> — puedes editarlo
        </p>
      </div>

      <div>
        <label className="input-label">Nombre Completo</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Tu nombre completo"
            value={form.nombre_usuario}
            onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="input-label">Teléfono de Contacto</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="tel"
            className="input-field pl-10 font-mono"
            placeholder="0991234567"
            value={form.telefono_usuario}
            onChange={(e) => setForm({ ...form, telefono_usuario: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="input-label">Tipo de Trámite</label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <select
            className="input-field pl-10 appearance-none"
            value={form.tipo_tramite}
            onChange={(e) => setForm({ ...form, tipo_tramite: e.target.value })}
          >
            <option value="">Selecciona el trámite...</option>
            {TIPOS_TRAMITE.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// ── Paso 2: Selección de agente ────────────────────────────────────────────
function StepAgente({ agentes, form, setForm }) {
  if (agentes.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sin agentes disponibles"
        description="No hay agentes activos en este momento. Intenta más tarde."
      />
    )
  }
  return (
    <div className="space-y-4">
      <h3 className="font-display text-gold text-lg">Selecciona un Agente</h3>
      <div className="space-y-2">
        {agentes.map(agente => (
          <button
            key={agente.id}
            onClick={() => setForm({ ...form, agente_id: agente.id, fecha: null, turno_id: '' })}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[2px] transition-all duration-150 text-left ${
              form.agente_id === agente.id
                ? 'border-gold bg-gold/10 shadow-gold'
                : 'border-navy-lighter bg-navy-card hover:border-gold/40'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-navy-lighter flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-gold/60" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{agente.full_name}</p>
              <p className="text-xs text-slate-500">Agente Investigador</p>
            </div>
            {form.agente_id === agente.id && (
              <CheckCircle2 className="w-5 h-5 text-gold ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Paso 3: Selección de fecha ─────────────────────────────────────────────
// FIX Bug #2: ahora recibe fechasDiaCompleto reales del agente seleccionado
function StepFecha({ form, setForm, fechasDiaCompleto }) {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-gold text-lg">Selecciona la Fecha</h3>
      <CalendarioInteractivo
        selectedDate={form.fecha}
        onSelectDate={(d) => setForm({ ...form, fecha: d, turno_id: '' })}
        blockedDates={fechasDiaCompleto}
      />
    </div>
  )
}

// ── Paso 4: Selección de horario ───────────────────────────────────────────
function StepHorario({ form, setForm, turnosBloqueados, turnosOcupados }) {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-gold text-lg">Selecciona el Horario</h3>
      {form.fecha && (
        <p className="text-sm text-slate-400 font-body capitalize">
          {formatFechaES(form.fecha)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {TURNOS.map(turno => {
          const bloqueado = turnosBloqueados.has(turno.id)
          const ocupado   = turnosOcupados.includes(turno.inicio)
          const disabled  = bloqueado || ocupado
          const selected  = form.turno_id === turno.id

          return (
            <button
              key={turno.id}
              disabled={disabled}
              onClick={() => !disabled && setForm({ ...form, turno_id: turno.id })}
              className={`p-4 rounded-xl border-[2px] transition-all duration-150 text-left ${
                selected
                  ? 'border-gold bg-gold/15 shadow-gold'
                  : disabled
                  ? 'border-red-900/40 bg-red-950/20 cursor-not-allowed opacity-60'
                  : 'border-navy-lighter bg-navy-card hover:border-siri-green hover:bg-siri-green/10 cursor-pointer'
              }`}
            >
              <p className={`font-mono text-sm font-bold ${
                selected ? 'text-gold' : disabled ? 'text-red-400' : 'text-white'
              }`}>
                {turno.label}
              </p>
              <p className="text-xs mt-1 font-body">
                {disabled
                  ? (bloqueado ? '🔒 No disponible' : '❌ Ocupado')
                  : selected ? '✓ Seleccionado' : '✅ Disponible'}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Paso 5: Confirmación ───────────────────────────────────────────────────
function StepConfirmar({ form, agentes }) {
  const agente = agentes.find(a => a.id === form.agente_id)
  const turno  = TURNOS.find(t => t.id === form.turno_id)
  return (
    <div className="space-y-4">
      <h3 className="font-display text-gold text-lg">Confirmar Cita</h3>
      <div className="card space-y-3">
        <Row label="N° Investigación" value={form.num_investigacion} mono />
        <Row label="Nombre"           value={form.nombre_usuario} />
        <Row label="Teléfono"         value={form.telefono_usuario} />
        <Row label="Trámite"          value={form.tipo_tramite} />
        <Row label="Agente"           value={agente?.full_name} />
        <Row label="Fecha"            value={form.fecha ? formatFechaES(form.fecha) : ''} />
        <Row label="Horario"          value={turno?.label} />
      </div>
      <div className="bg-amber-950/30 border border-amber-700/30 rounded-lg p-3">
        <p className="text-xs text-amber-300 font-body">
          ⚠️ Tendrás 30 minutos para editar o cancelar la cita tras confirmarla.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-slate-500 font-body w-28 flex-shrink-0">{label}</span>
      <span className={`text-sm text-white font-semibold text-right ${mono ? 'font-mono' : 'font-body'}`}>
        {value}
      </span>
    </div>
  )
}

function PageShell({ children }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-5"
        style={{ background: 'radial-gradient(ellipse at bottom right, #155a34 0%, transparent 60%)' }}
      />
      <div className="relative z-10 flex items-center gap-3 px-4 py-4 border-b border-gold/10 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-gold transition-colors rounded-lg hover:bg-navy-lighter"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-display text-gold text-lg">Solicitar Cita</p>
          <p className="font-body text-xs text-slate-500 tracking-wider uppercase">Sistema SIRI</p>
        </div>
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </div>
  )
}
