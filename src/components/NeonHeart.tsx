import { Heart } from 'lucide-react'
import type { CSSProperties } from 'react'
import './NeonHeart.css'

type NeonHeartProps = {
  side: 'left' | 'right'
  /** Vertical position inside the parent section */
  top?: string
  size?: number
  delay?: number
  opacity?: number
  /** Rotation in degrees, e.g. -18 / 12 */
  tilt?: number
  /**
   * Distance from viewport edge:
   * edge = farthest from content, near = a bit closer to the column
   */
  depth?: 'edge' | 'mid' | 'near'
}

/** Single outline neon heart outside the content column. */
export function NeonHeart({
  side,
  top = '48%',
  size = 24,
  delay = 0,
  opacity = 0.8,
  tilt = -8,
  depth = 'mid',
}: NeonHeartProps) {
  return (
    <span
      className={`neon-heart neon-heart--${side} neon-heart--${depth}`}
      style={
        {
          top,
          animationDelay: `${delay}s`,
          opacity,
          '--tilt': `${tilt}deg`,
        } as CSSProperties
      }
      aria-hidden
    >
      <Heart size={size} strokeWidth={1.35} fill="none" />
    </span>
  )
}
