import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Baby,
  FileText,
  Map,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { ConfirmModal } from '@/components/ui/Modal'
import { LogoutPendingModal } from '@/components/offline/LogoutPendingModal'
import { DistrictRequiresOnlineBanner } from '@/components/offline/DistrictRequiresOnlineBanner'
import { BottomNav, type NavItem } from '@/components/ui/BottomNav'
import { NavDrawer } from '@/components/ui/NavDrawer'
import { SidebarNavLink, isSidebarNavActive, type SidebarNavItem } from '@/components/ui/SidebarNavLink'
import { useState, useEffect } from 'react'
import { common, messages } from '@/locales/rw/common'
import { district } from '@/locales/rw/district'
import { env } from '@/config/env'
import {
  evaluateLogoutPolicy,
  applyLogoutDataPolicy,
  type LogoutAction,
} from '@/offline/logout-policy'
import ncdaLogo from '@/assets/ncda-logo.png'

interface DistrictLayoutProps {
  children: React.ReactNode
}

const sidebarNavItems: SidebarNavItem[] = [
  { path: '/district', label: district.nav.dashboard, icon: LayoutDashboard },
  { path: '/district/abana', label: district.nav.children, icon: Baby },
  {
    path: '/district/ibigo',
    label: district.nav.centers,
    icon: Building2,
    matchPaths: ['/district/ibigo'],
  },
  {
    path: '/district/gukurikirana',
    label: district.nav.followup,
    icon: AlertTriangle,
    matchPaths: ['/district/gukurikirana'],
  },
  { path: '/district/raporo', label: district.nav.reports, icon: FileText },
  { path: '/district/ikarita', label: district.nav.gis, icon: Map },
  { path: '/district/igenamiterere', label: district.nav.settings, icon: Settings },
]

const mobileNavItems: NavItem[] = [
  { path: '/district', label: district.nav.dashboard, icon: LayoutDashboard },
  { path: '/district/abana', label: district.nav.children, icon: Baby },
  {
    path: '/district/ibigo',
    label: district.nav.centers,
    icon: Building2,
    matchPaths: ['/district/ibigo'],
  },
  {
    path: '/district/gukurikirana',
    label: district.nav.followup,
    icon: AlertTriangle,
    matchPaths: ['/district/gukurikirana'],
  },
  { path: '/district/ikarita', label: district.nav.gis, icon: Map },
]

function SidebarBrand({ collapsed = false, districtName }: { collapsed?: boolean; districtName?: string }) {
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

function SidebarNavList({
  items,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  items: SidebarNavItem[]
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className={`flex-1 overflow-y-auto space-y-0.5 ${collapsed ? 'p-2' : 'p-3'}`} aria-label={common.nav.mainNav}>
      {items.map((item) => (
        <SidebarNavLink
          key={item.path}
          item={item}
          active={isSidebarNavActive(pathname, item)}
          collapsed={collapsed}
          onNavigate={onNavigate}
          activeStyle="tinted"
        />
      ))}
    </nav>
  )
}

export function DistrictLayout({ children }: DistrictLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [logoutBlocked, setLogoutBlocked] = useState(false)
  const [logoutMessage, setLogoutMessage] = useState<string>(messages.confirmLogout)
  const [logoutPendingCount, setLogoutPendingCount] = useState(0)
  const [logoutSyncBusy, setLogoutSyncBusy] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

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

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarBrand districtName={user?.districtName} />
        <SidebarNavList items={sidebarNavItems} pathname={location.pathname} />
        {renderSidebarFooter(false)}
      </aside>

      <aside className="hidden md:flex lg:hidden flex-col w-16 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarBrand collapsed districtName={user?.districtName} />
        <SidebarNavList items={sidebarNavItems} pathname={location.pathname} collapsed />
        {renderSidebarFooter(true)}
      </aside>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={common.appName}>
        <div className="mb-4 px-2 py-3 rounded-xl bg-background-subtle">
          <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
          <p className="text-body font-semibold text-text mt-0.5">{user?.name}</p>
          <p className="text-caption text-text-secondary mt-0.5">{user?.districtName}</p>
        </div>
        <SidebarNavList
          items={sidebarNavItems}
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
                  <p className="text-caption truncate">{user?.districtName}</p>
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

        <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 xl:px-8 pb-24 lg:pb-6 min-w-0">
          <DistrictRequiresOnlineBanner className="mb-3" />
          {children}
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
