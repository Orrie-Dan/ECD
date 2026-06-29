import { useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  ChevronDown,
  ArrowLeft,
  User,
  Home,
  Users,
  UserPlus,
  ClipboardCheck,
  BarChart3,
  Settings,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { BottomNav, type NavItem } from '@/components/ui/BottomNav'
import { NavDrawer } from '@/components/ui/NavDrawer'
import { SidebarNavLink, isSidebarNavActive, type SidebarNavItem } from '@/components/ui/SidebarNavLink'
import { useState, useRef, useEffect } from 'react'
import { common, messages } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import ncdaLogo from '@/assets/ncda-logo.png'

interface CaretakerLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  backTo?: string
  backLabel?: string
}

const navItems: SidebarNavItem[] = [
  { path: '/caretaker', label: caretaker.nav.home, icon: Home },
  { path: '/caretaker/abana', label: caretaker.nav.children, icon: Users, matchPaths: ['/caretaker/abana'] },
  { path: '/caretaker/kwiyandikisha', label: caretaker.nav.register, icon: UserPlus },
  { path: '/caretaker/ubwitabire', label: caretaker.nav.attendance, icon: ClipboardCheck },
  { path: '/caretaker/raporo', label: caretaker.nav.reports, icon: BarChart3 },
  { path: '/caretaker/igenamiterere', label: caretaker.nav.settings, icon: Settings },
]

const mobileNavItems: NavItem[] = [
  { path: '/caretaker', label: caretaker.nav.home, icon: Home },
  { path: '/caretaker/abana', label: caretaker.nav.children, icon: Users, matchPaths: ['/caretaker/abana'] },
  { path: '/caretaker/kwiyandikisha', label: caretaker.nav.register, icon: UserPlus },
  { path: '/caretaker/ubwitabire', label: caretaker.nav.attendance, icon: ClipboardCheck },
  { path: '/caretaker/raporo', label: caretaker.nav.reports, icon: BarChart3 },
]

function getPageTitle(pathname: string): string {
  if (pathname === '/caretaker') return caretaker.nav.home
  if (pathname.startsWith('/caretaker/abana')) return caretaker.nav.children
  if (pathname === '/caretaker/kwiyandikisha') return caretaker.nav.register
  if (pathname === '/caretaker/ubwitabire') return caretaker.nav.attendance
  if (pathname === '/caretaker/raporo') return caretaker.nav.reports
  if (pathname === '/caretaker/igenamiterere') return caretaker.nav.settings
  return common.appName
}

function SidebarBrand({ collapsed = false, centerName }: { collapsed?: boolean; centerName?: string }) {
  return (
    <div className={`border-b border-border ${collapsed ? 'p-3' : 'p-4 xl:p-5'}`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-border shrink-0 overflow-hidden">
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
            <p className="text-caption mt-0.5 truncate">{centerName}</p>
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
    <nav className={`flex-1 overflow-y-auto space-y-0.5 ${collapsed ? 'p-2' : 'p-2.5 xl:p-3'}`} aria-label={common.nav.mainNav}>
      {items.map((item) => (
        <SidebarNavLink
          key={item.path}
          item={item}
          active={isSidebarNavActive(pathname, item)}
          collapsed={collapsed}
          onNavigate={onNavigate}
          activeStyle="filled"
        />
      ))}
    </nav>
  )
}

export function CaretakerLayout({ children, pageTitle, backTo, backLabel }: CaretakerLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const title = pageTitle ?? getPageTitle(location.pathname)
  const showBack = Boolean(backTo || backLabel)
  const resolvedBackLabel = backLabel ?? common.back

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const renderSidebar = (collapsed: boolean) => (
    <>
      <SidebarBrand collapsed={collapsed} centerName={user?.centerName} />
      <SidebarNavList items={navItems} pathname={location.pathname} collapsed={collapsed} />
      {!collapsed && (
        <div className="p-3 xl:p-4 border-t border-border">
          <div className="px-4 py-3 rounded-xl bg-background-subtle">
            <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
            <p className="text-body font-semibold text-text mt-0.5 truncate">{user?.name}</p>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        {renderSidebar(false)}
      </aside>

      {/* Tablet collapsed sidebar */}
      <aside className="hidden md:flex lg:hidden flex-col w-16 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        {renderSidebar(true)}
      </aside>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={common.appName}>
        <div className="mb-4 px-2 py-3 rounded-xl bg-background-subtle">
          <p className="text-caption text-text-muted">{common.ui.systemUser}</p>
          <p className="text-body font-semibold text-text mt-0.5">{user?.name}</p>
          <p className="text-caption text-text-secondary mt-0.5">{user?.centerName}</p>
        </div>
        <SidebarNavList
          items={navItems}
          pathname={location.pathname}
          onNavigate={() => setDrawerOpen(false)}
        />
      </NavDrawer>

      <div className="flex-1 flex flex-col min-w-0 md:ml-16 lg:ml-56 xl:ml-60">
        <header className="bg-surface border-b border-border sticky top-0 z-40 shadow-sm">
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
                        setShowProfileMenu(false)
                        setShowLogout(true)
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
          {children}
        </main>
      </div>

      <BottomNav items={mobileNavItems} />

      <ConfirmModal
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={() => {
          logout()
          navigate('/')
        }}
        title={common.logout}
        message={messages.confirmLogout}
        confirmLabel={common.yes}
        cancelLabel={common.no}
      />
    </div>
  )
}
