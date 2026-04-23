import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Scale, ArrowLeft, User, Mail, Lock, CreditCard } from 'lucide-react'
import { useToast, ToastContainer, Spinner } from '../components/ui/UIComponents'
import { validarCedula } from '../utils/business'

// ── Login ──────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  // FIX Bug #1: redirección manejada por AuthRedirect en App.jsx
  // Aquí solo iniciamos sesión y navegamos a "/"; AuthRedirect se encarga del rol
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) {
      addToast('Completa todos los campos', 'error')
      return
    }
    setLoading(true)
    const { error } = await signIn(form.email.trim(), form.password)
    setLoading(false)
    if (error) {
      addToast(
        error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : error.message,
        'error'
      )
      return
    }
    // AuthRedirect en App.jsx detecta la sesión y redirige según rol
    navigate('/', { replace: true })
  }

  return (
    <PageWrapper title="Acceso Personal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              className="input-field pl-10"
              placeholder="agente@fiscalia.gob.ec"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="input-label">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'}
              className="input-field pl-10 pr-10"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gold"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-gold w-full py-3.5 mt-2">
          {loading ? <Spinner /> : 'Ingresar al Sistema'}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-navy-lighter text-center">
        <p className="text-sm text-slate-400 mb-3">¿Es agente nuevo?</p>
        <Link to="/registro" className="btn-ghost w-full block text-center py-2.5 text-sm">
          Solicitar acceso como Agente
        </Link>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </PageWrapper>
  )
}

// ── Registro de Agente ─────────────────────────────────────────────────────
export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  const [form, setForm] = useState({
    full_name: '',
    cedula: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = () => {
    if (!form.full_name.trim() || form.full_name.trim().length < 5) {
      addToast('Ingresa el nombre completo (mín. 5 caracteres)', 'error'); return false
    }
    if (!validarCedula(form.cedula)) {
      addToast('Cédula ecuatoriana inválida (10 dígitos)', 'error'); return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      addToast('Correo electrónico inválido', 'error'); return false
    }
    if (form.password.length < 8) {
      addToast('La contraseña debe tener al menos 8 caracteres', 'error'); return false
    }
    if (form.password !== form.confirmPassword) {
      addToast('Las contraseñas no coinciden', 'error'); return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    const { error } = await signUp({
      email: form.email.trim(),
      password: form.password,
      cedula: form.cedula,
      full_name: form.full_name.trim(),
    })
    setLoading(false)
    if (error) {
      const msg =
        error.message.includes('already registered')
          ? 'Este correo ya está registrado'
          : error.message.includes('cedula') || error.message.includes('unique')
          ? 'Esta cédula ya está registrada en el sistema'
          : error.message
      addToast(msg, 'error')
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <PageWrapper title="Solicitud Enviada">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-siri-green/20 border-2 border-siri-green flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-siri-green-bright" />
          </div>
          <h3 className="font-display text-gold text-xl mb-2">Solicitud Enviada</h3>
          <p className="font-body text-slate-300 text-sm mb-6">
            Tu solicitud está en revisión. El administrador aprobará tu cuenta en breve.
          </p>
          <button onClick={() => navigate('/')} className="btn-gold w-full">
            Volver al Inicio
          </button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Registro de Agente">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Nombre Completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Nombres y Apellidos"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="input-label">Cédula de Identidad</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              className="input-field pl-10 font-mono"
              placeholder="0000000000"
              maxLength={10}
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/\D/g, '') })}
              required
            />
          </div>
          {form.cedula.length === 10 && (
            <p className={`text-xs mt-1 ${validarCedula(form.cedula) ? 'text-green-400' : 'text-red-400'}`}>
              {validarCedula(form.cedula) ? '✓ Cédula válida' : '✗ Cédula inválida'}
            </p>
          )}
        </div>

        <div>
          <label className="input-label">Correo Electrónico Institucional</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              className="input-field pl-10"
              placeholder="nombre@fiscalia.gob.ec"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="input-label">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'}
              className="input-field pl-10 pr-10"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gold">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="input-label">Confirmar Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              className="input-field pl-10"
              placeholder="Repite tu contraseña"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 mt-2">
          {loading ? <Spinner /> : 'Enviar Solicitud de Acceso'}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-navy-lighter text-center">
        <Link to="/login" className="text-sm text-gold/70 hover:text-gold transition-colors">
          ← Ya tengo cuenta, iniciar sesión
        </Link>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </PageWrapper>
  )
}

// ── Pantalla cuenta pendiente/inactiva ─────────────────────────────────────
export function PendientePage() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  return (
    <PageWrapper title="Cuenta en Revisión">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-amber-900/30 border-2 border-amber-700 flex items-center justify-center mx-auto mb-4">
          <Scale className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="font-display text-gold text-xl mb-3">
          Hola, {profile?.full_name?.split(' ')[0]}
        </h3>
        {profile?.status === 'pending' && (
          <>
            <p className="font-body text-slate-300 text-sm mb-3">
              Tu cuenta está siendo revisada por el administrador.
            </p>
            <span className="badge-pending">Pendiente de aprobación</span>
          </>
        )}
        {profile?.status === 'approved' && !profile?.is_active && (
          <>
            <p className="font-body text-slate-300 text-sm mb-3">
              Tu cuenta ha sido desactivada. Contacta al administrador.
            </p>
            <span className="badge-cancelled">Cuenta desactivada</span>
          </>
        )}
        <button
          onClick={async () => { await signOut(); navigate('/') }}
          className="btn-ghost w-full mt-6"
        >
          Cerrar Sesión
        </button>
      </div>
    </PageWrapper>
  )
}

// ── Wrapper compartido ─────────────────────────────────────────────────────
function PageWrapper({ title, children }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="fixed inset-0 pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(ellipse at top, #a07a20 0%, transparent 60%)' }}
      />
      <div className="relative z-10 flex items-center gap-3 px-4 py-4 border-b border-gold/10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-gold transition-colors rounded-lg hover:bg-navy-lighter"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-display text-gold text-lg">{title}</p>
          <p className="font-body text-xs text-slate-500 tracking-wider uppercase">Sistema SIRI</p>
        </div>
      </div>
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-8">
        <div className="card-gold w-full max-w-md animate-slide-up">
          {children}
        </div>
      </div>
    </div>
  )
}
