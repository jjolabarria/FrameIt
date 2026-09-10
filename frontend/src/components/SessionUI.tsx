import { Check, ChevronDown, Copy, Radio } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { label } from '../lib/session'
import type { ConnectionState } from '../hooks/useSessionLive'

export function PhaseBadge({ phase }: { phase: string }) {
  return <span className={`phase-pill phase-pill--${phase.toLowerCase()}`}><span className="status-dot" />{label(phase)}</span>
}
export function ConnectionNotice({ state, retry }: { state: ConnectionState; retry: () => void }) {
  return <div className={`connection-state connection-state--${state}`} role="status">
    <Radio size={14} /><span>{state === 'connected' ? 'En directo' : state === 'connecting' ? 'Conectando…' : state === 'reconnecting' ? 'Reconectando · los datos pueden estar desactualizados' : 'Sin conexión · tu borrador se conserva'}</span>
    {state === 'offline' && <button className="text-button" onClick={retry}>Reintentar</button>}
  </div>
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  if (!message) return null
  return <div className="error-banner" role="alert"><span>{message}</span>{retry && <button className="text-button" onClick={retry}>Reintentar</button>}</div>
}
export function Disclosure({ title, count, children, open }: { title: string; count?: number; children: ReactNode; open?: boolean }) {
  return <details className="disclosure" open={open}><summary><span>{title}{count !== undefined && <span className="disclosure-count">{count}</span>}</span><ChevronDown size={18} /></summary><div className="disclosure-body">{children}</div></details>
}
export function CopyButton({ value, children = 'Copiar enlace' }: { value: string; children?: ReactNode }) {
  const [message, setMessage] = useState('')
  return <span className="copy-control"><button className="secondary-button" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setMessage('Enlace copiado') }
    catch { setMessage('No se pudo copiar. Selecciona el enlace y cópialo manualmente.') }
  }}>{message === 'Enlace copiado' ? <Check size={16} /> : <Copy size={16} />}{children}</button><span className="micro-copy" role="status">{message}</span></span>
}
