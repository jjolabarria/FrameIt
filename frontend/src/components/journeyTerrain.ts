type Point = { x: number; z: number }
type Bounds = { minX: number; minZ: number; width: number; height: number }

/** Minimum camera altitude with a clear sightline to the route marker. */
export function cameraClearance(target: Point & { y: number }, x: number, z: number, heightAt: (x: number, z: number) => number) {
  let altitude = target.y + 2
  for (let sample = 1; sample <= 24; sample++) {
    const t = sample / 24
    const ground = heightAt(target.x + (x - target.x) * t, target.z + (z - target.z) * t)
    altitude = Math.max(altitude, (ground + .18 - target.y * (1 - t)) / t)
  }
  return altitude
}

/** Fictional geography only: elevations never encode participant results. */
export function createTerrainHeight(seed: number, bounds: Bounds, trail: Point[]) {
  const phase = seed * Math.PI * 2
  const segments = trail.slice(1).map((end, index) => {
    const start = trail[index]
    const dx = end.x - start.x; const dz = end.z - start.z
    return { start, dx, dz, lengthSquared: dx * dx + dz * dz }
  })
  return (x: number, z: number) => {
    const ridge = Math.sin(x * .43 + Math.sin(z * .29 + phase) * 1.4 + phase)
    const crossRidge = Math.cos(z * .52 - x * .19 + phase)
    const detail = Math.sin(x * 1.1 + z * .61) * Math.cos(z * .93 - phase)
    const mountain = .6 + 3.5 * ridge * ridge + 1.25 * crossRidge * crossRidge + detail * .23
    let distanceSquared = Infinity
    for (const segment of segments) {
      const t = segment.lengthSquared ? Math.max(0, Math.min(1, ((x - segment.start.x) * segment.dx + (z - segment.start.z) * segment.dz) / segment.lengthSquared)) : 0
      const dx = x - segment.start.x - t * segment.dx; const dz = z - segment.start.z - t * segment.dz
      distanceSquared = Math.min(distanceSquared, dx * dx + dz * dz)
    }
    // The route winds along broad valley floors, with slopes rising beside it.
    const valley = 1 - .84 * Math.exp(-distanceSquared / 1.8)
    const edge = Math.max(0, Math.min(1, (x - bounds.minX) / 2, (bounds.minX + bounds.width - x) / 2, (z - bounds.minZ) / 2, (bounds.minZ + bounds.height - z) / 2))
    return .12 + mountain * valley * edge * edge * (3 - 2 * edge)
  }
}

/** Intersect the actual terrain triangles so contour lines follow the relief. */
export function terrainContours(positions: ArrayLike<number>, indices: ArrayLike<number>, interval = .4) {
  const minor: number[] = []; const major: number[] = []
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    const vertices = [indices[triangle] * 3, indices[triangle + 1] * 3, indices[triangle + 2] * 3]
    const heights = vertices.map(index => positions[index + 1])
    const first = Math.ceil(Math.min(...heights) / interval)
    const last = Math.floor(Math.max(...heights) / interval)
    for (let level = first; level <= last; level++) {
      const elevation = level * interval; const intersections: number[] = []
      for (let edge = 0; edge < 3; edge++) {
        const a = vertices[edge]; const b = vertices[(edge + 1) % 3]
        const ay = positions[a + 1]; const by = positions[b + 1]
        if ((ay <= elevation && by > elevation) || (by <= elevation && ay > elevation)) {
          const t = (elevation - ay) / (by - ay)
          intersections.push(positions[a] + (positions[b] - positions[a]) * t, elevation + .018, positions[a + 2] + (positions[b + 2] - positions[a + 2]) * t)
        }
      }
      if (intersections.length === 6) (level % 3 === 0 ? major : minor).push(...intersections)
    }
  }
  return { minor, major }
}
