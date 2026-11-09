import type { QuestionOption } from '../types'

export function multipleChoice(settings?: Record<string, string> | null) { return settings?.selectionMode === 'multiple' }

export function choiceLimit(options: QuestionOption[], settings?: Record<string, string> | null) {
  const limit = Number(settings?.maxSelections)
  return Number.isInteger(limit) && limit >= 1 && limit <= 50 ? Math.min(limit, options.length) : options.length
}

export function selectedChoiceIds(value: string, options: QuestionOption[]): string[] | null {
  const legacy = options.find(option => option.label.trim() === value.trim())
  if (legacy) return [legacy.id]
  try {
    const data: unknown = JSON.parse(value)
    if (!data || typeof data !== 'object' || !('selectedOptionIds' in data) || !Array.isArray(data.selectedOptionIds)) return null
    const ids: unknown[] = data.selectedOptionIds
    return ids.every(id => typeof id === 'string' && options.some(option => option.id === id)) && new Set(ids).size === ids.length ? ids as string[] : null
  } catch { return null }
}

export function encodeChoice(ids: string[], options: QuestionOption[]) {
  return ids.length ? JSON.stringify({ selectedOptionIds: options.filter(option => ids.includes(option.id)).map(option => option.id) }) : ''
}

export function formatAnswer(kind: string, value: string, options: QuestionOption[]) {
  if (kind !== 'Choice') return value
  const ids = selectedChoiceIds(value, options)
  return ids ? options.filter(option => ids.includes(option.id)).map(option => option.label).join('\n') : value
}
