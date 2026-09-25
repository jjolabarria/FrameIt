import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JourneyMilestone, SessionJourney } from '../types'

function playbackPosition(journey: SessionJourney) {
  const { playback } = journey
  if (playback.state !== 'Playing' || !playback.startedAtUtc) return playback.positionMs
  return Math.min(playback.durationMs, playback.positionMs + Date.now() - Date.parse(playback.startedAtUtc))
}

function StaticJourney({ journey }: { journey: SessionJourney }) {
  return <section className="journey-static" aria-label="Resumen del recorrido de la sesión">
    <div className="journey-static-route" aria-hidden="true" />
    {journey.milestones.map((item, index) => <article key={item.id} className={`journey-static-node journey-static-node--${item.kind}`}>
      <span>{String(index + 1).padStart(2, '0')}</span><div><small>{item.sectionTitle}</small><strong>{item.title}</strong><p>{item.metric} aportaciones{item.topics.length ? ` · ${item.topics.join(' · ')}` : ''}</p></div>
    </article>)}
  </section>
}

function JourneyScene({ journey, progress, onFailed }: { journey: SessionJourney; progress: number; onFailed: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const progressRef = useRef(progress)
  progressRef.current = progress
  useEffect(() => {
    let disposed = false
    let cleanup = () => {}
    void import('three').then(THREE => {
      if (disposed || !host.current) return
      const root = host.current
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#eef3f1')
      scene.fog = new THREE.Fog('#eef3f1', 16, 38)
      const camera = new THREE.PerspectiveCamera(42, 1, .1, 80)
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      root.appendChild(renderer.domElement)
      const count = Math.max(2, journey.milestones.length)
      const points = Array.from({ length: count }, (_, i) => new THREE.Vector3((i - (count - 1) / 2) * 3.2, Math.sin(i * 1.35) * 1.15, Math.cos(i * .82) * 1.2))
      const curve = new THREE.CatmullRomCurve3(points)
      const route = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(48, count * 18), .105, 8, false), new THREE.MeshStandardMaterial({ color: '#137f78', roughness: .55, metalness: .05 }))
      scene.add(route)
      const marker = new THREE.Mesh(new THREE.SphereGeometry(.28, 18, 18), new THREE.MeshStandardMaterial({ color: '#d58d18', roughness: .35 }))
      scene.add(marker)
      journey.milestones.forEach((item, i) => {
        const at = points[Math.min(i, points.length - 1)]
        const size = .32 + Math.min(item.metric, 15) * .025
        const color = item.kind === 'vote' ? '#6652a3' : item.kind === 'consolidation' ? '#137f78' : item.kind === 'presentation' ? '#d58d18' : '#173b50'
        const node = new THREE.Mesh(new THREE.CylinderGeometry(size, size * 1.25, .2, 18), new THREE.MeshStandardMaterial({ color, roughness: .7 }))
        node.position.copy(at); node.position.z += .15; node.rotation.x = Math.PI / 2; scene.add(node)
        if (item.kind === 'vote') item.branches.slice(0, 5).forEach((branch, branchIndex) => {
          const angle = (branchIndex - (item.branches.length - 1) / 2) * .34
          const end = at.clone().add(new THREE.Vector3(Math.sin(angle) * 1.4, Math.cos(angle) * .8, .35))
          const branchCurve = new THREE.QuadraticBezierCurve3(at, at.clone().add(new THREE.Vector3(.45, angle, .65)), end)
          const width = .025 + Math.min(branch.votes, 12) * .008
          scene.add(new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 18, width, 6, false), new THREE.MeshBasicMaterial({ color: branch.isWinner ? '#d58d18' : '#918aa9' })))
        })
      })
      scene.add(new THREE.HemisphereLight('#f7fbf8', '#80949a', 2.4))
      const key = new THREE.DirectionalLight('#fff5df', 3.2); key.position.set(-4, 8, 10); scene.add(key)
      let raf = 0
      const resize = () => { const { clientWidth: w, clientHeight: h } = root; renderer.setSize(w, h, false); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix() }
      const observer = new ResizeObserver(resize); observer.observe(root); resize()
      const render = () => {
        const t = Math.max(0, Math.min(1, progressRef.current))
        const routeT = Math.min(.985, t)
        const point = curve.getPointAt(routeT)
        marker.position.copy(point); marker.position.z += .42
        const overview = t > .88 ? (t - .88) / .12 : 0
        camera.position.lerpVectors(point.clone().add(new THREE.Vector3(-4.5, 5.8, 8.5)), new THREE.Vector3(0, 10, 19), overview)
        camera.lookAt(point.clone().lerp(new THREE.Vector3(0, 0, 0), overview))
        route.rotation.z = Math.sin(t * Math.PI) * .025
        if (!document.hidden) renderer.render(scene, camera)
        raf = requestAnimationFrame(render)
      }
      render()
      cleanup = () => { cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); route.geometry.dispose(); root.replaceChildren(); scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()) } }) }
    }).catch(() => { host.current?.setAttribute('data-webgl-failed', 'true'); onFailed() })
    return () => { disposed = true; cleanup() }
  }, [journey, onFailed])
  return <div className="journey-webgl" ref={host} aria-hidden="true" />
}

