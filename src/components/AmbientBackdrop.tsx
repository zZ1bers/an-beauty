import './AmbientBackdrop.css'

export function AmbientBackdrop() {
  return (
    <div className="ambient" aria-hidden>
      <span className="ambient__orb ambient__orb--coral" />
      <span className="ambient__orb ambient__orb--green" />
      <span className="ambient__orb ambient__orb--taupe" />
      <span className="ambient__orb ambient__orb--soft" />
      <span className="ambient__mesh" />
      <span className="ambient__grain" />
    </div>
  )
}
