import { ParticipationPrivacyNotice } from './LegalFooter'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './SessionCodeForm.css'

export function SessionCodeForm({ initialMode = 'participate' }: { initialMode?: 'participate' | 'read' }) {
  const id = useId()
  const [code, setCode] = useState('')
  const [mode, setMode] = useState(initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  useEffect(() => () => request.current?.abort(), [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (request.current) return
    const normalized = code.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z0-9]{4,12}$/.test(normalized)) {
      setError('Escribe un código de sesión de entre 4 y 12 letras o números.')
      input.current?.focus()
      return
    }
    const controller = new AbortController()
    request.current = controller
    setCode(normalized); setBusy(true); setError('')
    try {
      const response = await fetch('/api/sessions/by-code/' + encodeURIComponent(normalized), { credentials: 'omit', cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error(response.status === 404 ? 'No encontramos una sesión con ese código. Compruébalo con el facilitador.' : 'No se ha podido consultar la sesión. Vuelve a intentarlo en unos momentos.')
      navigate((mode === 'read' ? '/proyeccion/' : '/join/') + encodeURIComponent(normalized))
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'No se ha podido consultar la sesión. Vuelve a intentarlo.')
    } finally {
      if (!controller.signal.aborted) { request.current = null; setBusy(false) }
    }
  }
  return <form className="session-code-form" onSubmit={event => void submit(event)} noValidate aria-busy={busy}>
    <fieldset disabled={busy}>
      <legend>Cómo quieres entrar</legend>
      <div className="session-entry-modes"><label><input type="radio" name={id + '-mode'} value="participate" checked={mode === 'participate'} onChange={() => setMode('participate')} />Participar</label><label><input type="radio" name={id + '-mode'} value="read" checked={mode === 'read'} onChange={() => setMode('read')} />Solo ver</label></div>
      <p className="session-entry-hint">{mode === 'read' ? 'Verás únicamente lo que el facilitador publique para el grupo.' : 'Después del código, solo tendrás que indicar tu nombre o alias.'}</p>
      <label htmlFor={id + '-code'}>Código de la sesión</label>
      <div className="session-code-fields"><input ref={input} id={id + '-code'} name="session-code" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code} onChange={event => { setCode(event.target.value); setError('') }} placeholder="Ej. AB12CD" maxLength={32} aria-invalid={!!error} aria-describedby={id + (error ? '-error' : '-help')} /><button type="submit">{busy ? 'Comprobando…' : 'Entrar'}<ArrowRight size={18} /></button></div>
    </fieldset>
    {busy && <p role="status">Buscando la sesión…</p>}
    {error && <p id={id + '-error'} className="session-code-error" role="alert">{error}</p>}
    <p id={id + '-help'} className="session-entry-hint">Sin cuenta ni contraseña. El acceso privado es solo para facilitadores.</p>
    <ParticipationPrivacyNotice />
  </form>
}
