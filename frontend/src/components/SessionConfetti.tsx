import type { CSSProperties } from 'react'

const pieces = [
  ['#d79a3b', -46, -18, 0], ['#28786a', -38, 9, 80], ['#b95745', -31, -12, 150],
  ['#e3c079', -24, 16, 40], ['#355b73', -17, -8, 220], ['#d79a3b', -10, 13, 110],
  ['#28786a', -3, -16, 290], ['#b95745', 5, 11, 170], ['#e3c079', 12, -6, 30],
  ['#355b73', 19, 17, 200], ['#d79a3b', 26, -13, 90], ['#28786a', 33, 8, 260],
  ['#b95745', 40, -17, 130], ['#e3c079', 47, 12, 20], ['#355b73', 54, -5, 180],
  ['#d79a3b', -51, 5, 240], ['#28786a', -43, -11, 70], ['#b95745', -35, 15, 310],
  ['#e3c079', -27, -3, 120], ['#355b73', -19, 10, 50], ['#d79a3b', -11, -15, 270],
  ['#28786a', -2, 7, 160], ['#b95745', 8, -12, 10], ['#e3c079', 17, 14, 230],
  ['#355b73', 28, -8, 100], ['#d79a3b', 37, 15, 280], ['#28786a', 48, -14, 60],
]

export function SessionConfetti() {
  return <div className="session-confetti" aria-hidden="true">
    {pieces.map(([color, x, rotation, delay], index) => <span key={index} className="session-confetti-piece" style={{ '--confetti-color': color, '--confetti-x': `${x}vw`, '--confetti-rotation': `${rotation}deg`, '--confetti-delay': `${delay}ms` } as CSSProperties} />)}
  </div>
}
