import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error'
  onUndo?: () => void
  undoLabel?: string
}

interface ToastProps extends ToastItem {
  onClose: () => void
}

export function Toast({ message, type, onClose, onUndo, undoLabel }: ToastProps) {
  const Icon = type === 'success' ? CheckCircle2 : XCircle

  return (
    <div
      role="alert"
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 px-5 py-4 rounded-xl border shadow-lg
        min-w-[300px] max-w-[90vw] text-body font-semibold
        ${type === 'success' ? 'bg-success-light border-success/30 text-success' : 'bg-error-light border-error/30 text-error'}
      `}
    >
      <Icon size={22} className="shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onUndo && undoLabel && (
        <button
          onClick={() => {
            onUndo()
            onClose()
          }}
          className="px-3 py-1.5 rounded-lg bg-surface/80 border border-current text-caption font-bold hover:opacity-80 transition-opacity shrink-0"
        >
          {undoLabel}
        </button>
      )}
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:opacity-70 transition-opacity"
        aria-label="Funga"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </>
  )
}

interface ToastOptions {
  onUndo?: () => void
  undoLabel?: string
}

interface ToastContextValue {
  showSuccess: (message: string, options?: ToastOptions) => void
  showError: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = String(Date.now())
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const showSuccess = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast({
        message,
        type: 'success',
        onUndo: options?.onUndo,
        undoLabel: options?.undoLabel,
      }),
    [addToast]
  )
  const showError = useCallback((message: string) => addToast({ message, type: 'error' }), [addToast])
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
