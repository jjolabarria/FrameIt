import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react'

export function UserMenu({ name, busy, onLogout }: { name: string; busy: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 12, top: 12 })
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const firstFocus = useRef<'first' | 'last'>('first')
  const id = useId()
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) trigger.current?.focus() }

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      if (!trigger.current || !panel.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const menu = panel.current.getBoundingClientRect()
      const below = window.innerHeight - anchor.bottom - 12
      const top = below >= menu.height + 8 ? anchor.bottom + 8 : anchor.top - menu.height - 8
      setPosition({ left: Math.max(12, Math.min(anchor.left, window.innerWidth - menu.width - 12)), top: Math.max(12, Math.min(top, window.innerHeight - menu.height - 12)) })
    }
    place()
    const observer = new ResizeObserver(place)
    if (panel.current) observer.observe(panel.current)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { observer.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])
  useEffect(() => {
    if (!open) return
    const items = panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')
    items?.[firstFocus.current === 'last' ? items.length - 1 : 0]?.focus()
    const outside = (event: Event) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside) }
  }, [open])

  return <>
    <button ref={trigger} type="button" className="user-menu-trigger" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} title={name} onClick={() => { firstFocus.current = 'first'; setOpen(!open) }} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); firstFocus.current = event.key === 'ArrowUp' ? 'last' : 'first'; setOpen(true) }
      if (event.key === 'Escape') close()
    }}><UserRound size={18} /><span>{name}</span><ChevronDown size={16} /></button>
    {open && createPortal(<div ref={panel} className="user-menu-popover" style={position}>
      <p className="user-menu-name">{name}</p>
      <div id={id} role="menu" aria-label="Opciones de usuario" onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); close(true) }
        if (event.key === 'Tab') close(true)
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const items = Array.from(panel.current!.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'))
          const current = items.indexOf(document.activeElement as HTMLElement)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
          items[next]?.focus()
        }
      }}>
        <Link role="menuitem" tabIndex={-1} to="/configuracion/seguridad" onClick={() => close()}><ShieldCheck size={17} />Seguridad</Link>
        <button role="menuitem" tabIndex={-1} type="button" disabled={busy} onClick={() => { close(true); onLogout() }}><LogOut size={17} />Cerrar sesión</button>
      </div>
    </div>, document.body)}
  </>
}
