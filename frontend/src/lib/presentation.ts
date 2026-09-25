type SlideBlock = { kind: 'paragraph' | 'list'; text?: string; items?: string[] }

export function presentationContentBlocks(body: string): SlideBlock[] {
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
  const units = presentationContentBlocks(body).flatMap(block => block.kind === 'list'
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
