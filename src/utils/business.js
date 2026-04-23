import { parseISO, parse, addMinutes, isWithinInterval, format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Turnos disponibles para citas ──────────────────────────────────────────
export const TURNOS = [
  { id: 'T1', label: '09:30 – 11:00', inicio: '09:30', fin: '11:00' },
  { id: 'T2', label: '11:00 – 12:30', inicio: '11:00', fin: '12:30' },
  { id: 'T3', label: '14:30 – 16:00', inicio: '14:30', fin: '16:00' },
  { id: 'T4', label: '16:00 – 17:30', inicio: '16:00', fin: '17:30' },
]

// ── Prefijo institucional de investigación ────────────────────────────────
export const PREFIJO_INVESTIGACION = '09010182'

// ── Tipos de trámite ──────────────────────────────────────────────────────
export const TIPOS_TRAMITE = [
  'Denuncia Penal',
  'Seguimiento de Caso',
  'Entrega de Documentos',
  'Declaración Testimonial',
  'Revisión de Expediente',
  'Solicitud de Información',
  'Otro',
]

// ── Intervalo buffer para audiencias (minutos) ────────────────────────────
export const BUFFER_AUDIENCIA_MIN = 45

/**
 * Dado un array de audiencias (con campo `hora` en formato HH:mm),
 * retorna los IDs de turnos bloqueados.
 */
export function getTurnosBloqueadosPorAudiencias(audiencias = []) {
  const bloqueados = new Set()

  for (const audiencia of audiencias) {
    const baseDate = new Date(2000, 0, 1) // fecha ficticia para comparar horas
    const [h, m] = audiencia.hora.split(':').map(Number)
    const horaAudiencia = new Date(2000, 0, 1, h, m, 0)
    const buffStart = addMinutes(horaAudiencia, -BUFFER_AUDIENCIA_MIN)
    const buffEnd   = addMinutes(horaAudiencia,  BUFFER_AUDIENCIA_MIN)

    for (const turno of TURNOS) {
      const [ih, im] = turno.inicio.split(':').map(Number)
      const [fh, fm] = turno.fin.split(':').map(Number)
      const turnoStart = new Date(2000, 0, 1, ih, im, 0)
      const turnoEnd   = new Date(2000, 0, 1, fh, fm, 0)

      // Bloqueado si hay solapamiento entre [turnoStart, turnoEnd] y [buffStart, buffEnd]
      const overlap =
        turnoStart < buffEnd && turnoEnd > buffStart
      if (overlap) {
        bloqueados.add(turno.id)
      }
    }
  }

  return bloqueados
}

/**
 * Formatea una fecha en español
 */
export function formatFechaES(dateStr) {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

/**
 * Formatea fecha corta
 */
export function formatFechaCorta(dateStr) {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

/**
 * Valida cédula ecuatoriana de 10 dígitos
 */
export function validarCedula(cedula) {
  if (!/^\d{10}$/.test(cedula)) return false
  const provincia = parseInt(cedula.substring(0, 2))
  if (provincia < 1 || provincia > 24) return false

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let val = parseInt(cedula[i]) * coeficientes[i]
    if (val >= 10) val -= 9
    suma += val
  }
  const digitoVerificador = (10 - (suma % 10)) % 10
  return digitoVerificador === parseInt(cedula[9])
}

/**
 * Retorna los minutos restantes desde created_at hasta 30 min después
 */
export function minutosRestantesEdicion(createdAt) {
  const created = new Date(createdAt)
  const limite  = addMinutes(created, 30)
  const ahora   = new Date()
  const diff    = Math.max(0, Math.floor((limite - ahora) / 1000))
  return diff // segundos restantes
}

/**
 * Convierte segundos a MM:SS
 */
export function segundosAMMSS(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0')
  const s = (segundos % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
