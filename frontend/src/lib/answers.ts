import type { QuestionOption } from '../types'

type Settings = Record<string, string> | null | undefined

export function answerLimit(settings: Settings, key: string, fallback: number, maximum: number) {
  const value = Number(settings?.[key])
  return Number.isInteger(value) && value >= 1 && value <= maximum ? value : fallback
}

export function answerSettingsIssues(kind: string, settings: Settings): string[] {
  const issues: string[] = []
  const limits: [string, string, number][] = kind === 'ShortText' ? [['maxLength', 'El límite de caracteres', 300]]
    : kind === 'RichText' ? [['maxLength', 'El límite de caracteres', 12000]]
    : kind === 'StickyNotes' ? [['maxLength', 'Los caracteres por nota', 2000], ['maxIdeas', 'El número de notas', 50]] : []
  for (const [key, label, maximum] of limits) {
    if (settings?.[key] !== undefined && (!/^\d+$/.test(settings[key]) || Number(settings[key]) < 1 || Number(settings[key]) > maximum)) issues.push(`${label} debe estar entre 1 y ${maximum}.`)
  }
  const key = kind === 'ColumnSort' ? 'columns' : kind === 'Matrix' ? 'matrixScale' : null
  if (key && settings?.[key] !== undefined) {
    const values = settings[key].split('\n').map(value => value.trim()).filter(Boolean)
    if (values.length < 2 || values.length > 20 || new Set(values).size !== values.length) issues.push(`${kind === 'Matrix' ? 'La escala necesita' : 'Define'} entre 2 y 20 valores distintos.`)
  }
  return issues
}

export function answerScale(settings: Record<string, string> | null | undefined, key: string, fallback: string[]) {
  const values = [...new Set((settings?.[key] ?? '').split('\n').map(item => item.trim()).filter(Boolean))]
  return values.length >= 2 ? values : fallback
}

export function assignments(value: string, options: QuestionOption[]) {
  return options.map(option => value.split('\n').find(line => line.startsWith(`${option.label}: `))?.slice(option.label.length + 2) ?? '')
}

export function answerComplete(kind: string, value: string, options: QuestionOption[], settings?: Settings) {
  if (!value.trim()) return false
  if (answerSettingsIssues(kind, settings).length) return false
  if (kind === 'ShortText' || kind === 'RichText') return value.length <= answerLimit(settings, 'maxLength', kind === 'ShortText' ? 300 : 6000, kind === 'ShortText' ? 300 : 12000)
  if (kind === 'StickyNotes') {
    const notes = value.split('\n\n').filter(note => note.trim())
    return notes.length <= answerLimit(settings, 'maxIdeas', 20, 50) && notes.every(note => note.length <= answerLimit(settings, 'maxLength', 300, 2000))
  }
  if (kind === 'Choice' || kind === 'Voting') return options.some(option => option.label === value)
  if (kind === 'ColumnSort' || kind === 'Matrix') return assignments(value, options).every(Boolean)
  return true
}
