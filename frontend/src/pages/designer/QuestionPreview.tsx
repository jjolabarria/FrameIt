import { AnimatePresence } from 'motion/react'
import { PresentationSlide } from '../../components/PresentationSlide'
import { hasAnswerOptions, privacyText } from '../../lib/session'
import type { DesignerQuestionDraft } from '../../types'

export function QuestionPreview({ sectionTitle, question }: { sectionTitle: string; question: DesignerQuestionDraft }) {
  if (question.kind === 'Presentation') return <div className="designer-preview designer-preview--slide">
    <AnimatePresence mode="wait"><PresentationSlide key={question.key} compact title={question.title} body={question.prompt} settings={question.settings ?? undefined} /></AnimatePresence>
  </div>
  return <div className="designer-preview preview-question">
    <p className="section-label">{sectionTitle}</p>
    <h3>{question.title}</h3>
    <p>{question.prompt}</p>
    {hasAnswerOptions(question.kind) && question.options.map(option => <label className="option-radio" key={option.id}><input type="radio" name="designer-preview" /><span>{option.label || 'Opción sin texto'}</span></label>)}
    <label>Tu respuesta<textarea rows={3} placeholder="Comparte tu idea…" /></label>
    <button className="primary-button" type="button" disabled>Enviar respuesta</button>
    <p className="privacy-note">{privacyText(question.presentation)}</p>
  </div>
}
