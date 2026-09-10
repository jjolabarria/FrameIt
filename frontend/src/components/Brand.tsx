import './Brand.css'

/** The favicon is the master symbol, also embedded by the PDF exporter. */
export function BrandSymbol() {
  return <img className="frameit-symbol" src="/favicon.svg" width={34} height={34} alt="" aria-hidden="true" />
}

export function Brand({ tagline }: { tagline?: string }) {
  return <span className="frameit-brand"><BrandSymbol /><span className="frameit-brand-copy"><span className="frameit-name">FrameIt</span>{tagline && <small>{tagline}</small>}</span></span>
}
