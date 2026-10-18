import { hasAnswerOptions } from '../../lib/session'
import { splitPresentationBody } from '../../lib/presentation'
import type { DesignerQuestionDraft, DesignerSectionDraft, TemplateDraft } from '../../types'

export type QuestionRef = { sectionKey: string; questionKey: string }
export type Selection = { kind: 'template' } | { kind: 'section'; sectionKey: string } | ({ kind: 'question' } & QuestionRef)
export type DesignerState = { draft: TemplateDraft; selection: Selection }
type TemplateField = 'key' | 'title' | 'objective' | 'audience' | 'facilitatorGuidance'
type NodeTarget = { kind: 'section'; sectionKey: string } | ({ kind: 'question' } & QuestionRef)

export type DesignerAction =
  | { type: 'replace'; draft: TemplateDraft }
  | { type: 'select'; selection: Selection }
  | { type: 'setTemplateField'; field: TemplateField; value: string }
  | { type: 'updateSection'; sectionKey: string; patch: Partial<Pick<DesignerSectionDraft, 'title' | 'objective'>> }
  | { type: 'updateQuestion'; at: QuestionRef; patch: Partial<Pick<DesignerQuestionDraft, 'title' | 'prompt' | 'options'>> }
  | { type: 'updatePresentation'; at: QuestionRef; patch: Partial<DesignerQuestionDraft['presentation']> }
  | { type: 'updateSetting'; at: QuestionRef; key: string; value: string }
  | { type: 'changeKind'; at: QuestionRef; kind: string }
  | { type: 'splitSlide'; at: QuestionRef }
  | { type: 'addSection'; questionKind: string }
  | { type: 'addQuestion'; sectionKey: string; kind: string }
  | { type: 'duplicate'; target: NodeTarget }
  | { type: 'remove'; target: NodeTarget }
  | { type: 'move'; target: NodeTarget; direction: -1 | 1 }
  | { type: 'moveToSection'; at: QuestionRef; targetSectionKey: string }

const shortId = () => crypto.randomUUID().slice(0, 8)
const emptyOptions = () => [{ id: crypto.randomUUID(), label: '' }, { id: crypto.randomUUID(), label: '' }]

export function createQuestion(kind = 'ShortText'): DesignerQuestionDraft {
  const slide = kind === 'Presentation'
  return {
    key: `${slide ? 'diapositiva' : 'pregunta'}-${shortId()}`,
    kind,
    title: slide ? 'Nueva diapositiva' : 'Nueva pregunta',
    prompt: slide ? 'Escribe el texto de la diapositiva' : 'Escribe el enunciado de la pregunta',
    options: hasAnswerOptions(kind) ? emptyOptions() : [],
    presentation: {
      timerSeconds: 60,
      responseVisibility: 'AfterClose',
      responseIdentityMode: 'Named',
      showProgress: true,
      allowLateResponses: false,
      celebrationStyle: 'Subtle',
    },
  }
}

export function createSection(index: number, questionKind: string): DesignerSectionDraft {
  return { key: `bloque-${shortId()}`, title: `Bloque ${index + 1}`, objective: 'Nuevo objetivo', order: index + 1, questions: [createQuestion(questionKind)] }
}

export function initialDraft(): TemplateDraft {
  return {
    key: `dinamica-${shortId()}`,
    title: 'Nueva dinámica',
    objective: 'Objetivo de la dinámica',
    audience: 'Participantes del taller',
    facilitatorGuidance: 'Instrucciones internas para el facilitador',
    sections: [{ ...createSection(0, 'ShortText'), key: 'inicio', objective: 'Primer objetivo' }],
  }
}

function cloneQuestion(question: DesignerQuestionDraft, suffix = ''): DesignerQuestionDraft {
  return {
    ...structuredClone(question),
    key: `${question.kind === 'Presentation' ? 'diapositiva' : 'pregunta'}-${shortId()}`,
    title: `${question.title}${suffix}`,
    options: question.options.map(option => ({ ...option, id: crypto.randomUUID() })),
  }
}

