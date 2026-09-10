import { Brand } from './Brand'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { LegalFooter } from './LegalFooter'
import { api } from '../lib/api'
import { publishAuth, useFacilitatorAuth } from '../hooks/useFacilitatorAuth'
import { WorkspaceLayout } from './WorkspaceLayout'
import type { FacilitatorAuthState } from '../types'
import './LocalAuth.css'

type Status = { setupRequired: boolean; pending?: string; isAuthenticated: boolean }
type Result = { step?: string; recoveryCodes?: string[]; complete?: boolean }
type Mode = 'loading' | 'credentials' | 'setup' | 'login' | 'rotate' | 'recovery' | 'security'

function AuthForm({ onComplete, security = false, invitationToken }: { onComplete: () => void; security?: boolean; invitationToken?: string }) {
  const [mode, setMode] = useState<Mode>('loading')
  const [initial, setInitial] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [installationCode, setInstallationCode] = useState('')
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [enrollment, setEnrollment] = useState<{ secret: string; qrSvg: string } | null>(null)
  const [codes, setCodes] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [action, setAction] = useState('password')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const load = async () => {
    setError('')
    try {
      const status = await api<Status>('/api/auth/status')
      setInitial(status.setupRequired)
      if (status.isAuthenticated && !security && !status.pending && !invitationToken) { await complete(); return }
      setMode(status.pending === 'setup' || status.pending === 'rotate' || status.pending === 'login' ? status.pending : security ? 'security' : 'credentials')
    } catch (reason) { setError((reason as Error).message) }
  }
  const [initialLoad] = useState(() => load)
  useEffect(() => { void initialLoad() }, [initialLoad])
  useEffect(() => { heading.current?.focus() }, [mode])
  const complete = async () => {
    const state = await api<FacilitatorAuthState>('/api/auth/me')
    if (!state.isAuthenticated) throw new Error('No se pudo confirmar el acceso. Vuelve a iniciar sesión.')
    publishAuth(state)
    setCodes([]); setEnrollment(null); setPassword(''); setCode('')
    onComplete()
  }
  const handle = async (result: Result) => {
    setPassword(''); setCode(''); setNewPassword(''); setInstallationCode(''); setShowPassword(false)
    if (result.recoveryCodes) { setCodes(result.recoveryCodes); setRevealed(false); setSaved(false); setEnrollment(null); setMode('recovery') }
    else if (result.step) { if (result.step !== 'login') setRecovery(false); setMode(result.step as Mode); setEnrollment(null) }
    else if (result.complete) await complete()
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const endpoint = mode === 'credentials' ? invitationToken ? 'invitation' : initial ? 'setup' : 'login' : mode === 'security' ? action : 'verify'
      await handle(await api<Result>('/api/auth/' + endpoint, { method: 'POST', body: JSON.stringify({ token: invitationToken, username, password, newPassword, installationCode, code: code.replace(/[\s-]/g, '') }) }))
    } catch (reason) { setError((reason as Error).message); setCode('') }
    finally { setBusy(false) }
  }
  const restart = async () => {
    setBusy(true)
    try { await api('/api/auth/cancel', { method: 'POST' }); setEnrollment(null); setCode(''); setMode(security ? 'security' : 'credentials'); setError('') }
    catch (reason) { setError((reason as Error).message) }
    finally { setBusy(false) }
  }
  const title = mode === 'loading' ? 'Comprobando acceso' : mode === 'credentials' ? invitationToken ? 'Acepta tu invitación' : initial ? 'Crea la cuenta administradora' : 'Accede a tu espacio' : mode === 'login' ? 'Verifica tu identidad' : mode === 'recovery' ? 'Guarda tus códigos de recuperación' : mode === 'security' ? 'Protege tu cuenta' : 'Vincula tu aplicación autenticadora'
  const factor = <label>{recovery ? 'Código de recuperación' : 'Código de 6 dígitos'}<input name="code" autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} value={code} onChange={e => setCode(e.target.value)} required maxLength={recovery ? 80 : 20} placeholder={recovery ? 'Código guardado al configurar la cuenta' : '000 000'} /></label>
  return <div className="local-auth-form">
    <div className="auth-mark"><ShieldCheck size={26} /><span>FrameIt · Acceso de facilitador</span></div>
    <h1 ref={heading} tabIndex={-1}>{title}</h1>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {mode === 'loading' ? <><p>Comprobando la configuración de acceso…</p>{error && <button className="secondary-button" onClick={() => void load()}>Reintentar</button>}</> : mode === 'recovery' ? <>
      <p>Cada código sustituye una verificación TOTP una sola vez. Necesitarás también tu contraseña. Guárdalos en tu gestor de contraseñas, separados del autenticador.</p>
      <button type="button" className="secondary-button" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? 'Ocultar códigos' : 'Mostrar códigos de recuperación'}</button>
      {revealed && <div className="auth-recovery" aria-label="Códigos de recuperación">{codes.map(value => <code key={value}>{value}</code>)}</div>}
      {revealed && <button type="button" className="secondary-button" onClick={() => void navigator.clipboard.writeText(codes.join('\n')).catch(() => setError('No se pudo copiar. Selecciona los códigos y cópialos manualmente.'))}>Copiar todos los códigos</button>}
      <label className="auth-check"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /><span>He guardado mis códigos en un lugar seguro.</span></label>
      <button type="button" className="primary-button" disabled={!saved || busy} onClick={() => { setBusy(true); void complete().catch(reason => setError(reason.message)).finally(() => setBusy(false)) }}>Continuar</button>
    </> : <form onSubmit={event => void submit(event)}><fieldset disabled={busy}>
      {mode === 'credentials' && <>
        <p>{invitationToken ? 'Elige tu usuario y contraseña para unirte a la organización. Después activarás la verificación en dos pasos.' : initial ? 'Configura una contraseña y una segunda verificación con tu móvil. Utiliza el código de instalación facilitado por el administrador.' : 'Introduce tu usuario y contraseña. Después te pediremos el código de tu aplicación autenticadora.'}</p>
        {initial && !invitationToken && <label>Código de instalación<input type="password" name="installationCode" autoComplete="off" value={installationCode} onChange={e => setInstallationCode(e.target.value)} required maxLength={128} /><small>Solo se utiliza para crear la primera cuenta. No es el código de tu autenticador.</small></label>}
        <label>Usuario<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={e => setUsername(e.target.value)} required minLength={initial || invitationToken ? 3 : 1} maxLength={64} /></label>
      </>}
      {(mode === 'credentials' || mode === 'security') && <>
        {mode === 'security' && <label>Qué quieres cambiar<select value={action} onChange={e => setAction(e.target.value)}><option value="password">Contraseña</option><option value="recovery">Códigos de recuperación</option><option value="rotate">Aplicación autenticadora</option></select></label>}
        <label>{mode === 'security' ? 'Contraseña actual' : 'Contraseña'}<input name="password" type={showPassword ? 'text' : 'password'} autoComplete={initial || invitationToken ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={initial || invitationToken ? 12 : 1} maxLength={128} />{(initial || invitationToken) && <small>Al menos 12 caracteres. Puedes usar una frase larga.</small>}</label>
        <button type="button" className="auth-text-button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>
        {mode === 'security' && action === 'password' && <label>Nueva contraseña<input name="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={12} maxLength={128} /><small>Al menos 12 caracteres.</small></label>}
      </>}
      {(mode === 'setup' || mode === 'rotate') && <>
        <p>Añade FrameIt en tu aplicación autenticadora escaneando el QR o introduciendo la clave manual. Después escribe el código que genera.</p>
        {mode === 'rotate' && <p>Tu autenticador anterior seguirá funcionando hasta que confirmes el nuevo.</p>}
        <button type="button" className="secondary-button" disabled={busy} aria-expanded={!!enrollment} onClick={() => { if (enrollment) setEnrollment(null); else { setBusy(true); void api<{ secret: string; qrSvg: string }>('/api/auth/enrollment').then(setEnrollment).catch(reason => setError(reason.message)).finally(() => setBusy(false)) } }}>{enrollment ? 'Ocultar configuración' : 'Mostrar QR y clave manual'}</button>
        {enrollment && <div className="auth-enrollment"><img alt="Código QR para vincular FrameIt al autenticador" src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(enrollment.qrSvg)} /><label>Clave manual<input readOnly value={enrollment.secret} onFocus={e => e.target.select()} /></label></div>}
      </>}
      {(mode === 'setup' || mode === 'rotate' || mode === 'login' || mode === 'security') && <>
        {mode === 'login' && <p>{recovery ? 'Introduce uno de los códigos que guardaste al configurar tu cuenta.' : 'Abre tu aplicación autenticadora e introduce el código de FrameIt. Cada código se acepta una sola vez.'}</p>}
        {factor}
        {(mode === 'login' || mode === 'security') && <button type="button" className="auth-text-button" onClick={() => { setRecovery(!recovery); setCode(''); setError('') }}>{recovery ? 'Usar la aplicación autenticadora' : 'Usar un código de recuperación'}</button>}
        {mode === 'security' && <p className="auth-hint">Confirma con tu contraseña y un código nuevo. Este cambio cerrará las otras sesiones cuando se complete.{action === 'recovery' ? ' Los códigos de recuperación anteriores dejarán de funcionar.' : ''}</p>}
      </>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Verificando…' : mode === 'credentials' ? initial || invitationToken ? 'Configurar autenticador' : 'Continuar' : mode === 'security' ? action === 'rotate' ? 'Configurar nuevo autenticador' : 'Confirmar cambio' : 'Verificar y continuar'}</button>
      {mode !== 'credentials' && mode !== 'security' && <button type="button" className="auth-text-button" disabled={busy} onClick={() => void restart()}>{mode === 'login' ? 'Usar otra cuenta' : 'Cancelar configuración'}</button>}
    </fieldset></form>}
    {mode === 'credentials' && !initial && !invitationToken && <details className="auth-help"><summary>¿No puedes acceder a tu cuenta?</summary><p>Si has perdido el autenticador, utiliza un código de recuperación en el siguiente paso. Si has olvidado la contraseña o tampoco tienes códigos, <a href="mailto:info@olatic.es">contacta con OLATIC</a> para solicitar ayuda con el restablecimiento.</p></details>}
    <p className="privacy-notice">OLATIC gestiona tus datos de acceso para prestar y proteger el servicio. <Link to="/privacidad">Privacidad y derechos</Link> · <Link to="/cookies">Cookies técnicas</Link>.</p>
  </div>
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { auth, busy, error, expired, refresh } = useFacilitatorAuth()
  const location = useLocation()
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, 60_000)
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); window.clearInterval(timer) }
  }, [refresh])
  if (busy || error) return <main className="auth-page"><Link to="/" className="brand-link"><Brand /></Link><section className="auth-checking" aria-busy={busy}><h1>{error ? 'No podemos comprobar tu acceso' : 'Comprobando acceso…'}</h1>{error ? <><p role="alert">{error}</p><button className="primary-button" disabled={busy} onClick={() => void refresh()}>Reintentar</button><Link to="/">Volver al inicio</Link></> : <p role="status">Un momento, estamos verificando tu sesión.</p>}</section></main>
  if (!auth.isAuthenticated) {
    const query = new URLSearchParams({ returnTo: location.pathname + location.search + location.hash })
    if (expired) query.set('reason', 'expired')
    return <Navigate to={'/acceso?' + query.toString()} replace />
  }
  return children
}

