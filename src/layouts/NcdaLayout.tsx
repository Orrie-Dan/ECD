import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAuth } from '@/contexts/AppContext'
import { ConfirmModal } from '@/components/ui/Modal'
import { NavDrawer } from '@/components/ui/NavDrawer'
import { SidebarNavLink, isSidebarNavActive } from '@/components/ui/SidebarNavLink'
import {
  NCDA_NAV_GROUPS,
  NCDA_PATHS,
  getNcdaPageTitle,
  isNcdaFollowupPath,
  isNcdaMonitoringPath,
  isNcdaOverviewPath,
  type NcdaNavItem,
} from '@/layouts/ncda/navigation'
import { NcdaUserMenu } from '@/components/ncda/NcdaUserMenu'
import { common, messages } from '@/locales/rw/common'
import { ncda } from '@/locales/rw/ncda'
import ncdaLogo from '@/assets/ncda-logo.png'

function toSidebarItem(item: NcdaNavItem) {
  return {
    path: item.path,
    label: item.label,
    icon: item.icon,
    matchPaths: item.matchPaths,
  }
}

function NcdaBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={`border-b border-border ${collapsed ? 'p-3' : 'p-4'}`}>
      <Link
        to={NCDA_PATHS.dashboard}
        className={`flex items-center rounded-lg focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 ${
          collapsed ? 'justify-center' : 'gap-3'
        }`}
      >
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-border overflow-hidden shrink-0">
          <img
            src={ncdaLogo}
            alt=""
            className="w-full h-full object-contain scale-[1.35]"
            loading="eager"
            decoding="async"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-subheading text-primary leading-tight truncate">{ncda.brand}</p>
            <p className="text-caption text-text-muted mt-0.5 truncate">{ncda.brandSubtitle}</p>
          </div>
        )}
        <span className="sr-only">{ncda.portalLabel}</span>
      </Link>
    </div>
  )
}

function NcdaSidebarNav({
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
      aria-label={ncda.navAria}
    >
      {NCDA_NAV_GROUPS.map((group) => (
        <div key={group.id}>
          {!collapsed && (
            <p className="px-3 mb-1.5 text-caption font-bold uppercase tracking-wide text-text-muted">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5" role="group" aria-label={group.label}>
            {group.items.map((item) => {
              const sidebarItem = toSidebarItem(item)
              const active =
                item.id === 'monitoring'
                  ? isNcdaMonitoringPath(pathname)
                  : item.id === 'follow-up'
                    ? isNcdaFollowupPath(pathname)
                    : isSidebarNavActive(pathname, sidebarItem)
              return (
                <SidebarNavLink
                  key={item.path}
                  item={sidebarItem}
                  active={active}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  activeStyle="tinted"
                  pill
                />
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

/**
 * NCDA Admin application shell (Sprint 5.5B).
 * Online-only national portal frame — no domain data and no caregiver offline stack.
 */
export function NcdaLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPathname, setDrawerPathname] = useState(location.pathname)

  if (drawerPathname !== location.pathname) {
    setDrawerPathname(location.pathname)
    setDrawerOpen(false)
  }

  const pageTitle = getNcdaPageTitle(location.pathname)

  const finishLogout = () => {
    setShowLogout(false)
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-background flex">
      <aside className="hidden lg:flex flex-col w-72 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        <NcdaBrand />
        <NcdaSidebarNav pathname={location.pathname} />
        <div className="border-t border-border p-4">
          <div className="px-3 py-2.5 mb-2 rounded-xl bg-background-subtle">
            <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
            <p className="text-body font-semibold text-text mt-0.5 truncate">
              {user?.name?.trim() || ncda.roleLabel}
            </p>
            <p className="text-caption text-accent font-semibold mt-0.5">{ncda.roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-body text-error hover:bg-error-light transition-colors font-medium"
          >
            <LogOut size={20} aria-hidden="true" />
            {ncda.logout}
          </button>
        </div>
      </aside>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={ncda.portalLabel}
      >
        <div className="mb-4 px-2 py-3 rounded-xl bg-background-subtle">
          <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
          <p className="text-body font-semibold text-text mt-0.5">
            {user?.name?.trim() || ncda.roleLabel}
          </p>
          <p className="text-caption text-accent font-semibold mt-0.5">{ncda.roleLabel}</p>
        </div>
        <NcdaSidebarNav
          pathname={location.pathname}
          onNavigate={() => setDrawerOpen(false)}
        />
        <button
          type="button"
          onClick={() => {
            setDrawerOpen(false)
            setShowLogout(true)
          }}
          className="mt-4 flex items-center gap-3 w-full px-4 py-3 rounded-xl text-body text-error hover:bg-error-light transition-colors font-medium"
        >
          <LogOut size={20} aria-hidden="true" />
          {ncda.logout}
        </button>
      </NavDrawer>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        <header className="bg-surface border-b border-border sticky top-0 z-40 shadow-sm safe-area-top">
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
              <div className="min-w-0">
                {isNcdaOverviewPath(location.pathname) ? (
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-muted truncate">
                    {ncda.brand} • {ncda.brandSubtitle} / {pageTitle}
                  </p>
                ) : (
                  <>
                    <p className="hidden sm:block text-caption font-semibold uppercase tracking-wide text-accent truncate">
                      {ncda.brand} · {ncda.brandSubtitle}
                    </p>
                    <h1 className="text-body font-bold text-text leading-tight truncate">{pageTitle}</h1>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell rolePrefix="/ncda" />
              <NcdaUserMenu onRequestLogout={() => setShowLogout(true)} />
            </div>
          </div>
        </header>

        <main
          className={`flex-1 w-full mx-auto min-w-0 pb-8 ${
            isNcdaOverviewPath(location.pathname)
              ? 'max-w-[1360px] px-6 pt-5'
              : 'max-w-7xl p-3 sm:p-5 lg:p-6 xl:px-8'
          }`}
        >
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={finishLogout}
        title={ncda.logout}
        message={messages.confirmLogout}
        confirmLabel={common.yes}
        cancelLabel={common.no}
      />
    </div>
  )
}
