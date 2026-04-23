export default function LoadingScreen({ message = 'Cargando SIRI...' }) {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-6">
      {/* Logo animado */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-navy-lighter border-t-gold animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-gold/20 animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <p className="font-display text-gold text-lg tracking-widest">SIRI</p>
        <p className="font-body text-slate-400 text-sm mt-1">{message}</p>
      </div>
    </div>
  )
}
