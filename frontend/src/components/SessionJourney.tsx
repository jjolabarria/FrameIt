import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JourneyMilestone, SessionJourney } from '../types'

type MapPoint = { x: number; z: number }
type AtlasLayout = { capitals: Map<string, MapPoint>; regions: Map<string, MapPoint>; width: number; height: number; minX: number; minZ: number }

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => { const t = clamp(value); return clamp(t * t * t * (t * (t * 6 - 15) + 10)) }

// Equal-length chapters keep captions, revisits and arrivals on the same clock.
function journeyFrame(progress: number, count: number) {
  const chapters = Math.max(1, count)
  const chapter = clamp(progress / .88) * chapters
  const index = Math.min(chapters - 1, Math.floor(chapter))
  const local = chapter - index
  const flight = index === chapters - 1 ? smooth((progress - .88) / .065) : smooth((local - .48) / .52)
  return { index, local, flight, curvePosition: (index + flight) / chapters, overview: smooth((progress - .945) / .055) }
}

function playbackPosition(journey: SessionJourney) {
  const { playback } = journey
  if (playback.state !== 'Playing' || !playback.startedAtUtc) return playback.positionMs
  return Math.min(playback.durationMs, playback.positionMs + Date.now() - Date.parse(playback.startedAtUtc))
}

function hash(value: string) {
  let result = 2166136261
  for (let index = 0; index < value.length; index++) result = Math.imul(result ^ value.charCodeAt(index), 16777619)
  return (result >>> 0) / 4294967295
}

function atlasLayout(journey: SessionJourney): AtlasLayout {
  const regions = new Map<string, MapPoint>()
  const capitals = new Map<string, MapPoint>()
  const orderedRegions = [...journey.regions].sort((a, b) => a.order - b.order)
  const columns = Math.max(1, Math.ceil(Math.sqrt(orderedRegions.length)))
  orderedRegions.forEach((region, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const center = { x: (column - (columns - 1) / 2) * 9, z: (row - Math.floor((orderedRegions.length - 1) / columns) / 2) * 7 }
    regions.set(region.id, center)
    const items = journey.milestones.filter(item => item.regionId === region.id)
    items.forEach((item, itemIndex) => {
      const angle = items.length === 1 ? 0 : (itemIndex / items.length) * Math.PI * 2 - Math.PI / 2
      const radius = items.length === 1 ? 0 : 1.65 + (itemIndex % 2) * .55
      capitals.set(item.id, { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius * .72 })
    })
  })
  const points = [...regions.values()]
  const minX = Math.min(...points.map(point => point.x), 0) - 4.5
  const maxX = Math.max(...points.map(point => point.x), 0) + 4.5
  const minZ = Math.min(...points.map(point => point.z), 0) - 3.5
  const maxZ = Math.max(...points.map(point => point.z), 0) + 3.5
  return { capitals, regions, minX, minZ, width: maxX - minX, height: maxZ - minZ }
}

function routeCapitals(journey: SessionJourney) {
  const byId = new Map(journey.milestones.map(item => [item.id, item]))
  const route = journey.route.map(stop => byId.get(stop.capitalId)).filter((item): item is JourneyMilestone => Boolean(item))
  return route.length ? route : journey.milestones
}

