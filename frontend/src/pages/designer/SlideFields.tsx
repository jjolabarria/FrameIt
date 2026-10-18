import type { ChangeEvent, Dispatch } from 'react'
import { splitPresentationBody } from '../../lib/presentation'
import type { DesignerQuestionDraft } from '../../types'
import type { DesignerAction, QuestionRef } from './draftReducer'

type Props = { at: QuestionRef; slide: DesignerQuestionDraft; busy: boolean; onUploadImage: (file: File) => void; dispatch: Dispatch<DesignerAction> }

export function SlideFields({ at, slide, busy, onUploadImage, dispatch }: Props) {
  const settings = slide.settings ?? {}
  const set = (key: string, value: string) => dispatch({ type: 'updateSetting', at, key, value })
  const pages = splitPresentationBody(slide.prompt, settings.slideLayout ?? 'text').length
  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onUploadImage(file)
    event.target.value = ''
  }
  return <section className="slide-editor">
    <label>Diseño<select value={settings.slideLayout ?? 'text'} onChange={event => set('slideLayout', event.target.value)}>
      <option value="title">Título</option><option value="text">Texto</option><option value="media">Imagen y texto</option><option value="quote">Cita</option>
    </select></label>
    {pages > 1 && <div className="slide-fit-notice" role="status">
      <div><strong>Este contenido necesita más aire</strong><p>Divídelo en {pages} diapositivas para mantener la legibilidad y evitar scroll en la proyección.</p></div>
      <button type="button" className="secondary-button" onClick={() => dispatch({ type: 'splitSlide', at })}>Dividir contenido</button>
    </div>}
    <label>Imagen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} disabled={busy} /><span className="micro-copy">JPG, PNG o WebP · máximo 8 MB</span></label>
    {settings.slideImageUrl && <div className="slide-image-preview"><img src={settings.slideImageUrl} alt="Vista previa de la diapositiva" /><button type="button" className="secondary-button" onClick={() => set('slideImageUrl', '')}>Quitar imagen</button></div>}
    <label>Texto alternativo<input value={settings.slideImageAlt ?? ''} onChange={event => set('slideImageAlt', event.target.value)} /></label>
    <div className="form-grid">
      <label>Enlace opcional<input type="url" value={settings.slideLinkUrl ?? ''} onChange={event => set('slideLinkUrl', event.target.value)} placeholder="https://" /></label>
      <label>Texto del enlace<input value={settings.slideLinkLabel ?? ''} onChange={event => set('slideLinkLabel', event.target.value)} placeholder="Abrir recurso" /></label>
    </div>
  </section>
}
