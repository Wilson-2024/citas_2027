import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PREGUNTAS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es el nombre de tu madre?',
  '¿Cuál fue el nombre de tu escuela primaria?',
]

export default function SetupPreguntas() {
  const navigate = useNavigate()
  const { user, fetchProfile } = useAuth()
  const [answers, setAnswers] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function handleSave() {
    setError(''); setOk('')
    for (let i = 0; i < 4; i++) {
      if (!answers[i].trim() || answers[i].trim().length < 2) {
        setError(`Completa la respuesta de la pregunta ${i + 1}.`); return
      }
    }
    setLoading(true)
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          security_questions_set: true,
          security_q1: PREGUNTAS[0], security_a1: answers[0].toLowerCase().trim(),
          security_q2: PREGUNTAS[1], security_a2: answers[1].toLowerCase().trim(),
          security_q3: PREGUNTAS[2], security_a3: answers[2].toLowerCase().trim(),
          security_q4: PREGUNTAS[3], security_a4: answers[3].toLowerCase().trim(),
        })
        .eq('id', user.id)

      if (err) { setError('Error al guardar: ' + err.message); setLoading(false); return }

      await fetchProfile(user.id)
      setOk('¡Preguntas guardadas! Redirigiendo al panel...')
      setTimeout(() => navigate('/agente'), 1000)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#f8f6f0', minHeight: '100vh' }}>
      <nav className="nav">
        <div className="nav-logo">
          <div className="logo-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <span className="nav-name">Agendamiento <span>de Citas</span></span>
        </div>
      </nav>
      <div style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
        <div className="card">
          <div style={{ width: 52, height: 52, background: '#fdf6e3', border: '1.5px solid #e8c97a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .9rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9991a" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 500, textAlign: 'center', marginBottom: '.25rem' }}>Configura tus preguntas de seguridad</h2>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Debes completar este paso antes de acceder al sistema. Guarda tus respuestas en un lugar seguro.
          </p>

          <div className="info-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Con responder correctamente <strong>&nbsp;1 de estas 4 preguntas&nbsp;</strong> podrás recuperar tu contraseña si la olvidas.
          </div>

          {error && <div className="err-msg show">{error}</div>}
          {ok && <div className="ok-msg show">{ok}</div>}

          {PREGUNTAS.map((q, i) => (
            <div key={i} className="q-card">
              <div className="q-number">Pregunta {i + 1} de 4</div>
              <div className="q-text">{q}</div>
              <input type="text" className="form-input" placeholder="Tu respuesta..."
                value={answers[i]}
                onChange={e => {
                  const newA = [...answers]
                  newA[i] = e.target.value
                  setAnswers(newA)
                }} />
            </div>
          ))}

          <button className="btn btn-gold btn-full" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner"></span> Guardando...</> : 'Guardar y acceder al sistema'}
          </button>
        </div>
      </div>
    </div>
  )
}
