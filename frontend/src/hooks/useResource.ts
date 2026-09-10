import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

export function useResource<T>(url: string | null, delay = 0) {
  const [result, setResult] = useState<{ url: string; revision: number; data: T | null; error: string } | null>(null)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    if (!url) return () => controller.abort()
    const timer = setTimeout(() => {
      void api<T>(url, { signal: controller.signal }).then(value => {
        if (!controller.signal.aborted) setResult({ url, revision, data: value, error: '' })
      }).catch(reason => {
        if (!controller.signal.aborted) setResult({ url, revision, data: null, error: (reason as Error).message })
      })
    }, delay)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [url, revision, delay])
  const current = result?.url === url && result?.revision === revision ? result : null
  return { data: current?.data ?? null, loading: Boolean(url && !current), error: current?.error ?? '', reload }
}
