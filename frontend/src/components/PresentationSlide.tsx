import { motion, useReducedMotion } from 'motion/react'
import { ExternalLink } from 'lucide-react'
import { presentationContentBlocks } from '../lib/presentation'

type PresentationSlideProps = { title: string; body: string; settings?: Record<string, string>; compact?: boolean }

export function PresentationSlide({ title, body, settings = {}, compact = false }: PresentationSlideProps) {
  const reduced = useReducedMotion()
  const image = settings.slideImageUrl
  const imageAlt = settings.slideImageAlt || title
  const link = settings.slideLinkUrl
  const linkLabel = settings.slideLinkLabel || 'Abrir recurso'
  const layout = settings.slideLayout || (image ? 'media' : 'text')
  const blocks = presentationContentBlocks(body)
  const density = body.length > 650 ? 'dense' : body.length > 360 ? 'medium' : 'short'
  return <motion.article className={`presentation-slide presentation-slide--${layout}${compact ? ' presentation-slide--compact' : ''}`} initial={{ opacity: 0, x: reduced ? 0 : 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : -18 }} transition={{ duration: reduced ? 0 : .36, ease: [0.22, 1, 0.36, 1] }}>
    <div className={`presentation-slide-copy presentation-slide-copy--${density}`}><p className="section-label">{settings.slideSequenceLabel || 'Presentación'}</p><h1>{title}</h1>{body && <div className="presentation-slide-body">{blocks.map((block, index) => block.kind === 'list' ? <ul key={index}>{block.items?.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : <p key={index}>{block.text}</p>)}</div>}{link && <a href={link} target="_blank" rel="noreferrer"><ExternalLink size={18} />{linkLabel}</a>}</div>
    {image && <figure className="presentation-slide-media"><img src={image} alt={imageAlt} /></figure>}
  </motion.article>
}
