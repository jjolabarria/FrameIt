import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JourneyMilestone, SessionJourney } from '../types'
import { cameraClearance, createTerrainHeight, terrainContours } from './journeyTerrain'
import { JourneyClock } from './journeyPlayback'

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
  const contours = useMemo(() => {
    const trail = routeCapitals(journey).map(item => layout.capitals.get(item.id)).filter((point): point is MapPoint => Boolean(point))
    const height = createTerrainHeight(hash(journey.sessionId), layout, trail)
    const vertices: number[] = []; const indices: number[] = []
    const columns = 70; const rows = 50
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const x = layout.minX + column / columns * layout.width; const z = layout.minZ + row / rows * layout.height
      vertices.push(x, height(x, z), z)
      if (column < columns && row < rows) { const a = row * (columns + 1) + column; indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1) }
    }
    return Object.entries(terrainContours(vertices, indices, .5)).map(([kind, points]) => {
      let path = ''
      for (let index = 0; index < points.length; index += 6) path += `M${(points[index] - layout.minX) / layout.width * 1000},${(points[index + 2] - layout.minZ) / layout.height * 620}L${(points[index + 3] - layout.minX) / layout.width * 1000},${(points[index + 5] - layout.minZ) / layout.height * 620}`
      return { kind, path }
    })
  }, [journey, layout])
  const route = routeCapitals(journey).map(item => layout.capitals.get(item.id)).filter((point): point is MapPoint => Boolean(point))
  const scaleX = (x: number) => ((x - layout.minX) / layout.width) * 1000
  const scaleY = (z: number) => ((z - layout.minZ) / layout.height) * 620
  return <section className="journey-static-atlas" aria-label="Mapa del recorrido de la sesión"><svg viewBox="0 0 1000 620" role="img" aria-label="Regiones y capitales visitadas">
    <rect width="1000" height="620" fill="#d6ddc4" />
    {contours.map(contour => <path key={contour.kind} d={contour.path} fill="none" stroke="#6e8060" strokeWidth={contour.kind === 'major' ? 1.3 : .7} opacity={contour.kind === 'major' ? .6 : .35} />)}
    {route.length > 1 && <polyline className="atlas-route" points={route.map(point => `${scaleX(point.x)},${scaleY(point.z)}`).join(' ')} />}
    {journey.milestones.map(item => { const point = layout.capitals.get(item.id); if (!point) return null; const selected = active?.id === item.id; return <g key={item.id} transform={`translate(${scaleX(point.x)},${scaleY(point.z)})`}><path d="M0 0V-32" stroke="#526449" strokeWidth="3" /><path d="M1 -32H26L20 -23L26 -14H1Z" fill={selected ? '#c83c32' : '#173b50'} />{selected && <g transform="translate(-18,-5)"><path d="M0 0 C-7 -10 -17 -21 -17 -31 A17 17 0 1 1 17 -31 C17 -21 7 -10 0 0Z" fill="#c83c32" stroke="#fff8ed" strokeWidth="2" /><circle cx="0" cy="-31" r="6" fill="#fff8ed" /></g>}</g> })}
    {finale && route.at(-1) && <circle className="atlas-destination" cx={scaleX(route.at(-1)!.x)} cy={scaleY(route.at(-1)!.z)} r="28" />}
  </svg></section>
}