function StaticAtlas({ journey, layout, active, finale }: { journey: SessionJourney; layout: AtlasLayout; active?: JourneyMilestone; finale: boolean }) {
  const route = routeCapitals(journey).map(item => layout.capitals.get(item.id)).filter((point): point is MapPoint => Boolean(point))
  const scaleX = (x: number) => ((x - layout.minX) / layout.width) * 1000
  const scaleY = (z: number) => ((z - layout.minZ) / layout.height) * 620
  return <section className="journey-static-atlas" aria-label="Mapa del recorrido de la sesión"><svg viewBox="0 0 1000 620" role="img" aria-label="Regiones y capitales visitadas">
    {journey.regions.map(region => { const point = layout.regions.get(region.id); return point && <g key={region.id}><ellipse className="atlas-region" cx={scaleX(point.x)} cy={scaleY(point.z)} rx={Math.min(190, 115 + region.capitalCount * 8)} ry={Math.min(112, 76 + region.capitalCount * 5)} /><text className="atlas-region-label" x={scaleX(point.x)} y={scaleY(point.z) - 88}>{region.title}</text></g> })}
    {route.length > 1 && <polyline className="atlas-route" points={route.map(point => `${scaleX(point.x)},${scaleY(point.z)}`).join(' ')} />}
    {journey.milestones.map(item => { const point = layout.capitals.get(item.id); if (!point) return null; const selected = active?.id === item.id; return <g key={item.id} className={selected ? 'atlas-capital atlas-capital--active' : 'atlas-capital'}><circle cx={scaleX(point.x)} cy={scaleY(point.z)} r={selected ? 13 : 8} /><circle className="atlas-capital-ring" cx={scaleX(point.x)} cy={scaleY(point.z)} r={selected ? 22 : 13} />{selected && <text x={scaleX(point.x) + 22} y={scaleY(point.z) - 18}>{item.alias}</text>}</g> })}
    {finale && route.at(-1) && <circle className="atlas-destination" cx={scaleX(route.at(-1)!.x)} cy={scaleY(route.at(-1)!.z)} r="28" />}
  </svg></section>
}

