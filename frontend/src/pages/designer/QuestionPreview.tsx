import { AnimatePresence } from 'motion/react'
import { PresentationSlide } from '../../components/PresentationSlide'
import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { formatTime, label, privacyText } from '../../lib/session'
import { answerComplete, answerSettingsIssues } from '../../lib/answers'
import { QuestionAnswerInput } from '../../components/QuestionAnswerInput'
import type { DesignerQuestionDraft } from '../../types'

export function QuestionPreview({ sectionTitle, question }: { sectionTitle: string; question: DesignerQuestionDraft }) {
  return <Preview key={`${question.key}:${question.kind}:${JSON.stringify(question.options)}:${JSON.stringify(question.settings)}`} sectionTitle={sectionTitle} question={question} />
}

function Preview({ sectionTitle, question }: { sectionTitle: string; question: DesignerQuestionDraft }) {
  const [value, setValue] = useState('')
  const [sent, setSent] = useState(false)
  const [inputRevision, setInputRevision] = useState(0)
  const settingsIssues = answerSettingsIssues(question.kind, question.settings)
  function reset() { setValue(''); setSent(false); setInputRevision(current => current + 1) }
  if (question.kind === 'Presentation') return <div className="designer-preview designer-preview--slide">
    <AnimatePresence mode="wait"><PresentationSlide key={question.key} compact title={question.title} body={question.prompt} settings={question.settings ?? undefined} /></AnimatePresence>
  </div>
  return <div className="designer-preview preview-question">
    <div className="preview-kind"><span>{label(question.kind)}</span><button type="button" className="text-button" onClick={reset}><RotateCcw size={14} />Reiniciar</button></div>
    <div className="preview-round"><span>Ronda abierta</span><strong>{question.presentation.timerSeconds ? formatTime(question.presentation.timerSeconds) : 'Sin límite'}</strong></div>
    <p className="section-label">{sectionTitle}</p>
    <h3>{question.title}</h3>
    <p>{question.prompt}</p>
    {settingsIssues.length > 0 ? <p className="micro-error" role="alert">Completa la configuración para probar esta pregunta. {settingsIssues.join(' ')}</p>
      : sent ? <section className="preview-receipt"><Check size={24} aria-hidden="true" /><h4 role="status">{question.kind === 'Voting' ? 'Tu voto está guardado' : 'Tu respuesta está guardada'}</h4><p className="submitted-answer">{value}</p><p className="micro-copy">Simulación de la confirmación. No se ha enviado ninguna respuesta.</p><button type="button" className="secondary-button" onClick={() => setSent(false)}>Editar respuesta</button></section>
      : <><QuestionAnswerInput key={inputRevision} kind={question.kind} options={question.options} settings={question.settings} value={value} onChange={setValue} />
        <button className="primary-button" type="button" disabled={!answerComplete(question.kind, value, question.options, question.settings)} onClick={() => setSent(true)}>{question.kind === 'Voting' ? 'Enviar voto' : 'Enviar respuesta'}</button></>}
    <p className="privacy-note">{privacyText(question.presentation)}</p>
  </div>
}