function JourneyScene({ journey, layout, clock, duration, onFailed }: { journey: SessionJourney; layout: AtlasLayout; clock: JourneyClock; duration: number; onFailed: () => void }) {
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
      const routeItems = routeCapitals(journey)
      const routePoints = routeItems.map(item => layout.capitals.get(item.id)).filter((point): point is MapPoint => Boolean(point)).map(point => new THREE.Vector3(point.x, 0, point.z))
      if (routePoints.length === 0) routePoints.push(new THREE.Vector3())
      const destination = routePoints.at(-1)!.clone().add(new THREE.Vector3(2.7, 0, 1.8)); routePoints.push(destination)
      const curve = new THREE.CatmullRomCurve3(routePoints, false, 'centripetal', .4)
      const samples = curve.getPoints(Math.max(240, routePoints.length * 40))
      const terrainBounds = { minX: layout.minX - 5, minZ: layout.minZ - 5, width: layout.width + 10, height: layout.height + 10 }
      const terrainHeight = createTerrainHeight(hash(journey.sessionId), terrainBounds, curve.getPoints(Math.min(600, Math.max(180, routePoints.length * 12))))
      const terrainGeometry = new THREE.PlaneGeometry(terrainBounds.width, terrainBounds.height, Math.min(220, Math.ceil(terrainBounds.width * 8)), Math.min(220, Math.ceil(terrainBounds.height * 8)))
      terrainGeometry.rotateX(-Math.PI / 2)
      terrainGeometry.translate(terrainBounds.minX + terrainBounds.width / 2, 0, terrainBounds.minZ + terrainBounds.height / 2)
      const vertices = terrainGeometry.attributes.position
      const colors = new Float32Array(vertices.count * 3)
      const palette = ['#789c83', '#a6b593', '#cec4a1', '#b8aa91', '#e9e4d5'].map(color => new THREE.Color(color))
      const tint = new THREE.Color()
      for (let index = 0; index < vertices.count; index++) {
        const elevation = terrainHeight(vertices.getX(index), vertices.getZ(index))
        vertices.setY(index, elevation)
        const band = clamp(elevation / 5.2) * (palette.length - 1)
        const lower = Math.min(palette.length - 2, Math.floor(band))
        tint.copy(palette[lower]).lerp(palette[lower + 1], band - lower)
        tint.toArray(colors, index * 3)
      }
      terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); terrainGeometry.computeVertexNormals()
      const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }))
      terrain.receiveShadow = true; terrain.castShadow = true; scene.add(terrain)
      const contours = terrainContours(vertices.array, terrainGeometry.index!.array)
      for (const [kind, points] of Object.entries(contours)) {
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
        scene.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#526449', transparent: true, opacity: kind === 'major' ? .52 : .25, depthWrite: false })))
      }
      samples.forEach(point => { point.y = terrainHeight(point.x, point.z) + .1 })
      const capitalRings: { id: string; ring: InstanceType<typeof THREE.Mesh<InstanceType<typeof THREE.RingGeometry>, InstanceType<typeof THREE.MeshBasicMaterial>>> }[] = []
      const flags: { id: string; color: string; flag: InstanceType<typeof THREE.Mesh<InstanceType<typeof THREE.PlaneGeometry>, InstanceType<typeof THREE.MeshBasicMaterial>>> }[] = []
      const addFlag = (id: string, x: number, y: number, z: number, color: string) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, 1.25, 6), new THREE.MeshStandardMaterial({ color: '#526449', roughness: .8 }))
        pole.position.set(x, y + .625, z); pole.castShadow = true; scene.add(pole)
        const fabric = new THREE.PlaneGeometry(.76, .43, 8, 2); fabric.translate(.38, .99, 0)
        const flag = new THREE.Mesh(fabric, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }))
        flag.position.set(x, y, z); scene.add(flag); flags.push({ id, color, flag })
      }
      const capitalColors: Record<JourneyMilestone['kind'], string> = { presentation: '#d58d18', question: '#173b50', consolidation: '#137f78', vote: '#6652a3' }
      journey.milestones.forEach(item => {
        const point = layout.capitals.get(item.id); if (!point) return
        const elevation = terrainHeight(point.x, point.z)
        const size = .22 + Math.min(item.uniqueContributors, 18) * .012
        addFlag(item.id, point.x, elevation, point.z, capitalColors[item.kind])
        const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 1.6, 24), new THREE.MeshBasicMaterial({ color: capitalColors[item.kind], side: THREE.DoubleSide, transparent: true, opacity: .65 }))
        ring.rotation.x = -Math.PI / 2; ring.position.set(point.x, elevation + .08, point.z); scene.add(ring)
        capitalRings.push({ id: item.id, ring })
      })
      const baseLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples), new THREE.LineDashedMaterial({ color: '#137f78', dashSize: .22, gapSize: .12, transparent: true, opacity: .55 })); baseLine.computeLineDistances(); scene.add(baseLine)
      const traveled = new THREE.Line(new THREE.BufferGeometry().setFromPoints(samples), new THREE.LineBasicMaterial({ color: '#d58d18' })); scene.add(traveled)
      class SurfaceRoute extends THREE.Curve<InstanceType<typeof THREE.Vector3>> {
        constructor() { super() }
        getPoint(t: number, target = new THREE.Vector3()) {
          curve.getPoint(t, target); target.y = terrainHeight(target.x, target.z) + .12
          return target
        }
      }
      const surfaceRoute = new SurfaceRoute()
      const roadSegments = Math.min(1800, Math.max(360, routePoints.length * 45))
      const road = new THREE.Mesh(new THREE.TubeGeometry(surfaceRoute, roadSegments, .055, 5, false), new THREE.MeshBasicMaterial({ color: '#e6a42c' }))
      scene.add(road)
      const trailGeometry = new THREE.SphereGeometry(.085, 8, 6)
      const trail = Array.from({ length: 10 }, () => {
        const spark = new THREE.Mesh(trailGeometry, new THREE.MeshBasicMaterial({ color: '#fff2c5', transparent: true, depthWrite: false }))
        scene.add(spark); return spark
      })
      const destinationElevation = terrainHeight(destination.x, destination.z)
      addFlag('destination', destination.x, destinationElevation, destination.z, '#d58d18')
      const destinationRing = new THREE.Mesh(new THREE.TorusGeometry(.86, .06, 8, 32), new THREE.MeshBasicMaterial({ color: '#d58d18' })); destinationRing.rotation.x = Math.PI / 2; destinationRing.position.copy(destination); destinationRing.position.y = destinationElevation + .16; scene.add(destinationRing)
      const pinCanvas = document.createElement('canvas'); pinCanvas.width = 128; pinCanvas.height = 180
      const pin = pinCanvas.getContext('2d')!
      pin.beginPath(); pin.moveTo(64, 174); pin.bezierCurveTo(48, 140, 12, 100, 12, 64); pin.arc(64, 64, 52, Math.PI, Math.PI * 2); pin.bezierCurveTo(116, 100, 80, 140, 64, 174)
      pin.closePath(); pin.fillStyle = '#c83c32'; pin.fill(); pin.strokeStyle = '#fff8ed'; pin.lineWidth = 5; pin.stroke()
      pin.beginPath(); pin.arc(64, 64, 19, 0, Math.PI * 2); pin.fillStyle = '#fff8ed'; pin.fill()
      const pinTexture = new THREE.CanvasTexture(pinCanvas); pinTexture.colorSpace = THREE.SRGBColorSpace
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTexture, depthTest: false, depthWrite: false })); marker.center.set(.5, 0); marker.scale.set(.85, 1.2, 1); marker.renderOrder = 10; scene.add(marker)
      const arrival = new THREE.Mesh(new THREE.RingGeometry(.48, .52, 48), new THREE.MeshBasicMaterial({ color: '#d58d18', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }))
      arrival.rotation.x = -Math.PI / 2; scene.add(arrival)
      scene.add(new THREE.HemisphereLight('#f7fbf8', '#789088', 1.8)); const light = new THREE.DirectionalLight('#fff4da', 2.2); light.position.set(-7, 13, 9); light.castShadow = true; scene.add(light)
      light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -mapSize; light.shadow.camera.right = mapSize; light.shadow.camera.top = mapSize; light.shadow.camera.bottom = -mapSize; light.shadow.bias = -.001; light.shadow.normalBias = .06
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#e2ece7', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = 0; ground.receiveShadow = true; scene.add(ground)
      let raf = 0
      const resize = () => { const { clientWidth: width, clientHeight: height } = root; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix() }
      const observer = new ResizeObserver(resize); observer.observe(root); resize()
      const point = new THREE.Vector3(); const target = new THREE.Vector3(); const closeCamera = new THREE.Vector3()
      const center = new THREE.Vector3(layout.minX + layout.width / 2, 0, layout.minZ + layout.height / 2)
      const overviewCamera = new THREE.Vector3()
      let cameraAngle = -.55; let targetAngle = cameraAngle; let cameraAltitude = 12
      let previousSeconds: number | null = null; let nextCameraSearch = 0
      let previousFrameTime = performance.now()
      const render = () => {
        const position = clock.read()
        const value = clamp(position / Math.max(1, duration))
        const seconds = position / 1000
        const frame = journeyFrame(value, routeItems.length)
        curve.getPoint(frame.curvePosition, point)
        point.y = terrainHeight(point.x, point.z) + .1
        marker.position.copy(point); marker.position.y += .14 + Math.sin(seconds * 2.2) * .07
        marker.material.rotation = Math.sin(seconds * 1.4) * .035
        traveled.geometry.setDrawRange(0, Math.floor(frame.curvePosition * (samples.length - 1)) + 1)
        road.geometry.setDrawRange(0, Math.floor(frame.curvePosition * roadSegments) * 30)
        trail.forEach((spark, index) => {
          const phase = (seconds * .38 + index / trail.length) % 1
          const location = frame.curvePosition - (1 - phase) * .065
          spark.visible = location > 0 && frame.overview < .95
          if (spark.visible) { surfaceRoute.getPoint(clamp(location), spark.position); spark.position.y += .045; spark.material.opacity = Math.sin(phase * Math.PI) * .85 }
        })
        const activeId = routeItems[frame.index]?.id
        flags.forEach(({ id, color, flag }) => {
          flag.material.color.set(id === activeId ? '#c83c32' : color)
          flag.rotation.y = cameraAngle
          const vertices = flag.geometry.attributes.position
          for (let index = 0; index < vertices.count; index++) {
            const x = vertices.getX(index)
            vertices.setZ(index, Math.sin(seconds * 3.5 - x * 7 + vertices.getY(index) * 2) * .085 * x / .76)
          }
          vertices.needsUpdate = true
        })
        capitalRings.forEach(({ id, ring }) => {
          const selected = id === activeId
          ring.scale.setScalar(selected ? 1.3 + (1 - frame.flight) * .25 : 1)
          ring.material.opacity = selected ? .95 : .35
        })
        const pulse = (seconds * .55) % 1
        arrival.position.copy(point); arrival.position.y += .08
        arrival.scale.setScalar(.7 + smooth(pulse) * 2); arrival.material.opacity = (1 - pulse) * .5 * (1 - frame.overview)
        destinationRing.scale.setScalar(1 + smooth((value - .88) / .065) * .3)
        const intro = 1 - smooth(seconds / 4)
        const lift = Math.sin(frame.flight * Math.PI)
        const radius = 10.5 + lift * 2
        const desiredAltitude = point.y + 9 + lift * 1.8
        const frameTime = performance.now()
        const seeked = previousSeconds === null
        const delta = previousSeconds === seconds ? 0 : Math.min(.05, Math.max(0, (frameTime - previousFrameTime) / 1000))
        previousFrameTime = frameTime
        const clearanceAt = (angle: number) => cameraClearance(point, point.x + Math.sin(angle) * radius, point.z + Math.cos(angle) * radius, terrainHeight)
        if (seeked || frameTime >= nextCameraSearch) {
          let bestScore = Infinity
          // Prefer nearby viewpoints, but circle around an intervening ridge.
          for (let candidate = -8; candidate <= 8; candidate++) {
            const angle = cameraAngle + candidate * Math.PI / 8 + .04
            const required = clearanceAt(angle)
            const score = Math.max(0, required - desiredAltitude) * 5 + Math.abs(candidate) * .3
            if (score < bestScore) { bestScore = score; targetAngle = angle }
          }
          nextCameraSearch = frameTime + 250
        }
        const angleDelta = Math.atan2(Math.sin(targetAngle - cameraAngle), Math.cos(targetAngle - cameraAngle))
        cameraAngle = seeked ? targetAngle : cameraAngle + angleDelta * (1 - Math.exp(-delta * 2.2))
        const requiredAltitude = Math.max(desiredAltitude, clearanceAt(cameraAngle))
        cameraAltitude = seeked ? requiredAltitude : Math.max(requiredAltitude, cameraAltitude + (requiredAltitude - cameraAltitude) * (1 - Math.exp(-delta * 2)))
        closeCamera.set(point.x + Math.sin(cameraAngle) * radius, cameraAltitude, point.z + Math.cos(cameraAngle) * radius)
        previousSeconds = seconds
        const distance = Math.max(20, terrainBounds.height * 1.3, terrainBounds.width / Math.max(.5, camera.aspect) * 1.3)
        overviewCamera.set(center.x - distance * (.22 + intro * .5), distance * (1 + intro * .3), center.z + distance * .8)
        const wide = Math.max(intro, frame.overview)
        camera.position.lerpVectors(closeCamera, overviewCamera, wide)
        camera.position.y = Math.max(camera.position.y, cameraClearance(point, camera.position.x, camera.position.z, terrainHeight))
        target.copy(point).lerp(center, wide); camera.lookAt(target)
        if (!document.hidden) renderer.render(scene, camera); raf = requestAnimationFrame(render)
      }
      render()
      cleanup = () => { cancelAnimationFrame(raf); observer.disconnect(); renderer.dispose(); root.replaceChildren(); scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) { object.geometry?.dispose?.(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => { if ('map' in material && material.map) material.map.dispose(); material.dispose() }) } }) }
    }).catch(() => { host.current?.setAttribute('data-webgl-failed', 'true'); onFailed() })
    return () => { disposed = true; cleanup() }
  }, [journey, layout, clock, duration, onFailed])
  return <div className="journey-webgl" ref={host} aria-hidden="true" />
}

