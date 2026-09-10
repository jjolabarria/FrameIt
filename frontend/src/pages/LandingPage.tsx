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
  { name: 'Preparar', summary: 'Define las preguntas', title: 'Prepara el taller.', body: 'Define las preguntas y su orden para centrar el tiempo juntos en lo que necesitáis resolver.' },
  { name: 'Facilitar', summary: 'El equipo participa', title: 'Da voz al equipo.', body: 'El equipo entra con un código o QR, sin crear una cuenta. Cada persona responde desde su dispositivo mientras tú guías las rondas.' },
  { name: 'Recoger', summary: 'Conserva las aportaciones', title: 'Conserva lo trabajado.', body: 'Exporta las preguntas y aportaciones en PDF. Compártelas para retomar el trabajo cuando llegue el momento de decidir.' },
]

export function LandingPage() {
  const [stage, setStage] = useState(0)
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
        <div className="lp-hero-copy"><p className="lp-kicker">Para equipos con mucho que aportar</p><h1 id="hero-title">Haz que cada<br className="lp-desktop-break" /> taller cuente.</h1><p className="lp-intro">Las mejores ideas de tu equipo merecen salir a la luz. Con FrameIt, da voz a cada persona y convierte lo que descubrís juntos en el punto de partida para avanzar.</p><div className="lp-hero-actions"><Link className="lp-button" to="/join">Entrar a una sesión <ArrowRight size={19} /></Link><div className="lp-facilitator-cta"><Link className="lp-text-link" to="/espacio">Preparar mi taller <ArrowUpRight size={17} /></Link><small>Acceso para facilitadores con cuenta</small></div></div><p className="lp-access-note">¿Te han invitado? Tu equipo te espera. Entra con el código o el enlace, sin crear una cuenta.</p></div>
        <figure className="lp-hero-visual"><img src="/images/workshop-to-project.jpg" alt="" width="960" height="640" fetchPriority="high" /><figcaption>Las ideas son del equipo.<br />El siguiente paso empieza aquí.</figcaption></figure>
        </div>
      </section>
      <section id="como-funciona" className="lp-workshop lp-width" aria-labelledby="workflow-title">
        <div className="lp-workshop-heading">
          <div className="lp-workshop-heading-main">
            <p className="lp-kicker">Cómo funciona FrameIt</p>
            <h2 id="workflow-title">Prepara el taller. Da voz al equipo. Conserva lo aprendido.</h2>
          </div>
          <div className="lp-workshop-heading-aside">
            <p className="lp-workshop-intro">Tú guías la sesión; el equipo aporta. Descubre cómo una pregunta pasa del guion del taller a su documentación.</p>
            <p className="lp-example-label">Explora un taller de ejemplo</p>
          </div>
        </div>
        <div className="lp-stage-controls" role="group" aria-label="Explorar las etapas del taller">
          {stages.map((item, index) => <button type="button" key={item.name} aria-pressed={stage === index} aria-controls="stage-content" onClick={() => { setStage(index); setRevealed(false) }}>
            <span className="lp-stage-name"><span>0{index + 1}</span>{item.name}</span>
            <span className="lp-stage-summary">{item.summary}</span>
          </button>)}
        </div>
        <p className="lp-announcement" role="status">Etapa {stage + 1} de 3: {stages[stage].title}{stage === 1 ? revealed ? ' Respuestas compartidas.' : ' Una aportación del equipo.' : ''}</p>
        <div className="lp-workshop-body">
          <aside className="lp-stage-caption">
            <p className="lp-kicker">Un ejemplo: mejorar el trabajo diario</p>
            <h3>{stages[stage].title}</h3><p>{stages[stage].body}</p>
          </aside>
          <div id="stage-content" className={`lp-scene${stage === 2 ? ' lp-scene-document' : ''}`}>
            <div className="lp-scene-status"><span>{stage === 0 ? 'Agenda del taller' : stage === 1 ? 'Ronda 01 · Pregunta abierta' : 'Extracto del documento'}</span><span className="lp-state">{stage === 0 ? 'Preparada' : stage === 1 ? revealed ? 'Respuestas compartidas' : 'El equipo aporta' : 'PDF'}</span></div>
            {stage === 2 && <p className="lp-document-title">Taller · Mejorar el trabajo diario</p>}
            <h3 className="lp-question">{question}</h3>
            <div className="lp-scene-content">
              {stage === 0 && <div className="lp-agenda"><p>Esta pregunta abre el taller. Las siguientes ayudan a explorar oportunidades y recoger propuestas.</p><ol>{['Identificar tareas repetitivas', 'Explorar oportunidades', 'Recoger propuestas'].map((item, index) => <li key={item}><span>0{index + 1}</span><strong>{item}</strong></li>)}</ol></div>}
              {stage === 1 && <>
                <ol className="lp-participant-path" aria-label="Cómo participa el equipo"><li>Entra con código o QR</li><li>Responde desde su dispositivo</li></ol>
                <div className="lp-contribution"><p className="lp-response-label">Una aportación del equipo</p><blockquote>{answers[0]}</blockquote></div>
                <p className="lp-sharing-note">En este ejemplo, el facilitador decide cuándo compartir las respuestas con el grupo.</p>
                <button type="button" className="lp-reveal" aria-expanded={revealed} aria-controls="example-responses" onClick={() => setRevealed(value => !value)}>{revealed ? 'Ocultar respuestas' : 'Mostrar respuestas'}<ArrowRight size={18} /></button>
                <div id="example-responses" className="lp-responses" hidden={!revealed}><p className="lp-response-label">Respuestas compartidas con el grupo</p><ul>{answers.map(answer => <li key={answer}>{answer}</li>)}</ul></div>
              </>}
              {stage === 2 && <div className="lp-responses"><p className="lp-response-label">Aportaciones del equipo</p><ul>{answers.map(answer => <li key={answer}>{answer}</li>)}</ul><p className="lp-record-note">Las aportaciones mantienen el contexto de cada pregunta.</p></div>}
            </div>
            {stage !== 1 && <div className="lp-scene-footer"><p>{stage === 0 ? 'Tú preparas las preguntas y guías la sesión.' : 'Exporta la documentación de la sesión en PDF.'}</p></div>}
          </div>
        </div>
        <p className="lp-example-note">Demostración ilustrativa con respuestas ficticias.</p>
      </section>
      <section className="lp-continuity lp-width" aria-labelledby="continuity-title"><div className="lp-continuity-copy"><p className="lp-kicker">Que las buenas ideas tengan recorrido</p><h2 id="continuity-title">Llévate el impulso<br />del equipo.</h2></div><div><p>Habéis dedicado tiempo a pensar juntos. Haz que ese trabajo siga siendo útil: comparte lo aprendido y retómalo cuando llegue el momento de decidir o volver a reuniros.</p><p className="lp-project-path">Lo que aporta el equipo se queda contigo.</p><div className="lp-facilitator-cta"><Link className="lp-text-link" to="/espacio">Preparar mi próximo taller <ArrowUpRight size={18} /></Link><small>Acceso para facilitadores con cuenta</small></div></div></section>
      <section id="participar" className="lp-join" aria-labelledby="join-title"><div className="lp-width lp-join-grid"><div><p className="lp-kicker">Tu perspectiva también cuenta</p><h2 id="join-title">¿Te sumas<br />al taller?</h2><p>Entra con el código que te han compartido y aporta tu punto de vista. También puedes seguir los resultados sin participar.</p></div><SessionCodeForm /></div></section>
    </main>
    <div className="lp-footer lp-width"><Link to="/" className="lp-brand"><Brand /></Link><p>El valor de pensar juntos.</p><a href="#producto">Volver arriba ↑</a></div>
    <LegalFooter />
  </div>
}