function swap<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction
  if (index < 0 || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

const renumber = (sections: DesignerSectionDraft[]) => sections.map((section, index) => ({ ...section, order: index + 1 }))

/** Keeps the selection pointing at something that exists, falling back to the closest parent. */
export function resolveSelection(draft: TemplateDraft, selection: Selection): Selection {
  if (selection.kind === 'template') return selection
  const section = draft.sections.find(s => s.key === selection.sectionKey)
  if (!section) return { kind: 'template' }
  if (selection.kind === 'question' && !section.questions.some(q => q.key === selection.questionKey)) return { kind: 'section', sectionKey: section.key }
  return selection
}

function mapSection(draft: TemplateDraft, sectionKey: string, update: (section: DesignerSectionDraft) => DesignerSectionDraft): TemplateDraft {
  return { ...draft, sections: draft.sections.map(section => section.key === sectionKey ? update(section) : section) }
}

function mapQuestion(draft: TemplateDraft, at: QuestionRef, update: (question: DesignerQuestionDraft) => DesignerQuestionDraft): TemplateDraft {
  return mapSection(draft, at.sectionKey, section => ({ ...section, questions: section.questions.map(question => question.key === at.questionKey ? update(question) : question) }))
}

export function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  const { draft } = state
  switch (action.type) {
    case 'replace':
      return { draft: action.draft, selection: resolveSelection(action.draft, state.selection) }
    case 'select':
      return { ...state, selection: resolveSelection(draft, action.selection) }
    case 'setTemplateField':
      return { ...state, draft: { ...draft, [action.field]: action.value } }
    case 'updateSection':
      return { ...state, draft: mapSection(draft, action.sectionKey, section => ({ ...section, ...action.patch })) }
    case 'updateQuestion':
      return { ...state, draft: mapQuestion(draft, action.at, question => ({ ...question, ...action.patch })) }
    case 'updatePresentation':
      return { ...state, draft: mapQuestion(draft, action.at, question => ({ ...question, presentation: { ...question.presentation, ...action.patch } })) }
    case 'updateSetting':
      return { ...state, draft: mapQuestion(draft, action.at, question => ({ ...question, settings: { ...(question.settings ?? {}), [action.key]: action.value } })) }
    case 'changeKind':
      return {
        ...state,
        draft: mapQuestion(draft, action.at, question => ({
          ...question,
          kind: action.kind,
          // Option-based kinds start with two blanks; slides cannot carry options.
          options: action.kind === 'Presentation' ? [] : hasAnswerOptions(action.kind) && question.options.length === 0 ? emptyOptions() : question.options,
        })),
      }
    case 'splitSlide': {
      const section = draft.sections.find(s => s.key === action.at.sectionKey)
      const index = section?.questions.findIndex(q => q.key === action.at.questionKey) ?? -1
      const slide = section?.questions[index]
      if (!section || !slide || slide.kind !== 'Presentation') return state
      const layout = slide.settings?.slideLayout ?? (slide.settings?.slideImageUrl ? 'media' : 'text')
      const pages = splitPresentationBody(slide.prompt, layout)
      if (pages.length < 2) return state
      const slides = pages.map((prompt, page): DesignerQuestionDraft => ({
        ...slide,
        key: page === 0 ? slide.key : `diapositiva-${shortId()}`,
        prompt,
        settings: {
          ...(slide.settings ?? {}),
          ...(page > 0 && slide.settings?.slideImageUrl ? { slideImageUrl: '', slideImageAlt: '', slideLayout: 'text' } : {}),
          slideSequenceLabel: `Presentación · ${page + 1}/${pages.length}`,
        },
      }))
      return { ...state, draft: mapSection(draft, section.key, current => ({ ...current, questions: [...current.questions.slice(0, index), ...slides, ...current.questions.slice(index + 1)] })) }
    }
    case 'addSection': {
      const section = createSection(draft.sections.length, action.questionKind)
      return { draft: { ...draft, sections: [...draft.sections, section] }, selection: { kind: 'section', sectionKey: section.key } }
    }
    case 'addQuestion': {
      const question = createQuestion(action.kind)
      return {
        draft: mapSection(draft, action.sectionKey, section => ({ ...section, questions: [...section.questions, question] })),
        selection: { kind: 'question', sectionKey: action.sectionKey, questionKey: question.key },
      }
    }
    case 'duplicate': {
      const { target } = action
      const sectionIndex = draft.sections.findIndex(s => s.key === target.sectionKey)
      const section = draft.sections[sectionIndex]
      if (!section) return state
      if (target.kind === 'section') {
        const copy: DesignerSectionDraft = { ...section, key: `bloque-${shortId()}`, title: `${section.title} (copia)`, questions: section.questions.map(question => cloneQuestion(question)) }
        const sections = renumber([...draft.sections.slice(0, sectionIndex + 1), copy, ...draft.sections.slice(sectionIndex + 1)])
        return { draft: { ...draft, sections }, selection: { kind: 'section', sectionKey: copy.key } }
      }
      const index = section.questions.findIndex(q => q.key === target.questionKey)
      if (index < 0) return state
      const copy = cloneQuestion(section.questions[index], ' (copia)')
      return {
        draft: mapSection(draft, section.key, current => ({ ...current, questions: [...current.questions.slice(0, index + 1), copy, ...current.questions.slice(index + 1)] })),
        selection: { kind: 'question', sectionKey: section.key, questionKey: copy.key },
      }
    }
    case 'remove': {
      const { target } = action
      const sectionIndex = draft.sections.findIndex(s => s.key === target.sectionKey)
      const section = draft.sections[sectionIndex]
      if (!section) return state
      if (target.kind === 'section') {
        if (draft.sections.length < 2) return state
        const sections = renumber(draft.sections.filter(s => s.key !== section.key))
        const neighbour = sections[Math.min(sectionIndex, sections.length - 1)]
        return { draft: { ...draft, sections }, selection: { kind: 'section', sectionKey: neighbour.key } }
      }
      if (section.questions.length < 2) return state
      const index = section.questions.findIndex(q => q.key === target.questionKey)
      const questions = section.questions.filter(q => q.key !== target.questionKey)
      const neighbour = questions[Math.min(Math.max(index, 0), questions.length - 1)]
      return {
        draft: mapSection(draft, section.key, current => ({ ...current, questions })),
        selection: { kind: 'question', sectionKey: section.key, questionKey: neighbour.key },
      }
    }
    case 'move': {
      const { target } = action
      if (target.kind === 'section') {
        const index = draft.sections.findIndex(s => s.key === target.sectionKey)
        return { ...state, draft: { ...draft, sections: renumber(swap(draft.sections, index, action.direction)) } }
      }
      return { ...state, draft: mapSection(draft, target.sectionKey, section => ({ ...section, questions: swap(section.questions, section.questions.findIndex(q => q.key === target.questionKey), action.direction) })) }
    }
    case 'moveToSection': {
      const source = draft.sections.find(s => s.key === action.at.sectionKey)
      const question = source?.questions.find(q => q.key === action.at.questionKey)
      if (!source || !question || source.questions.length < 2 || action.targetSectionKey === source.key || !draft.sections.some(s => s.key === action.targetSectionKey)) return state
      const sections = draft.sections.map(section =>
        section.key === source.key ? { ...section, questions: section.questions.filter(q => q.key !== question.key) }
          : section.key === action.targetSectionKey ? { ...section, questions: [...section.questions, question] } : section)
      return { draft: { ...draft, sections }, selection: { kind: 'question', sectionKey: action.targetSectionKey, questionKey: question.key } }
    }
  }
}
