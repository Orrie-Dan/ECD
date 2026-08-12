import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { ncda } from '@/locales/rw/ncda'
import { useToast } from '@/components/ui/Toast'

interface NcdaUserMenuProps {
  onRequestLogout: () => void
}

/**
 * NCDA header user menu — real actions only (profile stub + logout).
 */
export function NcdaUserMenu({ onRequestLogout }: NcdaUserMenuProps) {
  const { user } = useAuth()
  const { showSuccess } = useToast()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const displayName = user?.name?.trim() || ncda.roleLabel

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 max-w-[14rem] rounded-xl border border-border bg-surface px-2.5 py-1.5 text-left hover:bg-background-subtle transition-colors focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ncda.openUserMenu}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-light text-accent shrink-0">
          <UserRound size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 hidden sm:block">
          <span className="block text-caption font-semibold text-text truncate">{displayName}</span>
          <span className="block text-caption text-text-muted truncate">{ncda.roleLabel}</span>
        </span>
        <ChevronDown size={16} className="text-text-muted shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden"
        >
          <div className="px-3 py-2.5 border-b border-border bg-background-subtle">
            <p className="text-caption text-text-muted">{ncda.signedInAs}</p>
            <p className="text-body font-semibold text-text truncate">{displayName}</p>
            <p className="text-caption text-accent font-semibold mt-0.5">{ncda.roleLabel}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-body text-text-secondary hover:bg-background-subtle transition-colors text-left"
            onClick={() => {
              setOpen(false)
              showSuccess(ncda.profileComingSoon)
            }}
          >
            <UserRound size={18} aria-hidden="true" />
            {ncda.profile}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-body text-error hover:bg-error-light transition-colors text-left font-medium"
            onClick={() => {
              setOpen(false)
              onRequestLogout()
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            {ncda.logout}
          </button>
        </div>
      )}
    </div>
  )
}
