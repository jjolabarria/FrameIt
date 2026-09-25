import { cameraClearance } from './journeyTerrain'

type Point = { x: number; y: number; z: number }
type HeightAt = (x: number, z: number) => number
const difference = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from))

export function approachHeight(current: number, target: number, delta: number) {
  const change = (target - current) * (1 - Math.exp(-delta * 3))
  return current + Math.max(-3 * delta, Math.min(6 * delta, change))
}

/** Keep a valid viewpoint; anticipate slopes instead of climbing instantly. */
export class JourneyCamera {
  angle = -.55
  altitude = 12
  private targetAngle = this.angle
  private initialized = false
  private searchIn = 0

  update(point: Point, ahead: Point, radius: number, desiredAltitude: number, delta: number, heightAt: HeightAt) {
    const clearance = (angle: number) => Math.max(...[point, ahead].map(target =>
      cameraClearance(target, target.x + Math.sin(angle) * radius, target.z + Math.cos(angle) * radius, heightAt)))
    this.searchIn -= delta
    if (!this.initialized || this.searchIn <= 0) {
      const score = (angle: number) => Math.max(0, clearance(angle) - desiredAltitude) * 5 + Math.abs(difference(angle, this.angle)) * .8
      let best = this.targetAngle
      let bestScore = score(best)
      // Hysteresis keeps a clear heading and avoids alternating between equivalent sides.
      if (clearance(best) > desiredAltitude + .5) {
        for (let index = -8; index <= 8; index++) {
          const candidate = this.angle + index * Math.PI / 8
          const candidateScore = score(candidate)
          if (candidateScore < bestScore - .8) { best = candidate; bestScore = candidateScore }
        }
      }
      this.targetAngle = best
      this.searchIn = .2
    }
    this.angle += difference(this.targetAngle, this.angle) * (this.initialized ? 1 - Math.exp(-delta * 2.2) : 1)
    const desired = Math.max(desiredAltitude, clearance(this.angle) + .5)
    this.altitude = this.initialized ? approachHeight(this.altitude, desired, delta) : desired
    this.initialized = true
    return { x: point.x + Math.sin(this.angle) * radius, y: this.altitude, z: point.z + Math.cos(this.angle) * radius }
  }
}

/** A replayed route position does not replay the opening shot. */
export class JourneyIntro {
  private elapsed: number
  constructor(positionSeconds: number) { this.elapsed = Math.max(0, Math.min(4, positionSeconds)) }
  advance(delta: number) {
    this.elapsed = Math.min(4, this.elapsed + Math.max(0, delta))
    const t = this.elapsed / 4
    return 1 - t * t * t * (t * (t * 6 - 15) + 10)
  }
}