export function SessionJourneyView({ journey }: { journey: SessionJourney }) {
  const reduced = useReducedMotion(); const [webglFailed, setWebglFailed] = useState(false); const handleWebglFailure = useCallback(() => setWebglFailed(true), [])
  const [clock] = useState(() => new JourneyClock(journey.playback))
  const [position, setPosition] = useState(() => clock.read())
  // API responses replace their objects on every control command. Only geography changes rebuild WebGL.
  const modelKey = useMemo(() => JSON.stringify({ ...journey, playback: undefined }), [journey])
  const model = useMemo(() => JSON.parse(modelKey) as SessionJourney, [modelKey])
  useEffect(() => { clock.update(journey.playback, !reduced); setPosition(clock.read()) }, [clock, journey.playback, reduced])
  useEffect(() => { const id = window.setInterval(() => setPosition(clock.read()), 50); return () => clearInterval(id) }, [clock])
  const layout = useMemo(() => atlasLayout(model), [model]); const route = useMemo(() => routeCapitals(model), [model]); const progress = clamp(position / Math.max(1, journey.playback.durationMs))
  const finale = progress >= .955; const activeIndex = journeyFrame(progress, route.length).index; const active = route[activeIndex]
  const outcomes = useMemo(() => journey.outcomes.slice(0, 4), [journey.outcomes]); const staticMode = reduced || webglFailed
  return <section className={staticMode ? 'journey-shell journey-shell--static' : 'journey-shell'} aria-label="Recorrido de la sesión">
    {staticMode ? <StaticAtlas journey={model} layout={layout} active={active} finale={finale} /> : <JourneyScene journey={model} layout={layout} clock={clock} duration={journey.playback.durationMs} onFailed={handleWebglFailure} />}
    <JourneyHeader journey={journey} />
    <AnimatePresence mode="wait">{active && progress < .88 && <CapitalCaption key={`${active.id}:${activeIndex}`} item={active} reduced={Boolean(staticMode)} index={activeIndex} count={route.length} localProgress={journeyFrame(progress, route.length).local} />}</AnimatePresence>
    {finale && <motion.div className="journey-finale-wrap" initial={staticMode ? false : { opacity: 0 }} animate={{ opacity: 1 }}><JourneyFinale outcomes={outcomes} /></motion.div>}
    <div className="journey-progress" aria-label={`${Math.round(progress * 100)}% completado`}><span style={{ transform: `scaleX(${progress})` }} /></div>
  </section>
}

