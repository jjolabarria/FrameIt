import { useEffect, useReducer, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { api } from '../../lib/api'
import type { TemplateDefinition, TemplateDraft } from '../../types'
import { designerReducer, initialDraft } from './draftReducer'

function toDraft(source: TemplateDefinition, editing: boolean): TemplateDraft {
  return {
    key: editing ? source.key : `dinamica-${crypto.randomUUID().slice(0, 8)}`,
    title: editing ? source.title : `${source.title.slice(0, 189)} — variante`,
    objective: source.objective,
    audience: source.audience,
    facilitatorGuidance: source.facilitatorGuidance ?? '',
    sections: source.sections,
  }
}

export function useTemplateDraft(sourceId: string | null, editId: string | null) {
  const [state, dispatch] = useReducer(designerReducer, undefined, () => ({ draft: initialDraft(), selection: { kind: 'template' } as const }))
  const [sourceLoading, setSourceLoading] = useState(!!sourceId)
  const [sourceError, setSourceError] = useState('')
  const [baseline, setBaseline] = useState(() => JSON.stringify(state.draft))
  const saved = useRef(false)

  useEffect(() => {
    if (!sourceId) return
    const controller = new AbortController()
    void api<TemplateDefinition>(`/api/templates/${encodeURIComponent(sourceId)}`, { signal: controller.signal }).then(source => {
      if (controller.signal.aborted) return
      const draft = toDraft(source, !!editId)
      dispatch({ type: 'replace', draft })
      setBaseline(JSON.stringify(draft))
      setSourceLoading(false)
    }).catch((reason: Error) => { if (!controller.signal.aborted) { setSourceError(reason.message); setSourceLoading(false) } })
    return () => controller.abort()
  }, [editId, sourceId])

  const dirty = JSON.stringify(state.draft) !== baseline
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saved.current && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && !saved.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return { ...state, dispatch, sourceLoading, sourceError, dirty, blocker, markSaved: () => { saved.current = true } }
}
