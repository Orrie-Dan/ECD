import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { ConfirmModal } from '@/components/ui/Modal'
import { LogoutPendingModal } from '@/components/offline/LogoutPendingModal'
import { DistrictRequiresOnlineBanner } from '@/components/offline/DistrictRequiresOnlineBanner'
import { BottomNav } from '@/components/ui/BottomNav'
import { NavDrawer } from '@/components/ui/NavDrawer'
import { SidebarNavLink, isSidebarNavActive, type SidebarNavItem } from '@/components/ui/SidebarNavLink'
import { useState } from 'react'
import { common, messages } from '@/locales/rw/common'
import { env } from '@/config/env'
import {
  evaluateLogoutPolicy,
  applyLogoutDataPolicy,
  type LogoutAction,
} from '@/offline/logout-policy'
import {
  DISTRICT_NAV_GROUPS,
  DISTRICT_MOBILE_NAV,
  isDistrictOverviewPath,
  type DistrictNavItem,
} from '@/layouts/district/navigation'
import { useDistrictScope } from '@/features/district/overview/useDistrictScope'
import ncdaLogo from '@/assets/ncda-logo.png'

function toSidebarItem(item: DistrictNavItem): SidebarNavItem {
  return {
    path: item.path,
    label: item.label,
    icon: item.icon,
    matchPaths: item.matchPaths,
  }
}

function SidebarBrand({
  collapsed = false,
  districtName,
}: {
  collapsed?: boolean
  districtName?: string | null
}) {
  return (
    <div className={`border-b border-border ${collapsed ? 'p-3' : 'p-4'}`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-border overflow-hidden shrink-0">
          <img
            src={ncdaLogo}
            alt="NCDA"
            className="w-full h-full object-contain scale-[1.35]"
            loading="eager"
            decoding="async"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-subheading text-primary leading-tight truncate">{common.appName}</h1>
            <p className="text-caption mt-0.5 truncate">{districtName}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DistrictSidebarNav({
  pathname,
  collapsed = false,
  onNavigate,
}: {
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav
      className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'} space-y-4`}
      aria-label={common.nav.mainNav}
    >
      {DISTRICT_NAV_GROUPS.map((group) => (
        <div key={group.id}>
          {!collapsed && (
            <p className="px-3 mb-1.5 text-caption font-bold uppercase tracking-wide text-text-muted">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5" role="group" aria-label={group.label}>
            {group.items.map((item) => {
              const sidebarItem = toSidebarItem(item)
              return (
                <SidebarNavLink
                  key={item.path}
                  item={sidebarItem}
                  active={isSidebarNavActive(pathname, sidebarItem)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  activeStyle="tinted"
                />
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function DistrictLayout() {
  const { user, logout } = useAuth()
  const scope = useDistrictScope()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [logoutBlocked, setLogoutBlocked] = useState(false)
  const [logoutMessage, setLogoutMessage] = useState<string>(messages.confirmLogout)
  const [logoutPendingCount, setLogoutPendingCount] = useState(0)
  const [logoutSyncBusy, setLogoutSyncBusy] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPathname, setDrawerPathname] = useState(location.pathname)
  if (drawerPathname !== location.pathname) {
    setDrawerPathname(location.pathname)
    setDrawerOpen(false)
  }

  const districtName = scope.districtName ?? user?.districtName

  const openLogoutModal = async () => {
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

  const renderSidebarFooter = (collapsed: boolean) => (
    <div className={`border-t border-border ${collapsed ? 'p-2' : 'p-4'}`}>
      {!collapsed && (
        <div className="px-4 py-3 mb-2 rounded-xl bg-background-subtle">
          <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
          <p className="text-body font-semibold text-text mt-0.5 truncate">{user?.name}</p>
        </div>
      )}
      <button
        onClick={() => {
          void openLogoutModal()
        }}
        title={collapsed ? common.logout : undefined}
        className={`
          flex items-center gap-3 w-full rounded-xl text-body text-error hover:bg-error-light transition-colors font-medium
          ${collapsed ? 'justify-center p-2.5' : 'px-4 py-3'}
        `}
      >
        <LogOut size={20} />
        {!collapsed && common.logout}
      </button>
    </div>
  )

  const mobileNavItems = DISTRICT_MOBILE_NAV.map((item) => ({
    path: item.path,
    label: item.label,
    icon: item.icon,
    matchPaths: item.matchPaths,
  }))

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarBrand districtName={districtName} />
        <DistrictSidebarNav pathname={location.pathname} />
        {renderSidebarFooter(false)}
      </aside>

      <aside className="hidden md:flex lg:hidden flex-col w-16 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarBrand collapsed districtName={districtName} />
        <DistrictSidebarNav pathname={location.pathname} collapsed />
        {renderSidebarFooter(true)}
      </aside>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={common.appName}>
        <div className="mb-4 px-2 py-3 rounded-xl bg-background-subtle">
          <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
          <p className="text-body font-semibold text-text mt-0.5">{user?.name}</p>
          <p className="text-caption text-text-secondary mt-0.5">{districtName}</p>
        </div>
        <DistrictSidebarNav
          pathname={location.pathname}
          onNavigate={() => setDrawerOpen(false)}
        />
        <button
          onClick={() => {
            setDrawerOpen(false)
            void openLogoutModal()
          }}
          className="mt-4 flex items-center gap-3 w-full px-4 py-3 rounded-xl text-body text-error hover:bg-error-light transition-colors font-medium"
        >
          <LogOut size={20} />
          {common.logout}
        </button>
      </NavDrawer>

      <div className="flex-1 flex flex-col min-w-0 md:ml-16 lg:ml-64">
        <header className="bg-surface border-b border-border sticky top-0 z-40 shadow-sm">
          <div className="px-3 sm:px-5 lg:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden touch-target flex items-center justify-center rounded-lg text-text-secondary hover:bg-background-subtle transition-colors shrink-0"
                aria-label={common.nav.openMenu}
                aria-expanded={drawerOpen}
              >
                <Menu size={22} aria-hidden="true" />
              </button>
              <div className="flex items-center gap-3 min-w-0 md:hidden">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-border overflow-hidden shrink-0">
                  <img
                    src={ncdaLogo}
                    alt="NCDA"
                    className="w-full h-full object-contain scale-[1.35]"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-body font-bold text-text leading-tight truncate">{common.appName}</h1>
                  <p className="text-caption truncate">{districtName}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                void openLogoutModal()
              }}
              className="lg:hidden touch-target flex items-center justify-center rounded-lg text-error hover:bg-error-light transition-colors shrink-0"
              aria-label={common.logout}
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main
          className={`flex-1 w-full mx-auto p-3 sm:p-5 lg:p-6 xl:px-8 pb-24 lg:pb-6 min-w-0 ${
            isDistrictOverviewPath(location.pathname) ? 'max-w-[96rem]' : 'max-w-7xl'
          }`}
        >
          <DistrictRequiresOnlineBanner className="mb-3" />
          <Outlet />
        </main>

        <BottomNav items={mobileNavItems} />
      </div>

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
        <ConfirmModal
          open={showLogout}
          onClose={() => setShowLogout(false)}
          onConfirm={() => {
            void finishLogout('keep_on_device')
          }}
          title={common.logout}
          message={logoutMessage}
          confirmLabel={common.yes}
          cancelLabel={common.no}
        />
      )}
    </div>
  )
}