function JourneyScene({ journey, layout, onFailed }: { journey: SessionJourney; layout: AtlasLayout; onFailed: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let disposed = false
    let cleanup = () => {}
    void import('three').then(THREE => {
      if (disposed || !host.current) return
      const root = host.current
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#edf3ef')
      const mapSize = Math.max(layout.width, layout.height)
      scene.fog = new THREE.Fog('#edf3ef', Math.max(24, mapSize * 2), Math.max(60, mapSize * 5))
      const camera = new THREE.PerspectiveCamera(38, 1, .1, Math.max(150, mapSize * 8))
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; root.appendChild(renderer.domElement)
      const landMaterials = ['#c8d9ce', '#d7dfc6', '#c4d9d7', '#d9d2ba']
      journey.regions.forEach((region, regionIndex) => {
        const center = layout.regions.get(region.id); if (!center) return
        const shape = new THREE.Shape(); const segments = 18
        for (let index = 0; index < segments; index++) {
          const angle = (index / segments) * Math.PI * 2; const jitter = .86 + hash(`${journey.sessionId}:${region.id}:${index}`) * .24
          const x = center.x + Math.cos(angle) * 3.6 * jitter; const z = center.z + Math.sin(angle) * 2.55 * jitter
          if (index === 0) shape.moveTo(x, z); else shape.lineTo(x, z)
        }
        shape.closePath()
        const terrain = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .28, bevelEnabled: true, bevelSegments: 1, bevelSize: .14, bevelThickness: .08 }), new THREE.MeshStandardMaterial({ color: landMaterials[regionIndex % landMaterials.length], roughness: .92, metalness: 0 }))
        terrain.rotation.x = Math.PI / 2; terrain.position.y = .18; terrain.receiveShadow = true; scene.add(terrain)
        for (let contour = 0; contour < 3; contour++) {
          const contourPoints = Array.from({ length: 49 }, (_, index) => { const angle = (index / 48) * Math.PI * 2; const factor = .43 + contour * .18; return new THREE.Vector3(center.x + Math.cos(angle) * 3.6 * factor, .51 + contour * .014, center.z + Math.sin(angle) * 2.55 * factor) })
          scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(contourPoints), new THREE.LineBasicMaterial({ color: '#78988c', transparent: true, opacity: .3 })))
        }
      })
      const capitalSprites: { id: string; sprite: InstanceType<typeof THREE.Sprite>; ring: InstanceType<typeof THREE.Mesh<InstanceType<typeof THREE.RingGeometry>, InstanceType<typeof THREE.MeshBasicMaterial>>> }[] = []
      const capitalColors: Record<JourneyMilestone['kind'], string> = { presentation: '#d58d18', question: '#173b50', consolidation: '#137f78', vote: '#6652a3' }
      journey.milestones.forEach(item => {
        const point = layout.capitals.get(item.id); if (!point) return
        const size = .22 + Math.min(item.uniqueContributors, 18) * .012
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(size * .72, size, .58, 10), new THREE.MeshStandardMaterial({ color: capitalColors[item.kind], roughness: .68 }))
        tower.position.set(point.x, .79, point.z); tower.castShadow = true; scene.add(tower)
        const crown = new THREE.Mesh(new THREE.ConeGeometry(size * .68, .34, 10), new THREE.MeshStandardMaterial({ color: item.kind === 'vote' ? '#d58d18' : '#f0ead5', roughness: .58 }))
        crown.position.set(point.x, 1.25, point.z); crown.castShadow = true; scene.add(crown)
        const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 1.6, 24), new THREE.MeshBasicMaterial({ color: capitalColors[item.kind], side: THREE.DoubleSide, transparent: true, opacity: .65 }))
        ring.rotation.x = -Math.PI / 2; ring.position.set(point.x, .51, point.z); scene.add(ring)
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96; const context = canvas.getContext('2d')!
        context.font = '700 31px Manrope, sans-serif'; context.textAlign = 'center'; context.fillStyle = '#173b50'; context.fillText(item.alias, 256, 48)
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })); sprite.position.set(point.x, 1.82, point.z); sprite.scale.set(3.2, .6, 1); scene.add(sprite); capitalSprites.push({ id: item.id, sprite, ring })
      })
      const routeItems = routeCapitals(journey)
      const routePoints = routeItems.map(item => layout.capitals.get(item.id)).filter((point): point is MapPoint => Boolean(point)).map(point => new THREE.Vector3(point.x, .72, point.z))
      if (routePoints.length === 0) routePoints.push(new THREE.Vector3(0, .72, 0))
      const destination = routePoints.at(-1)!.clone().add(new THREE.Vector3(2.7, 0, 1.8)); routePoints.push(destination)
      const curve = new THREE.CatmullRomCurve3(routePoints, false, 'centripetal', .4); const samples = curve.getPoints(Math.max(100, routePoints.length * 30))
      const baseLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples), new THREE.LineDashedMaterial({ color: '#137f78', dashSize: .22, gapSize: .12, transparent: true, opacity: .55 })); baseLine.computeLineDistances(); scene.add(baseLine)
      const traveled = new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples), new THREE.LineBasicMaterial({ color: '#d58d18' })); scene.add(traveled)
      const destinationTower = new THREE.Mesh(new THREE.CylinderGeometry(.42, .62, .92, 12), new THREE.MeshStandardMaterial({ color: '#d58d18', roughness: .48 })); destinationTower.position.copy(destination); destinationTower.position.y = .95; destinationTower.castShadow = true; scene.add(destinationTower)
      const destinationRing = new THREE.Mesh(new THREE.TorusGeometry(.86, .06, 8, 32), new THREE.MeshBasicMaterial({ color: '#d58d18' })); destinationRing.rotation.x = Math.PI / 2; destinationRing.position.copy(destination); destinationRing.position.y = .55; scene.add(destinationRing)
      const marker = new THREE.Mesh(new THREE.SphereGeometry(.24, 16, 16), new THREE.MeshStandardMaterial({ color: '#d58d18', roughness: .3, emissive: '#6b4305', emissiveIntensity: .12 })); marker.castShadow = true; scene.add(marker)
      const arrival = new THREE.Mesh(new THREE.RingGeometry(.48, .52, 48), new THREE.MeshBasicMaterial({ color: '#d58d18', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }))
      arrival.rotation.x = -Math.PI / 2; scene.add(arrival)
      scene.add(new THREE.HemisphereLight('#f7fbf8', '#789088', 2.2)); const light = new THREE.DirectionalLight('#fff4da', 3.4); light.position.set(-7, 13, 9); light.castShadow = true; scene.add(light)
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#e2ece7', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = 0; ground.receiveShadow = true; scene.add(ground)
      let raf = 0
      const resize = () => { const { clientWidth: width, clientHeight: height } = root; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix() }
      const observer = new ResizeObserver(resize); observer.observe(root); resize()
      const point = new THREE.Vector3(); const target = new THREE.Vector3(); const closeCamera = new THREE.Vector3()
      const center = new THREE.Vector3(layout.minX + layout.width / 2, 0, layout.minZ + layout.height / 2)
      const overviewCamera = new THREE.Vector3()
      const render = () => {
        const value = clamp(playbackPosition(journey) / Math.max(1, journey.playback.durationMs))
        const frame = journeyFrame(value, routeItems.length)
        curve.getPoint(frame.curvePosition, point)
        marker.position.copy(point); marker.position.y += .34 + Math.sin(frame.flight * Math.PI) * .8
        traveled.geometry.setDrawRange(0, Math.floor(frame.curvePosition * (samples.length - 1)) + 1)
        const activeId = routeItems[frame.index]?.id
        capitalSprites.forEach(({ id, sprite, ring }) => {
          const selected = id === activeId
          const neighbor = id === routeItems[frame.index + 1]?.id || id === routeItems[frame.index - 1]?.id
          sprite.visible = (selected || neighbor) && frame.overview < .8
          sprite.material.opacity = (selected ? 1 - frame.flight * .45 : .45) * (1 - frame.overview)
          ring.scale.setScalar(selected ? 1.3 + (1 - frame.flight) * .25 : 1)
          ring.material.opacity = selected ? .95 : .35
        })
        const pulse = clamp(frame.local / .45)
        arrival.position.copy(routePoints[frame.index]); arrival.position.y = .54
        arrival.scale.setScalar(1 + smooth(pulse) * 2.5); arrival.material.opacity = (1 - pulse) * .65 * (1 - frame.overview)
        destinationRing.scale.setScalar(1 + smooth((value - .88) / .065) * .3)
        const intro = 1 - smooth(value / .045)
        const lift = Math.sin(frame.flight * Math.PI)
        closeCamera.set(point.x - 4.8, point.y + 5.8 + lift * 1.7, point.z + 7.5 + lift)
        const distance = Math.max(14, layout.height * 1.6, layout.width / Math.max(.5, camera.aspect) * 1.5)
        overviewCamera.set(center.x - distance * .22, distance, center.z + distance * .8)
        const wide = Math.max(intro, frame.overview)
        camera.position.lerpVectors(closeCamera, overviewCamera, wide)
        target.copy(point).lerp(center, wide); camera.lookAt(target)
        if (!document.hidden) renderer.render(scene, camera); raf = requestAnimationFrame(render)
      }
      render()
      cleanup = () => { cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); root.replaceChildren(); scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) { object.geometry?.dispose?.(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => { if ('map' in material && material.map) material.map.dispose(); material.dispose() }) } }) }
    }).catch(() => { host.current?.setAttribute('data-webgl-failed', 'true'); onFailed() })
    return () => { disposed = true; cleanup() }
  }, [journey, layout, onFailed])
  return <div className="journey-webgl" ref={host} aria-hidden="true" />
}

