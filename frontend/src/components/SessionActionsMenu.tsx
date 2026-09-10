import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'

type Action = { label: string; run: () => void; disabled?: boolean; danger?: boolean }
export function SessionActionsMenu({ actions, disabled, label = 'Más acciones', ariaLabel = 'Acciones de la sesión' }: { actions: Action[]; disabled: boolean; label?: string; ariaLabel?: string }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const lastFirst = useRef(false)
  const id = useId()
  if (disabled && open) setOpen(false)
  function close(restoreFocus = false) { setOpen(false); if (restoreFocus) trigger.current?.focus() }
  useLayoutEffect(() => {
    if (!open) return
    const panel = menu.current
    const button = trigger.current
    if (!panel || !button) return
    const position = () => {
      const rect = button.getBoundingClientRect()
      const width = panel.offsetWidth
      const height = panel.offsetHeight
      const below = window.innerHeight - rect.bottom - 8
      const above = rect.top - 8
      const top = below < height && above > below ? rect.top - height - 8 : rect.bottom + 8
      panel.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`
      panel.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`
      panel.style.visibility = 'visible'
    }
    position()
    const items = panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    items[lastFirst.current ? items.length - 1 : 0]?.focus()
    const outside = (event: Event) => {
      const target = event.target as Node
      if (!panel.contains(target) && !button.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open])
  return <>
    <button ref={trigger} type="button" className="session-actions-trigger" disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { lastFirst.current = false; setOpen(value => !value) }}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); lastFirst.current = event.key === 'ArrowUp'; setOpen(true) } }}><Ellipsis size={19} aria-hidden="true" /><span>{label}</span></button>
    {open && createPortal(<div ref={menu} id={id} role="menu" aria-label={ariaLabel} className="user-menu-popover session-actions-menu" style={{ visibility: 'hidden' }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
      if (event.key === 'Tab') { close(true); return }
      const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (current + 1) % items.length : event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : null
      if (next !== null) { event.preventDefault(); items[next]?.focus() }
    }}>{actions.map(action => <button key={action.label} type="button" role="menuitem" tabIndex={-1} disabled={action.disabled} className={action.danger ? 'session-actions-item session-actions-item--danger' : 'session-actions-item'} onClick={() => { close(true); action.run() }}>{action.label}</button>)}</div>, document.body)}
  </>
}