function CapitalCaption({ item, reduced, index, count, localProgress }: { item: JourneyMilestone; reduced: boolean; index: number; count: number; localProgress: number }) {
  const [manualPage, setManualPage] = useState<number | null>(null)
  const details = item.details ?? []
  const page = Math.min(Math.max(0, details.length - 1), manualPage ?? Math.floor(clamp(localProgress) * details.length))
  const detail = details[page]
  return <motion.article className="journey-caption" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: reduced ? 0 : .15 } }} transition={{ duration: reduced ? 0 : .4, ease: [0.16, 1, 0.3, 1] }}>
  <span className="journey-stop-number">PARADA {index + 1} / {count}</span>
  <h1>{item.title}</h1>
  {item.kind !== 'presentation' && <div className="journey-real-metrics"><strong>{item.metric}<span>{item.kind === 'vote' ? 'votos' : 'aportaciones'}</span></strong><strong>{item.uniqueContributors}<span>participantes</span></strong></div>}
  {detail ? <><motion.div className="journey-answer" key={page} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}><small>{detail.label}</small><p>{detail.text}</p></motion.div>{details.length > 1 && <nav className="journey-answer-pages" aria-label="Respuestas de esta parada"><button type="button" aria-label="Respuesta anterior" disabled={page === 0} onClick={() => setManualPage(page - 1)}>←</button><span>{page + 1} / {details.length}</span><button type="button" aria-label="Respuesta siguiente" disabled={page === details.length - 1} onClick={() => setManualPage(page + 1)}>→</button>{manualPage !== null && <button type="button" onClick={() => setManualPage(null)}>Automático</button>}</nav>}</> : <p>{caption(item)}</p>}
