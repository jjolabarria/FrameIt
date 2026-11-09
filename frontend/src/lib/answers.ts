import type { QuestionOption } from '../types'

export function answerScale(settings: Record<string, string> | null | undefined, key: string, fallback: string[]) {
  const values = [...new Set((settings?.[key] ?? '').split('\n').map(item => item.trim()).filter(Boolean))]
  return values.length >= 2 ? values : fallback
}

export function assignments(value: string, options: QuestionOption[]) {
  return options.map(option => value.split('\n').find(line => line.startsWith(`${option.label}: `))?.slice(option.label.length + 2) ?? '')
}

export function answerComplete(kind: string, value: string, options: QuestionOption[]) {
  if (!value.trim()) return false
  if (kind === 'Choice' || kind === 'Voting') return options.some(option => option.label === value)
  if (kind === 'ColumnSort' || kind === 'Matrix') return assignments(value, options).every(Boolean)
  return true
}
