import type { JourneyPlayback } from '../types'

export function journeyPosition(playback: JourneyPlayback, now = Date.now()) {
  const elapsed = playback.state === 'Playing' && playback.startedAtUtc ? Math.max(0, now - Date.parse(playback.startedAtUtc)) : 0
  return Math.max(0, Math.min(playback.durationMs, playback.positionMs + elapsed))
}

/** One display clock for camera, marker and captions; playback commands never recreate the scene. */
export class JourneyClock {
  private playback: JourneyPlayback
  private from = 0
  private changedAt = 0
  private transitionMs = 0

  constructor(playback: JourneyPlayback) { this.playback = playback }

  update(playback: JourneyPlayback, animate: boolean, now = Date.now()) {
    if (playback.revision < this.playback.revision) return
    const from = this.read(now)
    this.playback = playback
    this.from = from
    this.changedAt = now
    this.transitionMs = animate && Math.abs(journeyPosition(playback, now) - from) > 350 ? 1200 : 0
  }

  read(now = Date.now()) {
    const target = journeyPosition(this.playback, now)
    if (!this.transitionMs) return target
    const t = Math.max(0, Math.min(1, (now - this.changedAt) / this.transitionMs))
    const eased = t * t * t * (t * (t * 6 - 15) + 10)
    return this.from + (target - this.from) * eased
  }
}
