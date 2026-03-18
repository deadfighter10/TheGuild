import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"

type ToastType = "success" | "error" | "info"

type Toast = {
  readonly id: number
  readonly message: string
  readonly type: ToastType
}

type ToastContextValue = {
  readonly toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

const TOAST_STYLES: Record<ToastType, { icon: string; border: string; text: string }> = {
  success: {
    icon: "text-green-400",
    border: "border-green-400/20",
    text: "text-green-400/90",
  },
  error: {
    icon: "text-red-400",
    border: "border-red-400/20",
    text: "text-red-400/90",
  },
  info: {
    icon: "text-cyan-400",
    border: "border-cyan-400/20",
    text: "text-cyan-400/90",
  },
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: "M5 13l4 4L19 7",
  error: "M18 6L6 18M6 6l12 12",
  info: "M12 16v-4M12 8h.01",
}

function ToastItem({ toast, onDismiss }: { readonly toast: Toast; readonly onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false)
  const style = TOAST_STYLES[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 3500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(() => onDismiss(toast.id), 300)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [exiting, toast.id, onDismiss])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${style.border} bg-void-900/95 backdrop-blur-xl shadow-lg shadow-black/20 transition-all duration-300 ${
        exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={style.icon}>
        <path d={TOAST_ICONS[toast.type]} />
      </svg>
      <span className={`text-sm font-medium ${style.text}`}>{toast.message}</span>
    </div>
  )
}

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-slide-in">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
