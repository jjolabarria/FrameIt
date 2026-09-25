import { motion, useReducedMotion } from 'motion/react'
import { ExternalLink } from 'lucide-react'

type PresentationSlideProps = { title: string; body: string; settings?: Record<string, string>; compact?: boolean }

type SlideBlock = { kind: 'paragraph' | 'list'; text?: string; items?: string[] }

function contentBlocks(body: string): SlideBlock[] {
  const lines = body.split(/\r?\n/)
  const blocks: SlideBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() })
    if (list.length) blocks.push({ kind: 'list', items: list })
    paragraph = []; list = []
  }
  for (const line of lines) {
    const trimmed = line.trim()
    const bullet = trimmed.match(/^[-*•]\s+(.+)/)
    if (!trimmed) { flush(); continue }
    if (bullet) {
      if (paragraph.length) flush()
      list.push(bullet[1])
    } else {
      if (list.length) flush()
      paragraph.push(trimmed)
    }
  }
  flush()
  return blocks.filter(block => block.kind === 'list' ? block.items?.length : block.text)
}

function splitLongText(text: string, limit: number) {
  if (text.length <= limit) return [text]
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [text]
  const units = sentences.flatMap(sentence => {
    if (sentence.length <= limit) return sentence
    const chunks: string[] = []
    for (const word of sentence.split(/\s+/)) {
      if (!chunks.length || `${chunks.at(-1)} ${word}`.length > limit) chunks.push(word)
      else chunks[chunks.length - 1] += ` ${word}`
    }
    return chunks
  })
  const parts: string[] = []
  for (const sentence of units) {
    if (!parts.length || `${parts.at(-1)} ${sentence}`.length > limit) parts.push(sentence)
    else parts[parts.length - 1] += ` ${sentence}`
  }
  return parts
}

export function splitPresentationBody(body: string, layout = 'text') {
  const limit = layout === 'media' ? 520 : layout === 'quote' ? 420 : layout === 'title' ? 360 : 820
  const units = contentBlocks(body).flatMap(block => block.kind === 'list'
    ? (block.items ?? []).map(item => `- ${item}`)
    : splitLongText(block.text ?? '', Math.round(limit * .72)))
  if (!units.length) return ['']
  const pages: string[] = []
  for (const unit of units) {
    const candidate = pages.length ? `${pages.at(-1)}\n${unit}` : unit
    if (!pages.length || candidate.length > limit) pages.push(unit)
    else pages[pages.length - 1] = candidate
  }
  return pages
}

export function PresentationSlide({ title, body, settings = {}, compact = false }: PresentationSlideProps) {
  const reduced = useReducedMotion()
  const image = settings.slideImageUrl
  const imageAlt = settings.slideImageAlt || title
  const link = settings.slideLinkUrl
  const linkLabel = settings.slideLinkLabel || 'Abrir recurso'
  const layout = settings.slideLayout || (image ? 'media' : 'text')
  const blocks = contentBlocks(body)
  const density = body.length > 650 ? 'dense' : body.length > 360 ? 'medium' : 'short'
  return <motion.article className={`presentation-slide presentation-slide--${layout}${compact ? ' presentation-slide--compact' : ''}`} initial={{ opacity: 0, x: reduced ? 0 : 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : -18 }} transition={{ duration: reduced ? 0 : .36, ease: [0.22, 1, 0.36, 1] }}>
    <div className={`presentation-slide-copy presentation-slide-copy--${density}`}><p className="section-label">{settings.slideSequenceLabel || 'Presentación'}</p><h1>{title}</h1>{body && <div className="presentation-slide-body">{blocks.map((block, index) => block.kind === 'list' ? <ul key={index}>{block.items?.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : <p key={index}>{block.text}</p>)}</div>}{link && <a href={link} target="_blank" rel="noreferrer"><ExternalLink size={18} />{linkLabel}</a>}</div>
    {image && <figure className="presentation-slide-media"><img src={image} alt={imageAlt} /></figure>}
  </motion.article>
}
