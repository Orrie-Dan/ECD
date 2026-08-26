import { useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  ChevronDown,
  ArrowLeft,
  User,
  Settings,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { isEcdDirector } from '@/api/roles'
import { Button } from '@/components/ui/Button'
import { BottomNav, type NavItem } from '@/components/ui/BottomNav'
import { NavDrawer } from '@/components/ui/NavDrawer'
import { SidebarNavLink, isSidebarNavActive, type SidebarNavItem } from '@/components/ui/SidebarNavLink'
import { SyncStatusIndicator } from '@/components/offline/SyncStatusIndicator'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ProductionMockBanner } from '@/components/offline/ProductionMockBanner'
import {
  LogoutPendingModal,
  LogoutSimpleModal,
} from '@/components/offline/LogoutPendingModal'
import { useState, useRef, useEffect } from 'react'
import { common, messages } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import ncdaLogo from '@/assets/ncda-logo.png'
import { env } from '@/config/env'
import {
  applyLogoutDataPolicy,
  evaluateLogoutPolicy,
  type LogoutAction,
} from '@/offline/logout-policy'
import {
  buildCaretakerNavGroups,
  CARETAKER_MOBILE_NAV,
  getCaretakerPageTitle,
  isPathWithinNavItem,
  type CaretakerNavItem,
} from '@/layouts/caretaker/navigation'

interface CaretakerLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  backTo?: string
  backLabel?: string
}

function toSidebarItem(item: CaretakerNavItem): SidebarNavItem {
  return {
    path: item.path,
    label: item.label,
    icon: item.icon,
    matchPaths: item.matchPaths,
    exact: item.exact,
  }
}

