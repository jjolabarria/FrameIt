import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ResponseSummary } from '../types'

type Page = { id: string; author: string; text: string; continued: boolean }

// Measure with the same box and font as the visible response. A long answer gets
// continuation pages rather than smaller type, clipping, or automatic scrolling.
export function ProjectedResponses({ responses }: { responses: ResponseSummary[] }) {
  const measure = useRef<HTMLParagraphElement>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [selected, setSelected] = useState(0)
  useEffect(() => {
    const element = measure.current
    if (!element) return
    let frame = 0
    const paginate = () => {
      const next: Page[] = []
      for (const response of responses) {
        let rest = response.value
        let continued = false
        while (rest.length) {
          let low = 1, high = rest.length, fit = 1
          while (low <= high) {
            const middle = Math.floor((low + high) / 2)
            element.textContent = rest.slice(0, middle)
            if (element.scrollHeight <= element.clientHeight + 1) { fit = middle; low = middle + 1 } else high = middle - 1
          }
          if (fit < rest.length) { const space = rest.lastIndexOf(' ', fit); if (space > fit * .65) fit = space + 1 }
          next.push({ id: response.id, author: response.participantName, text: rest.slice(0, fit), continued })
          rest = rest.slice(fit); continued = true
        }
      }
      element.textContent = ''
      setPages(next)
      setSelected(current => Math.min(current, Math.max(0, next.length - 1)))
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(paginate) }
    const observer = new ResizeObserver(schedule); observer.observe(element)
    void document.fonts.ready.then(schedule)
    schedule()
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [responses])
  const page = pages[Math.min(selected, pages.length - 1)]
  return <section className="projected-responses">
    <div className="projection-response-heading"><span>{page?.author ?? 'Ideas del grupo'}</span>{page?.continued && <span>Continuación</span>}</div>
    <div className="projection-response-box"><p className="projection-response-text">{page?.text}</p><p ref={measure} className="projection-response-text projection-measure" aria-hidden="true" /></div>
    <nav className="projection-pagination" aria-label="Páginas de resultados"><button className="secondary-button" disabled={selected === 0} onClick={() => setSelected(n => n - 1)}><ChevronLeft size={20} />Anterior</button><span role="status">{pages.length ? selected + 1 : 0} / {pages.length}</span><button className="secondary-button" disabled={selected >= pages.length - 1} onClick={() => setSelected(n => n + 1)}>Siguiente<ChevronRight size={20} /></button></nav>
  </section>
}
