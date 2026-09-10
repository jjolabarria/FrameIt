export async function api<T>(url: string, init?: RequestInit): Promise<T> {

  const publicSession = /^\/(join|proyeccion)(\/|$)/i.test(window.location.pathname)
  const headers = new Headers(init?.headers)

  if (!(init?.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  if (!publicSession && init?.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method.toUpperCase())) {

    const csrf = await fetch('/api/auth/csrf', { credentials: 'include', cache: 'no-store' })

    if (!csrf.ok) throw new Error('No se pudo verificar el formulario. Vuelve a intentarlo.')

    headers.set('X-CSRF-TOKEN', (await csrf.json()).token)

  }

  const response = await fetch(url, { ...init, credentials: publicSession ? 'omit' : 'include', headers })

  if (!publicSession && response.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('frameit-auth-required'))



  if (!response.ok) {

    const raw = await response.text()

    let message = ''

    try { const body = JSON.parse(raw); message = body.message ?? body.detail ?? body.title ?? '' } catch { /* Non-JSON errors must not expose HTML or server traces. */ }

    const known: Record<string, string> = {

      'Display name already used in this session.': 'Este alias ya está en uso. Elige otro para entrar.',

      'Round is closed.': 'La ronda se ha cerrado. Tu borrador se conserva.',

      'Display name is required.': 'Escribe tu nombre o alias.',

      'Participant or question not found for this session.': 'Tu participación ha cambiado. Vuelve a entrar en la sesión.',

    }

    throw new Error(known[message] ?? (response.status === 401 && !url.startsWith('/api/auth/') ? publicSession ? 'No se ha podido acceder a esta sesión. Revisa el código o consulta al facilitador.' : 'Inicia sesión como facilitador para continuar.' : response.status === 404 ? 'No encontramos esta sesión o recurso. Comprueba el enlace.' : response.status >= 500 ? 'No se pudo completar la operación. Inténtalo de nuevo.' : message || 'No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.'))

  }



  if (response.status === 204) {

    return undefined as T

  }



  return (await response.json()) as T

}



export function titleCase(value: string) {

  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim()

}



export function enumLabel(value: unknown, numericMap: Record<number, string>, fallback = 'Unknown') {

  if (typeof value === 'string') return value

  if (typeof value === 'number') return numericMap[value] ?? fallback

  return fallback

}



export function formatBytes(bytes: number) {

  if (bytes < 1024) return `${bytes} B`

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`

}



export function getTimeRemaining(timerSeconds: number, roundOpen: boolean, roundOpenedAtUtc?: string | null, now = Date.now()) {

  if (!roundOpen || !roundOpenedAtUtc) return timerSeconds

  const opened = new Date(roundOpenedAtUtc).getTime()

  const elapsed = Math.floor((now - opened) / 1000)

  return Math.max(timerSeconds - elapsed, 0)

}