export function SessionJourneyView({ journey }: { journey: SessionJourney }) {
  const reduced = useReducedMotion(); const [webglFailed, setWebglFailed] = useState(false); const handleWebglFailure = useCallback(() => setWebglFailed(true), [])
  const [position, setPosition] = useState(() => playbackPosition(journey))
  useEffect(() => { setPosition(playbackPosition(journey)); if (journey.playback.state !== 'Playing') return; const id = window.setInterval(() => setPosition(playbackPosition(journey)), 50); return () => clearInterval(id) }, [journey])
  const layout = useMemo(() => atlasLayout(journey), [journey]); const route = useMemo(() => routeCapitals(journey), [journey]); const progress = clamp(position / Math.max(1, journey.playback.durationMs))
  const finale = progress >= .955; const activeIndex = journeyFrame(progress, route.length).index; const active = route[activeIndex]
  const outcomes = useMemo(() => journey.outcomes.slice(0, 4), [journey.outcomes]); const staticMode = reduced || webglFailed
  return <section className={staticMode ? 'journey-shell journey-shell--static' : 'journey-shell'} aria-label="Recorrido de la sesión">
    {staticMode ? <StaticAtlas journey={journey} layout={layout} active={active} finale={finale} /> : <JourneyScene journey={journey} layout={layout} onFailed={handleWebglFailure} />}
    <JourneyHeader journey={journey} />
    <AnimatePresence mode="wait">{active && progress < .88 && <CapitalCaption key={`${active.id}:${activeIndex}`} item={active} reduced={Boolean(staticMode)} index={activeIndex} count={route.length} />}</AnimatePresence>
    {finale && <motion.div className="journey-finale-wrap" initial={staticMode ? false : { opacity: 0 }} animate={{ opacity: 1 }}><JourneyFinale outcomes={outcomes} /></motion.div>}
    <div className="journey-progress" aria-label={`${Math.round(progress * 100)}% completado`}><span style={{ transform: `scaleX(${progress})` }} /></div>
  </section>
}