export function AuthPage({ invitation = false }: { invitation?: boolean }) {
  const navigate = useNavigate()
  const route = useLocation()
  const { auth, logout, error: logoutError } = useFacilitatorAuth()
  const invitationToken = invitation ? new URLSearchParams(route.hash.slice(1)).get('token') ?? '' : undefined
  useEffect(() => { const title = document.title; document.title = 'Acceso de facilitadores · FrameIt'; return () => { document.title = title } }, [])
  const done = () => {
    const raw = new URLSearchParams(route.search).get('returnTo') ?? '/espacio'
    let target: URL
    try { target = new URL(raw, location.origin) } catch { target = new URL('/espacio', location.origin) }
    const allowed = target.origin === location.origin && /^\/(?:$|espacio(?:\/|$)|clientes(?:\/|$)|sesiones(?:\/|$)|sesion\/|plantillas(?:\/|$)|equipo(?:\/|$)|disenador(?:\/|$)|seguridad(?:\/|$)|configuracion(?:\/|$))/.test(target.pathname)
    navigate(allowed ? target.pathname + target.search + target.hash : '/espacio', { replace: true })
  }
  return <div className="auth-screen"><main className="auth-page"><Link to="/" className="brand-link" aria-label="FrameIt, inicio"><Brand /></Link><section className="auth-card">{new URLSearchParams(route.search).get('reason') === 'expired' && <p className="auth-session-notice" role="status">Tu sesión ha caducado o ya no es válida. Inicia sesión para continuar.</p>}{invitation && !invitationToken ? <><h1>Invitación incompleta</h1><p>Abre el enlace completo que te ha enviado el administrador.</p></> : invitation && auth.isAuthenticated ? <><h1>Ya tienes una sesión abierta</h1><p>Para aceptar esta invitación, cierra tu sesión actual.</p>{logoutError && <p role="alert">{logoutError}</p>}<button className="primary-button" onClick={() => void logout()}>Cerrar sesión y aceptar invitación</button></> : <AuthForm key={invitationToken ?? 'login'} onComplete={done} invitationToken={invitationToken} />}</section><p className="auth-participant-link">¿Vienes a participar en un taller? <Link to="/join">Entrar con un código</Link></p><Link className="auth-home-link" to="/">Volver al inicio</Link></main><LegalFooter /></div>
}

export function SecurityPage() {
  const [version, setVersion] = useState(0)
  const [message, setMessage] = useState('')
  return <WorkspaceLayout eyebrow="Configuración del usuario" title="Seguridad de la cuenta" description="Gestiona tu contraseña, autenticador y recuperación.">{message && <p role="status" className="auth-success">{message}</p>}<div className="auth-security"><AuthForm key={version} security onComplete={() => { setMessage('Cambio guardado. Tu cuenta sigue protegida con TOTP.'); setVersion(value => value + 1) }} /></div></WorkspaceLayout>
}
