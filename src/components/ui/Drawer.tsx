import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

type DrawerProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Drawer({ open, title, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="drawer-backdrop"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="drawer-panel glass-strong"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
          >
            <header className="drawer-panel__head">
              <h2 className="serif">{title}</h2>
              <button type="button" className="drawer-panel__close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            <div className="drawer-panel__body">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
