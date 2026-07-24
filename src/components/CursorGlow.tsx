import { useEffect, useState } from 'react'
import './CursorGlow.css'

export function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches
    if (isTouch) return

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      setVisible(true)
    }
    const onLeave = () => setVisible(false)

    window.addEventListener('mousemove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div
      className={`cursor-glow ${visible ? 'is-visible' : ''}`}
      style={{ transform: `translate(${pos.x - 180}px, ${pos.y - 180}px)` }}
      aria-hidden
    />
  )
}