function SidebarNavItemRow({
  item,
  pathname,
  onNavigate,
}: {
  item: CaretakerNavItem
  pathname: string
  onNavigate?: () => void
}) {
  const sidebarItem = toSidebarItem(item)
  const exactActive = isSidebarNavActive(pathname, sidebarItem)
  const childActive = item.children?.some((child) => isPathWithinNavItem(pathname, child)) ?? false
  const expanded = Boolean(item.children?.length) && (exactActive || childActive)

  return (
    <div>
      <SidebarNavLink
        item={sidebarItem}
        active={exactActive}
        inSection={childActive}
        onNavigate={onNavigate}
        activeStyle="filled"
      />
      {expanded && item.children && (
        <div
          className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-2"
          role="group"
          aria-label={item.label}
        >
          {item.children.map((child) => (
            <SidebarNavItemRow
              key={child.path}
              item={child}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarBrand({ centerName }: { centerName?: string }) {
  return (
    <div className="border-b border-border p-4 xl:p-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-border shrink-0 overflow-hidden">
          <img
            src={ncdaLogo}
            alt="NCDA"
            className="w-full h-full object-contain scale-[1.35]"
            loading="eager"
            decoding="async"
          />
        </div>
        <div className="min-w-0">
          <h1 className="text-subheading text-primary leading-tight truncate">{common.appName}</h1>
          <p className="text-caption mt-0.5 truncate">{centerName}</p>
        </div>
      </div>
    </div>
  )
}

function SidebarNavList({
  groups,
  pathname,
  onNavigate,
}: {
  groups: ReturnType<typeof buildCaretakerNavGroups>
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto p-2.5 xl:p-3 space-y-4" aria-label={common.nav.mainNav}>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-3 mb-1.5 text-caption font-bold uppercase tracking-wide text-text-muted">
            {group.label}
          </p>
          <div className="space-y-0.5" role="group" aria-label={group.label}>
            {group.items.map((item) => (
              <SidebarNavItemRow
                key={item.path}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function CaretakerLayout({ children, pageTitle, backTo, backLabel }: CaretakerLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [logoutBlocked, setLogoutBlocked] = useState(false)
  const [logoutMessage, setLogoutMessage] = useState<string>(messages.confirmLogout)
  const [logoutPendingCount, setLogoutPendingCount] = useState(0)
  const [logoutSyncBusy, setLogoutSyncBusy] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const director = isEcdDirector(user)
  const navGroups = buildCaretakerNavGroups(director)
  const mobileNavItems: NavItem[] = CARETAKER_MOBILE_NAV.map(toSidebarItem)

  const title = pageTitle ?? getCaretakerPageTitle(location.pathname, director)
  const showBack = Boolean(backTo || backLabel)
  const resolvedBackLabel = backLabel ?? common.back

  const openLogoutModal = async () => {
    setShowProfileMenu(false)
    if (!env.isLive) {
      setLogoutBlocked(false)
      setLogoutPendingCount(0)
      setLogoutMessage(messages.confirmLogout)
      setShowLogout(true)
      return
    }
    const decision = await evaluateLogoutPolicy('cancel')
    if (!decision.allowed) {
      setLogoutBlocked(true)
      setLogoutPendingCount(decision.pendingCount)
      setLogoutMessage(
        common.sync.logoutBlocked.replace('{count}', String(decision.pendingCount)),
      )
      setShowLogout(true)
      return
    }
    setLogoutBlocked(false)
    setLogoutPendingCount(0)
    setLogoutMessage(messages.confirmLogout)
    setShowLogout(true)
  }

  const finishLogout = async (action: LogoutAction) => {
    if (env.isLive) {
      if (action === 'cancel') {
        setShowLogout(false)
        setLogoutSyncBusy(false)
        return
      }
      if (logoutBlocked && action === 'sync_then_logout') {
        setLogoutSyncBusy(true)
        try {
          await applyLogoutDataPolicy('sync_then_logout')
          const still = await evaluateLogoutPolicy('cancel')
          if (!still.allowed) {
            setLogoutPendingCount(still.pendingCount)
            setLogoutMessage(common.sync.logoutSyncFailed)
            return
          }
          await applyLogoutDataPolicy('keep_on_device')
        } finally {
          setLogoutSyncBusy(false)
        }
      } else if (logoutBlocked && action === 'keep_on_device') {
        await applyLogoutDataPolicy('keep_on_device')
      } else if (logoutBlocked && action === 'discard_local') {
        await applyLogoutDataPolicy('discard_local', { userId: user?.id ?? null })
      } else if (logoutBlocked) {
        return
      } else {
        await applyLogoutDataPolicy('keep_on_device')
      }
    }
    setShowLogout(false)
    setLogoutSyncBusy(false)
    logout()
    navigate('/')
  }

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-dvh bg-background flex">
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarBrand centerName={user?.centerName} />
        <SidebarNavList groups={navGroups} pathname={location.pathname} />
        <div className="p-3 xl:p-4 border-t border-border">
          <div className="px-4 py-3 rounded-xl bg-background-subtle">
            <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
            <p className="text-body font-semibold text-text mt-0.5 truncate">{user?.name}</p>
            {director && (
              <p className="text-caption text-text-secondary mt-0.5 truncate">
                {caretaker.settings.roleDirector}
              </p>
            )}
          </div>
        </div>
      </aside>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={common.appName}>
        <div className="mb-4 px-2 py-3 rounded-xl bg-background-subtle">
          <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
          <p className="text-body font-semibold text-text mt-0.5">{user?.name}</p>
          <p className="text-caption text-text-secondary mt-0.5">{user?.centerName}</p>
          {director && (
            <p className="text-caption text-primary mt-0.5">{caretaker.settings.roleDirector}</p>
          )}
        </div>
        <SidebarNavList
          groups={navGroups}
          pathname={location.pathname}
          onNavigate={() => setDrawerOpen(false)}
        />
      </NavDrawer>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-60 xl:ml-64">
        <header className="bg-surface border-b border-border sticky top-0 z-40 shadow-sm safe-area-top">
          <div className="px-3 sm:px-5 lg:px-6 h-14 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden touch-target flex items-center justify-center rounded-lg text-text-secondary hover:bg-background-subtle transition-colors shrink-0"
                aria-label={common.nav.openMenu}
                aria-expanded={drawerOpen}
              >
                <Menu size={22} aria-hidden="true" />
              </button>
              <h2 className="text-heading text-text truncate min-w-0">{title}</h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <NotificationBell rolePrefix="/caretaker" />
              <SyncStatusIndicator />
              <div className="hidden md:block text-right min-w-0">
                <p className="text-body font-semibold text-text leading-tight truncate max-w-[12rem] lg:max-w-[14rem]">
                  {user?.name}
                </p>
                <p className="text-caption truncate max-w-[12rem] lg:max-w-[14rem]">{user?.centerName}</p>
              </div>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu((v) => !v)}
                  className="touch-target flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-border bg-background-subtle hover:bg-background transition-colors"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="true"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-light text-primary">
                    <User size={18} />
                  </div>
                  <ChevronDown size={16} className="text-text-muted hidden sm:block" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-surface rounded-xl border border-border shadow-lg py-1 z-50">
                    <div className="px-4 py-3 border-b border-border md:hidden">
                      <p className="text-body font-semibold text-text">{user?.name}</p>
                      <p className="text-caption">{user?.centerName}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigate('/caretaker/igenamiterere')
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-body text-text-secondary hover:bg-background-subtle transition-colors"
                    >
                      <Settings size={18} aria-hidden="true" />
                      {caretaker.nav.settings}
                    </button>
                    <button
                      onClick={() => {
                        void openLogoutModal()
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-body text-error hover:bg-error-light transition-colors"
                    >
                      <LogOut size={18} />
                      {common.logout}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 xl:px-8 pb-24 lg:pb-6 min-w-0">
          {showBack && (
            <div className="mb-4 flex justify-start">
              <Button
                variant="tertiary"
                size="sm"
                icon={<ArrowLeft size={18} />}
                onClick={() => {
                  const canGoBack = location.key !== 'default'
                  if (canGoBack) {
                    navigate(-1)
                    return
                  }
                  if (backTo) {
                    navigate(backTo)
                    return
                  }
                  navigate('/caretaker')
                }}
                className="shrink-0"
              >
                {resolvedBackLabel}
              </Button>
            </div>
          )}
          <ProductionMockBanner className="mb-4" />
          {children}
        </main>
      </div>

      <BottomNav items={mobileNavItems} />

      {logoutBlocked ? (
        <LogoutPendingModal
          open={showLogout}
          pendingCount={logoutPendingCount}
          message={logoutMessage}
          syncBusy={logoutSyncBusy}
          onClose={() => {
            if (!logoutSyncBusy) setShowLogout(false)
          }}
          onAction={(action) => {
            void finishLogout(action)
          }}
        />
      ) : (
        <LogoutSimpleModal
          open={showLogout}
          onClose={() => setShowLogout(false)}
          onConfirm={() => {
            void finishLogout('keep_on_device')
          }}
        />
      )}
    </div>
  )
}
