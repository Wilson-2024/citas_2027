import { useState, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isToday, isBefore,
  startOfDay, isSameDay, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/**
 * Props:
 * - selectedDate: Date | null
 * - onSelectDate: (date: Date) => void
 * - blockedDates: string[]   — fechas con TODAS las citas ocupadas (ISO)
 * - audienciaDates: string[] — fechas con audiencias registradas (ISO)
 * - disableWeekends: boolean
 */
export default function CalendarioInteractivo({
  selectedDate,
  onSelectDate,
  blockedDates = [],
  audienciaDates = [],
  disableWeekends = true,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const hoy = startOfDay(new Date())
  const start = startOfMonth(currentMonth)
  const end   = endOfMonth(currentMonth)
  const days  = eachDayOfInterval({ start, end })

  // Padding inicial para alinear con el día de la semana
  const startDow = getDay(start) // 0=domingo
  const paddingCells = Array(startDow).fill(null)

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1))
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1))

  const isBlocked     = (d) => blockedDates.some((b) => isSameDay(parseISO(b), d))
  const hasAudiencia  = (d) => audienciaDates.some((a) => isSameDay(parseISO(a), d))
  const isPast        = (d) => isBefore(d, hoy)
  const isWeekend     = (d) => { const dow = getDay(d); return dow === 0 || dow === 6 }
  const isDisabled    = (d) => isPast(d) || isBlocked(d) || (disableWeekends && isWeekend(d))

  const getDayStyle = (day) => {
    if (!day) return ''
    const disabled    = isDisabled(day)
    const audiencia   = hasAudiencia(day)
    const blocked     = isBlocked(day)
    const selected    = selectedDate && isSameDay(day, selectedDate)
    const today       = isToday(day)

    if (selected) {
      return 'bg-gold text-navy font-bold border-[3px] border-gold-light scale-110 shadow-gold'
    }
    if (disabled || blocked) {
      return 'text-slate-600 cursor-not-allowed bg-red-950/20 border border-red-900/30'
    }
    if (audiencia) {
      return 'text-amber-300 cursor-not-allowed bg-amber-950/20 border border-amber-800/30'
    }
    if (today) {
      return 'text-gold border-[2px] border-gold/60 hover:bg-gold/10 cursor-pointer'
    }
    return 'text-slate-200 border border-navy-lighter hover:border-gold/50 hover:bg-navy-lighter cursor-pointer'
  }

  return (
    <div className="card select-none">
      {/* Header del mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg text-slate-400 hover:text-gold hover:bg-navy-lighter transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h3 className="font-display text-gold text-lg capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>

        <button
          onClick={nextMonth}
          className="p-2 rounded-lg text-slate-400 hover:text-gold hover:bg-navy-lighter transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1 tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-1">
        {paddingCells.map((_, i) => <div key={`pad-${i}`} />)}

        {days.map((day) => {
          const disabled = isDisabled(day)
          return (
            <button
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => !disabled && onSelectDate(day)}
              className={`
                aspect-square flex items-center justify-center
                text-sm rounded-lg font-body transition-all duration-150
                ${getDayStyle(day)}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-navy-lighter">
        <LegendItem color="bg-green-600" label="Disponible" />
        <LegendItem color="bg-gold"      label="Seleccionado" />
        <LegendItem color="bg-amber-800" label="Audiencia" />
        <LegendItem color="bg-red-900"   label="Sin cupos" />
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-sm ${color}`} />
      <span className="text-xs text-slate-400 font-body">{label}</span>
    </div>
  )
}