function CapitalCaption({ item, reduced, index, count }: { item: JourneyMilestone; reduced: boolean; index: number; count: number }) { return <motion.article className="journey-caption" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: reduced ? 0 : .15 } }} transition={{ duration: reduced ? 0 : .4, ease: [0.16, 1, 0.3, 1] }}>
  <span className="journey-stop-number">PARADA {index + 1} / {count}</span>
  <div className="journey-capital-heading"><span>{item.alias}</span><small>{item.sectionTitle}</small></div><h1>{item.title}</h1><p>{caption(item)}</p>
  {item.kind !== 'presentation' && <div className="journey-real-metrics"><strong>{item.metric}<span>{item.kind === 'vote' ? 'votos' : 'aportaciones'}</span></strong><strong>{item.uniqueContributors}<span>participantes</span></strong></div>}
  {item.topics.length > 0 && <div className="journey-topics">{item.topics.map(topic => <strong key={topic}>{topic}</strong>)}</div>}
  {item.kind === 'vote' && <div className="journey-vote-summary">{item.branches.slice(0, 4).map(branch => <span key={branch.label} className={branch.isWinner ? 'journey-vote-winner' : undefined}>{branch.label} <strong>{branch.votes}</strong></span>)}</div>}
</motion.article> }
function JourneyHeader({ journey }: { journey: SessionJourney }) { return <header className="journey-header"><div><span>ATLAS DE LA SESIÓN</span><strong>{journey.title}</strong></div><p>{journey.participantCount} participantes · {journey.responseCount} aportaciones · {journey.regions.length} regiones</p></header> }
function JourneyFinale({ outcomes }: { outcomes: SessionJourney['outcomes'] }) { return <section className="journey-finale"><span>CAPITAL DE ACUERDOS</span><h1>Lo que decidimos.<br />Lo que viene ahora.</h1>{outcomes.length ? <div>{outcomes.map((item, index) => <article key={`${item.bucket}-${index}`}><small>{item.bucket.replaceAll('-', ' ')}</small><strong>{item.text}</strong></article>)}</div> : <p>No se registraron decisiones o siguientes pasos en esta sesión.</p>}</section> }
function caption(item: JourneyMilestone) { if (item.kind === 'presentation') return 'Este contexto real preparó el siguiente tramo de la conversación.'; if (item.kind === 'vote') { const winners = item.branches.filter(branch => branch.isWinner); return winners.length ? `${winners.map(branch => branch.label).join(' y ')} orientó la decisión con ${winners[0].votes} votos.` : 'La votación no registró votos.' } if (item.kind === 'consolidation') return `${item.metric} aportaciones convergieron en ${item.topics.length} temas publicados.`; return item.metric ? `${item.metric} aportaciones hicieron avanzar la conversación.` : 'Esta capital no recibió aportaciones.' }