export function SessionJourneyView({ journey }: { journey: SessionJourney }) {
  const reduced = useReducedMotion()
  const [webglFailed, setWebglFailed] = useState(false)
  const handleWebglFailure = useCallback(() => setWebglFailed(true), [])
  const [position, setPosition] = useState(() => playbackPosition(journey))
  useEffect(() => { setPosition(playbackPosition(journey)); if (journey.playback.state !== 'Playing') return; const id = window.setInterval(() => setPosition(playbackPosition(journey)), 50); return () => clearInterval(id) }, [journey])
  const progress = Math.min(1, position / journey.playback.durationMs)
  const activeIndex = Math.min(journey.milestones.length - 1, Math.floor(progress * Math.max(1, journey.milestones.length)))
  const active = journey.milestones[Math.max(0, activeIndex)]
  const finale = progress > .88
  const outcomes = useMemo(() => journey.outcomes.slice(0, 4), [journey.outcomes])
  if (reduced || webglFailed) return <div className="journey-shell journey-shell--static"><JourneyHeader journey={journey} /><StaticJourney journey={journey} /><JourneyFinale outcomes={outcomes} /></div>
  return <section className="journey-shell" aria-label="Recorrido de la sesión">
    <JourneyScene journey={journey} progress={progress} onFailed={handleWebglFailure} />
    <JourneyHeader journey={journey} />
    {active && !finale && <motion.article key={active.id} className="journey-caption" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [0.16, 1, 0.3, 1] }}>
      <span>{active.sectionTitle}</span><h1>{active.title}</h1><p>{caption(active)}</p>
      {active.topics.length > 0 && <div className="journey-topics">{active.topics.map(topic => <strong key={topic}>{topic}</strong>)}</div>}
    </motion.article>}
    {finale && <motion.div className="journey-finale-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><JourneyFinale outcomes={outcomes} /></motion.div>}
    <div className="journey-progress" aria-label={`${Math.round(progress * 100)}% completado`}><span style={{ transform: `scaleX(${progress})` }} /></div>
  </section>
}

function JourneyHeader({ journey }: { journey: SessionJourney }) { return <header className="journey-header"><div><span>RECORRIDO DE LA SESIÓN</span><strong>{journey.title}</strong></div><p>{journey.participantCount} participantes · {journey.responseCount} aportaciones</p></header> }
function JourneyFinale({ outcomes }: { outcomes: SessionJourney['outcomes'] }) { return <section className="journey-finale"><span>DESTINO ALCANZADO</span><h1>Lo que decidimos.<br />Lo que viene ahora.</h1>{outcomes.length ? <div>{outcomes.map((item, i) => <article key={`${item.bucket}-${i}`}><small>{item.bucket.replaceAll('-', ' ')}</small><strong>{item.text}</strong></article>)}</div> : <p>El recorrido queda preparado para convertir las aportaciones en el siguiente paso.</p>}</section> }
function caption(item: JourneyMilestone) { if (item.kind === 'presentation') return 'Este contexto preparó el siguiente tramo de la conversación.'; if (item.kind === 'vote') { const winner = item.branches.find(x => x.isWinner); return winner ? `${winner.label} orientó la decisión con ${winner.votes} votos.` : `${item.metric} votos ayudaron a orientar la sesión.` } if (item.kind === 'consolidation') return `${item.metric} aportaciones convergieron en ${item.topics.length} temas compartidos.`; return `${item.metric} aportaciones hicieron avanzar la conversación.` }
