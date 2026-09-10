import { LegalFooter } from '../components/LegalFooter'
import { Brand } from '../components/Brand'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { SessionCodeForm } from '../components/SessionCodeForm'
import './LandingPage.css'

const question = '¿Qué tarea repetitiva nos quita más tiempo?'
const answers = ['Preparar el resumen de cada reunión.', 'Buscar la última versión de un documento.', 'Copiar datos entre herramientas.']
const stages = [
  { name: 'Preparar', title: 'Llega al taller con el rumbo claro.', body: 'Una buena pregunta puede cambiar la conversación. Prepara el camino para que el tiempo juntos se dedique a lo que de verdad necesitáis resolver.' },
  { name: 'Facilitar', title: 'Haz sitio a las ideas de todo el equipo.', body: 'También a las de quienes suelen hablar menos. Cada persona tiene su espacio para aportar y tú puedes centrarte en llevar la conversación hacia lo que importa.' },
  { name: 'Recoger', title: 'Aprovecha lo que habéis descubierto.', body: 'El esfuerzo del equipo merece tener recorrido. Reúne sus aportaciones y compártelas para dar el siguiente paso con una base común.' },
]

export function LandingPage() {
  const [stage, setStage] = useState(1)
  const [revealed, setRevealed] = useState(false)
  return <div className="landing">
    <a className="skip-link" href="#producto">Saltar al contenido</a>
    <header className="lp-header lp-width">
      <Link to="/" className="lp-brand" aria-label="FrameIt, inicio"><Brand /></Link>
      <nav aria-label="Navegación del producto"><a href="#como-funciona">Cómo funciona</a><Link to="/join">Entrar a una sesión</Link></nav>
      <Link className="lp-access" to="/espacio">Facilitadores <ArrowUpRight size={17} /></Link>
    </header>
    <main id="producto">
      <section className="lp-hero-band" aria-labelledby="hero-title"><div className="lp-hero lp-width">
        <div className="lp-hero-copy"><p className="lp-kicker">Para equipos con mucho que aportar</p><h1 id="hero-title">Haz que cada<br className="lp-desktop-break" /> taller cuente.</h1><p className="lp-intro">Las mejores ideas de tu equipo merecen salir a la luz. Con FrameIt, da voz a cada persona y convierte lo que descubrís juntos en el punto de partida para avanzar.</p><div className="lp-hero-actions"><Link className="lp-button" to="/join">Entrar a una sesión <ArrowRight size={19} /></Link><Link className="lp-text-link" to="/espacio">Preparar mi taller <ArrowUpRight size={17} /></Link></div><p className="lp-access-note">¿Te han invitado? Tu equipo te espera. Entra con el código o el enlace, sin crear una cuenta.</p></div>
        <figure className="lp-hero-visual"><img src="/images/workshop-to-project.jpg" alt="" width="960" height="640" fetchPriority="high" /><figcaption>Las ideas son del equipo.<br />El siguiente paso empieza aquí.</figcaption></figure>
        </div>
      </section>
      <section id="como-funciona" className="lp-workshop lp-width" aria-labelledby="workflow-title">
        <div className="lp-workshop-heading"><h2 id="workflow-title">Así empieza una conversación que merece la pena.</h2><span className="lp-example-label">Pruébalo con este ejemplo</span></div>
        <div className="lp-stage-controls" role="group" aria-label="Explorar las etapas del taller">{stages.map((item, index) => <button type="button" key={item.name} aria-pressed={stage === index} aria-controls="stage-content" onClick={() => { setStage(index); setRevealed(false) }}><span>0{index + 1}</span>{item.name}</button>)}</div>
        <div className="lp-workshop-body">
          <aside className="lp-stage-caption"><p className="lp-kicker">Imagina tu próximo taller de IA</p><div aria-live="polite" aria-atomic="true"><h3>{stages[stage].title}</h3><p>{stages[stage].body}</p></div><p className="lp-example-note">Recorre este taller de ejemplo y descubre qué puede aportar el equipo. Los datos son ficticios.</p></aside>
          <div id="stage-content" className="lp-scene">
            <div className="lp-scene-status"><span>{stage === 0 ? 'Agenda del taller' : stage === 1 ? 'Ronda 01 · Pregunta abierta' : 'Documento de la sesión'}</span><span className="lp-state" data-active={stage === 1 && !revealed}>{stage === 0 ? 'Preparada' : stage === 1 ? revealed ? 'Resultados publicados' : 'Ronda abierta' : 'Sesión recogida'}</span></div>
            <h3 className="lp-question">{question}</h3>
            <div id="example-responses" className="lp-scene-content" aria-live="polite" aria-atomic="true">
              {stage === 0 ? <div className="lp-agenda"><p>Esta pregunta abre el taller. Después, el equipo podrá explorar dónde aplicar lo aprendido.</p><ol>{['Identificar tareas repetitivas', 'Explorar oportunidades', 'Recoger propuestas'].map((item, index) => <li key={item}><span>0{index + 1}</span><strong>{item}</strong></li>)}</ol></div> : stage === 1 && !revealed ? <div className="lp-awaiting"><span className="lp-response-mark" aria-hidden="true">“</span><p>Las respuestas aún no se muestran al grupo.</p><span>El facilitador decide cuándo publicarlas.</span></div> : <div className="lp-responses"><p className="lp-response-label">{stage === 2 ? 'Extracto de la documentación · Ejemplo' : 'Respuestas del equipo · Ejemplo'}</p><ul>{answers.map(answer => <li key={answer}>{answer}</li>)}</ul>{stage === 2 && <p className="lp-record-note">Las respuestas conservan la pregunta que les dio contexto.</p>}</div>}
            </div>
            <div className="lp-scene-footer">{stage === 1 ? <button type="button" className="lp-reveal" aria-expanded={revealed} aria-controls="example-responses" onClick={() => setRevealed(value => !value)}>{revealed ? 'Ocultar resultados de ejemplo' : 'Ver resultados de ejemplo'}<ArrowRight size={18} /></button> : <p>{stage === 0 ? 'La secuencia se prepara antes de abrir la sesión.' : 'Documentación disponible en PDF al cerrar la sesión.'}</p>}<span>Vista ilustrativa</span></div>
          </div>
        </div>
      </section>
      <section className="lp-continuity lp-width" aria-labelledby="continuity-title"><div className="lp-continuity-copy"><p className="lp-kicker">Que las buenas ideas tengan recorrido</p><h2 id="continuity-title">Llévate el impulso<br />del equipo.</h2></div><div><p>Habéis dedicado tiempo a pensar juntos. Haz que ese trabajo siga siendo útil: comparte lo aprendido y retómalo cuando llegue el momento de decidir o volver a reuniros.</p><p className="lp-project-path">Lo que aporta el equipo se queda contigo.</p><Link className="lp-text-link" to="/espacio">Preparar mi próximo taller <ArrowUpRight size={18} /></Link></div></section>
      <section id="participar" className="lp-join" aria-labelledby="join-title"><div className="lp-width lp-join-grid"><div><p className="lp-kicker">Tu perspectiva también cuenta</p><h2 id="join-title">¿Te sumas<br />al taller?</h2><p>Entra con el código que te han compartido y aporta tu punto de vista. También puedes seguir los resultados sin participar.</p></div><SessionCodeForm /></div></section>
    </main>
    <div className="lp-footer lp-width"><Link to="/" className="lp-brand"><Brand /></Link><p>El valor de pensar juntos.</p><a href="#producto">Volver arriba ↑</a></div>
    <LegalFooter />
  </div>
}
