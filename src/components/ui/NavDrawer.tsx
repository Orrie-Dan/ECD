import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { common } from '@/locales/rw/common'

interface NavDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function NavDrawer({ open, onClose, title, children }: NavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-text/40 nav-drawer-backdrop"
        onClick={onClose}
        aria-label={common.nav.closeMenu}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative h-full w-[min(100%,18rem)] bg-surface border-r border-border shadow-lg flex flex-col nav-drawer-panel outline-none"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? common.nav.mainNav}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
          <p className="text-subheading text-text truncate">{title ?? common.nav.mainNav}</p>
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-lg text-text-secondary hover:bg-background-subtle transition-colors"
            aria-label={common.nav.closeMenu}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  )
}
