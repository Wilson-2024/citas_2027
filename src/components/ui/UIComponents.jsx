import { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

// ── Toast ──────────────────────────────────────────────────────────────────
const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-green-400" />,
  error:   <AlertCircle   className="w-5 h-5 text-red-400" />,
  info:    <Info           className="w-5 h-5 text-blue-400" />,
  warning: <AlertTriangle  className="w-5 h-5 text-amber-400" />,
}
const BG = {
  success: 'border-green-700/50 bg-green-950/80',
  error:   'border-red-700/50 bg-red-950/80',
  info:    'border-blue-700/50 bg-blue-950/80',
  warning: 'border-amber-700/50 bg-amber-950/80',
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg animate-slide-up ${BG[type]}`}>
      {ICONS[type]}
      <p className="font-body text-sm text-white flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── ToastContainer ─────────────────────────────────────────────────────────
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  )
}

// ── useToast hook ──────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return { toasts, addToast, removeToast }
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full ${sizes[size]} bg-navy-card border border-navy-lighter rounded-2xl shadow-2xl animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-navy-lighter">
            <h2 className="font-display text-gold text-lg">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-navy-lighter">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── ConfirmDialog ──────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="font-body text-slate-300 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">Cancelar</button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={danger ? 'btn-danger' : 'btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ── StatusBadge ────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pendiente',  cls: 'badge-pending' },
    done:      { label: 'Atendida',   cls: 'badge-done' },
    cancelled: { label: 'Cancelada',  cls: 'badge-cancelled' },
    approved:  { label: 'Aprobado',   cls: 'badge-done' },
    rejected:  { label: 'Rechazado',  cls: 'badge-cancelled' },
    active:    { label: 'Activo',     cls: 'badge-done' },
    inactive:  { label: 'Inactivo',   cls: 'badge-cancelled' },
  }
  const info = map[status] || { label: status, cls: 'badge-pending' }
  return <span className={info.cls}>{info.label}</span>
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-navy-lighter flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-500" />
        </div>
      )}
      <p className="font-display text-slate-300 text-lg mb-2">{title}</p>
      {description && <p className="font-body text-slate-500 text-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 'sm' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div className={`${s[size]} rounded-full border-2 border-navy-lighter border-t-gold animate-spin`} />
  )
}
