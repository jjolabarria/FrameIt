import { AnimatePresence } from 'motion/react'
import { PresentationSlide } from '../../components/PresentationSlide'
import { useState } from 'react'
import { privacyText } from '../../lib/session'
import { QuestionAnswerInput } from '../../components/QuestionAnswerInput'
import type { DesignerQuestionDraft } from '../../types'

export function QuestionPreview({ sectionTitle, question }: { sectionTitle: string; question: DesignerQuestionDraft }) {
  return <Preview key={`${question.key}:${question.kind}:${JSON.stringify(question.options)}:${JSON.stringify(question.settings)}`} sectionTitle={sectionTitle} question={question} />
}

function Preview({ sectionTitle, question }: { sectionTitle: string; question: DesignerQuestionDraft }) {
  const [value, setValue] = useState('')
  if (question.kind === 'Presentation') return <div className="designer-preview designer-preview--slide">
    <AnimatePresence mode="wait"><PresentationSlide key={question.key} compact title={question.title} body={question.prompt} settings={question.settings ?? undefined} /></AnimatePresence>
  </div>
  return <div className="designer-preview preview-question">
    <p className="section-label">{sectionTitle}</p>
    <h3>{question.title}</h3>
    <p>{question.prompt}</p>
    <QuestionAnswerInput kind={question.kind} options={question.options} settings={question.settings} value={value} onChange={setValue} />
    <button className="primary-button" type="button" disabled>{question.kind === 'Voting' ? 'Enviar voto' : 'Enviar respuesta'}</button>
    <p className="privacy-note">{privacyText(question.presentation)}</p>
  </div>
}
