import { useState, type Dispatch } from 'react'
import { Disclosure } from '../../components/SessionUI'
import type { TemplateDraft } from '../../types'
import type { DesignerAction } from './draftReducer'

export function TemplateFields({ draft, dispatch }: { draft: TemplateDraft; dispatch: Dispatch<DesignerAction> }) {
  const [showJson, setShowJson] = useState(false)
  const set = (field: 'key' | 'title' | 'objective' | 'audience' | 'facilitatorGuidance') => (event: { target: { value: string } }) => dispatch({ type: 'setTemplateField', field, value: event.target.value })
  return <>
    <div className="panel-head"><div><p className="section-label">Ficha de la plantilla</p><h2>{draft.title || 'Sin título'}</h2></div></div>
    <div className="form-grid">
      <label>Título<input value={draft.title} onChange={set('title')} /></label>
      <label>Audiencia<input value={draft.audience} onChange={set('audience')} /></label>
    </div>
    <label>Objetivo<textarea rows={3} value={draft.objective} onChange={set('objective')} /></label>
    <label>Guía interna<textarea rows={4} value={draft.facilitatorGuidance ?? ''} onChange={set('facilitatorGuidance')} /></label>
    <Disclosure title="Opciones avanzadas">
      <label>Clave de la plantilla<input value={draft.key} onChange={set('key')} /></label>
      <button className="secondary-button" onClick={() => setShowJson(current => !current)} type="button">{showJson ? 'Ocultar JSON' : 'Ver JSON'}</button>
      {showJson && <pre className="json-preview">{JSON.stringify(draft, null, 2)}</pre>}
    </Disclosure>
  </>
}
