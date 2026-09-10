import { motion, useReducedMotion } from 'motion/react'
import { ExternalLink } from 'lucide-react'

type PresentationSlideProps = { title: string; body: string; settings?: Record<string, string>; compact?: boolean }

export function PresentationSlide({ title, body, settings = {}, compact = false }: PresentationSlideProps) {
  const reduced = useReducedMotion()
  const image = settings.slideImageUrl
  const imageAlt = settings.slideImageAlt || title
  const link = settings.slideLinkUrl
  const linkLabel = settings.slideLinkLabel || 'Abrir recurso'
  const layout = settings.slideLayout || (image ? 'media' : 'text')
  return <motion.article className={`presentation-slide presentation-slide--${layout}${compact ? ' presentation-slide--compact' : ''}`} initial={{ opacity: 0, x: reduced ? 0 : 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : -18 }} transition={{ duration: reduced ? 0 : .36, ease: [0.22, 1, 0.36, 1] }}>
    <div className="presentation-slide-copy"><p className="section-label">Presentación</p><h1>{title}</h1>{body && <p>{body}</p>}{link && <a href={link} target="_blank" rel="noreferrer"><ExternalLink size={18} />{linkLabel}</a>}</div>
    {image && <figure className="presentation-slide-media"><img src={image} alt={imageAlt} /></figure>}
  </motion.article>
}
