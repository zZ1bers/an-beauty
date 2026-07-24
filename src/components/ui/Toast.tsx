import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type Toast = { id: number; message: string; tone?: 'ok' | 'err' }

type ToastApi = {
  push: (message: string, tone?: 'ok' | 'err') => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast--${t.tone ?? 'ok'}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast requires ToastProvider')
  return ctx
}
