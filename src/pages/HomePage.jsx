import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { CalendarPlus, Shield, QrCode, X, Scale } from 'lucide-react'
import { Modal } from '../components/ui/UIComponents'

const APP_URL = window.location.origin

export default function HomePage() {
  const navigate = useNavigate()
  const [showQR, setShowQR] = useState(false)

  return (
    <div className="min-h-screen bg-navy relative flex flex-col overflow-hidden">
      {/* Fondo con textura sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, #a07a20 0%, transparent 50%),
                              radial-gradient(circle at 80% 80%, #155a34 0%, transparent 50%)`,
          }}
        />
        <div className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px),
              repeating-linear-gradient(
              90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px)`,
          }}
        />
      </div>

      {/* Header institucional */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 border-b border-gold/10">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-gold" />
          <span className="font-body text-xs text-slate-400 tracking-wider uppercase">
            Ministerio Público del Ecuador
          </span>
        </div>
        <div className="font-mono text-xs text-gold/50">Sistema SIRI</div>
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">

        {/* Ilustración SVG de investigador */}
        <div className="animate-fade-in">
          <InvestigadorSVG />
        </div>

        {/* Título */}
        <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-display text-4xl font-bold text-white leading-tight">
            S<span className="text-gold">I</span>RI
          </h1>
          <p className="font-body text-sm text-gold/80 tracking-[0.3em] uppercase mt-1">
            Sistema Integral de Registro
          </p>
          <p className="font-body text-sm text-gold/80 tracking-[0.3em] uppercase">
            de Investigaciones
          </p>
          <div className="mt-3 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </div>

        {/* Botones de acción */}
        <div className="w-full max-w-xs flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {/* Solicitar Cita */}
          <button
            onClick={() => navigate('/cita')}
            className="btn-primary w-full py-4 text-base"
          >
            <CalendarPlus className="w-5 h-5" />
            Solicitar Cita
          </button>

          {/* Acceso Personal */}
          <button
            onClick={() => navigate('/login')}
            className="btn-gold w-full py-4 text-base"
          >
            <Shield className="w-5 h-5" />
            Acceso Personal
          </button>

          {/* QR */}
          <button
            onClick={() => setShowQR(true)}
            className="btn-blue w-full py-4 text-base"
          >
            <QrCode className="w-5 h-5" />
            Compartir QR
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 border-t border-gold/10">
        <p className="font-body text-xs text-slate-600">
          © {new Date().getFullYear()} Ministerio Público — Fiscalía General del Estado
        </p>
      </footer>

      {/* Modal QR */}
      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Código QR — Agendar Cita">
        <div className="flex flex-col items-center gap-5">
          <div className="p-4 bg-white rounded-2xl shadow-gold">
            <QRCodeSVG
              value={`${APP_URL}/cita`}
              size={200}
              bgColor="#ffffff"
              fgColor="#0a1628"
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="text-center">
            <p className="font-body text-sm text-slate-300 mb-1">
              Escanea para agendar una cita directamente
            </p>
            <p className="font-mono text-xs text-gold/60 bg-navy-light px-3 py-1.5 rounded-lg border border-navy-lighter">
              {APP_URL}/cita
            </p>
          </div>
          <button onClick={() => setShowQR(false)} className="btn-ghost w-full">
            Cerrar
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Ilustración SVG del investigador ──────────────────────────────────────
function InvestigadorSVG() {
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48" xmlns="http://www.w3.org/2000/svg">
      {/* Sombra base */}
      <ellipse cx="100" cy="185" rx="45" ry="8" fill="rgba(0,0,0,0.3)" />

      {/* Cuerpo - traje */}
      <rect x="65" y="105" width="70" height="75" rx="8" fill="#112240" />
      {/* Corbata */}
      <polygon points="100,108 105,125 100,140 95,125" fill="#a07a20" />
      {/* Solapas */}
      <path d="M65 105 L85 115 L80 135 L65 130 Z" fill="#1a3358" />
      <path d="M135 105 L115 115 L120 135 L135 130 Z" fill="#1a3358" />
      {/* Insignia */}
      <circle cx="80" cy="118" r="5" fill="#a07a20" />
      <path d="M80 115 L80 121 M77 118 L83 118" stroke="#0a1628" strokeWidth="1" />

      {/* Brazos */}
      <rect x="40" y="110" width="25" height="14" rx="7" fill="#112240" />
      <rect x="135" y="110" width="25" height="14" rx="7" fill="#112240" />

      {/* Manos */}
      <circle cx="43" cy="124" r="8" fill="#c8a875" />
      <circle cx="157" cy="124" r="8" fill="#c8a875" />

      {/* Lupa en mano derecha */}
      <circle cx="168" cy="130" r="10" fill="none" stroke="#a07a20" strokeWidth="3" />
      <circle cx="168" cy="130" r="6" fill="rgba(160,122,32,0.15)" />
      <line x1="175" y1="137" x2="182" y2="144" stroke="#a07a20" strokeWidth="3" strokeLinecap="round" />

      {/* Cuello */}
      <rect x="87" y="88" width="26" height="20" rx="4" fill="#c8a875" />

      {/* Cabeza */}
      <ellipse cx="100" cy="72" rx="28" ry="30" fill="#c8a875" />

      {/* Sombrero */}
      <ellipse cx="100" cy="46" rx="36" ry="8" fill="#112240" />
      <rect x="72" y="28" width="56" height="22" rx="6" fill="#1a3358" />
      {/* Banda del sombrero */}
      <rect x="72" y="44" width="56" height="5" fill="#a07a20" />

      {/* Ojos */}
      <circle cx="89" cy="72" r="4" fill="white" />
      <circle cx="111" cy="72" r="4" fill="white" />
      <circle cx="90" cy="73" r="2" fill="#1a3358" />
      <circle cx="112" cy="73" r="2" fill="#1a3358" />
      {/* Brillo en ojos */}
      <circle cx="91" cy="72" r="0.8" fill="white" />
      <circle cx="113" cy="72" r="0.8" fill="white" />

      {/* Nariz */}
      <ellipse cx="100" cy="80" rx="3" ry="2" fill="#b89060" />

      {/* Boca */}
      <path d="M93 86 Q100 90 107 86" stroke="#8a6040" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Carpeta/expediente en brazo izquierdo */}
      <rect x="42" y="120" width="22" height="28" rx="3" fill="#155a34" />
      <rect x="44" y="122" width="18" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
      <rect x="44" y="126" width="14" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
      <rect x="44" y="130" width="16" height="2" rx="1" fill="rgba(255,255,255,0.2)" />

      {/* Destellos decorativos */}
      <circle cx="30" cy="40" r="2" fill="#a07a20" opacity="0.4" />
      <circle cx="170" cy="60" r="1.5" fill="#a07a20" opacity="0.3" />
      <circle cx="20" cy="80" r="1" fill="#155a34" opacity="0.5" />
    </svg>
  )
}