</motion.article> }
function JourneyHeader({ journey }: { journey: SessionJourney }) { return <header className="journey-header"><div><span>ATLAS DE LA SESIÓN</span><strong>{journey.title}</strong></div><p>{journey.participantCount} participantes · {journey.responseCount} aportaciones · {journey.regions.length} regiones</p></header> }
function JourneyFinale({ outcomes }: { outcomes: SessionJourney['outcomes'] }) { return <section className="journey-finale"><span>DECISIONES DE LA SESIÓN</span><h1>Lo que decidimos.<br />Lo que viene ahora.</h1>{outcomes.length ? <div>{outcomes.map((item, index) => <article key={`${item.bucket}-${index}`}><small>{item.bucket.replaceAll('-', ' ')}</small><strong>{item.text}</strong></article>)}</div> : <p>No se registraron decisiones o siguientes pasos en esta sesión.</p>}</section> }
function caption(item: JourneyMilestone) { if (item.kind === 'presentation') return 'Este contexto real preparó el siguiente tramo de la conversación.'; if (item.kind === 'vote') { const winners = item.branches.filter(branch => branch.isWinner); return winners.length ? `${winners.map(branch => branch.label).join(' y ')} orientó la decisión con ${winners[0].votes} votos.` : 'La votación no registró votos.' } if (item.kind === 'consolidation') return `${item.metric} aportaciones convergieron en ${item.topics.length} temas publicados.`; return item.metric ? `${item.metric} aportaciones hicieron avanzar la conversación.` : 'Esta capital no recibió aportaciones.' }
