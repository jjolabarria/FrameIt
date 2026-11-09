import { hasAnswerOptions } from '../../lib/session'
import { answerSettingsIssues } from '../../lib/answers'
import type { TemplateDraft } from '../../types'
import type { Selection } from './draftReducer'

export type DraftIssue = { target: Selection; label: string; message: string }

export function nodeId(selection: Selection) {
  return selection.kind === 'template' ? 'template' : selection.kind === 'section' ? `s:${selection.sectionKey}` : `q:${selection.sectionKey}:${selection.questionKey}`
}

/** Mirrors the save-time rules so each incomplete node can be flagged and reached from the outline. */
export function validateDraft(draft: TemplateDraft): DraftIssue[] {
  const issues: DraftIssue[] = []
  const missing = (fields: [string, string][]) => fields.filter(([, value]) => !value.trim()).map(([name]) => name)
  const templateMissing = missing([['título', draft.title], ['objetivo', draft.objective], ['audiencia', draft.audience]])
  if (templateMissing.length) issues.push({ target: { kind: 'template' }, label: 'Ficha de la plantilla', message: `Falta ${templateMissing.join(', ')}.` })
  for (const section of draft.sections) {
    if (!section.title.trim()) issues.push({ target: { kind: 'section', sectionKey: section.key }, label: 'Bloque sin título', message: 'Falta el título del bloque.' })
    section.questions.forEach((question, index) => {
      const problems = missing([['título', question.title], ['enunciado', question.prompt]]).map(field => `Falta ${field}.`)
      problems.push(...answerSettingsIssues(question.kind, question.settings))
      if (hasAnswerOptions(question.kind) && (question.options.length < 2 || question.options.some(option => !option.label.trim())))
        problems.push('Necesita al menos dos opciones con texto.')
      if (problems.length) issues.push({
        target: { kind: 'question', sectionKey: section.key, questionKey: question.key },
        label: `${section.title || 'Bloque'} · ${index + 1}. ${question.title || 'Sin título'}`,
        message: problems.join(' '),
      })
    })
  }
  return issues
}
