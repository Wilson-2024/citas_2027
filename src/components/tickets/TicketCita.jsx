import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, FileText, User, Phone, Calendar, Edit2, X, Hash } from 'lucide-react'
import { formatFechaES, segundosAMMSS, minutosRestantesEdicion, TURNOS } from '../../utils/business'
import { supabase } from '../../lib/supabase'

export default function TicketCita({ cita, onEdit, onCancel }) {
  const [segundos, setSegundos] = useState(() => minutosRestantesEdicion(cita.created_at))

  useEffect(() => {
    if (segundos <= 0) return
    const interval = setInterval(() => {
      setSegundos(minutosRestantesEdicion(cita.created_at))
    }, 1000)
    return () => clearInterval(interval)
  }, [cita.created_at])

  const turno = TURNOS.find((t) => t.inicio === cita.hora_inicio)
  const puedeEditar = segundos > 0

  return (
    <div className="card-gold max-w-md mx-auto animate-slide-up">
      {/* Header del ticket */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gold/20">
        <div className="w-12 h-12 rounded-full bg-siri-green/20 border-2 border-siri-green flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-siri-green-bright" />
        </div>
        <div>
          <p className="font-display text-gold text-lg">Cita Agendada</p>
          <p className="font-mono text-xs text-slate-400">#{cita.id?.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Datos */}
      <div className="space-y-3 mb-5">
        <TicketRow icon={Hash}      label="N° Investigación" value={cita.num_investigacion} mono />
        <TicketRow icon={User}      label="Solicitante"      value={cita.nombre_usuario} />
        <TicketRow icon={Phone}     label="Teléfono"         value={cita.telefono_usuario} />
        <TicketRow icon={FileText}  label="Trámite"          value={cita.tipo_tramite} />
        <TicketRow icon={Calendar}  label="Fecha"            value={formatFechaES(cita.fecha)} />
        <TicketRow icon={Clock}     label="Horario"          value={turno?.label || cita.hora_inicio} />
        {cita.profiles?.full_name && (
          <TicketRow icon={User} label="Agente asignado" value={cita.profiles.full_name} />
        )}
      </div>

      {/* Contador de edición */}
      {puedeEditar ? (
        <div className="bg-amber-950/40 border border-amber-700/40 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-300 font-semibold">Tiempo para editar</p>
              <p className="font-mono text-amber-400 text-lg font-bold">{segundosAMMSS(segundos)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-400">⏱ Tiempo de edición expirado</p>
        </div>
      )}

      {/* Acciones */}
      {(puedeEditar || onCancel) && (
        <div className="flex gap-3">
          {puedeEditar && onEdit && (
            <button onClick={onEdit} className="btn-gold flex-1 text-sm py-2.5">
              <Edit2 className="w-4 h-4" />
              Editar Cita
            </button>
          )}
          {puedeEditar && onCancel && (
            <button onClick={onCancel} className="btn-danger flex-1 text-sm py-2.5">
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center mt-4 font-body">
        Guarda el número de investigación para rastrear tu cita
      </p>
    </div>
  )
}

function TicketRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gold/60 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-500 font-body">{label}</p>
        <p className={`text-sm text-white font-semibold ${mono ? 'font-mono' : 'font-body'}`}>{value}</p>
      </div>
    </div>
  )
}
