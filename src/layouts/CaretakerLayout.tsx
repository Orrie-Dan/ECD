import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Baby,
  ChevronDown,
  User,
  Home,
  Users,
  UserPlus,
  ClipboardCheck,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { ConfirmModal } from '@/components/ui/Modal'
import { useState, useRef, useEffect } from 'react'
import { common, messages } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'

interface CaretakerLayoutProps {
  children: React.ReactNode
  pageTitle?: string
}

const navItems: {
  path: string
  label: string
  icon: LucideIcon
  matchPaths?: string[]
}[] = [
  { path: '/caretaker', label: caretaker.nav.home, icon: Home, matchPaths: ['/caretaker'] },
  { path: '/caretaker/abana', label: caretaker.nav.children, icon: Users, matchPaths: ['/caretaker/abana'] },
  { path: '/caretaker/kwiyandikisha', label: caretaker.nav.register, icon: UserPlus },
  { path: '/caretaker/ubwitabire', label: caretaker.nav.attendance, icon: ClipboardCheck },
  { path: '/caretaker/raporo', label: caretaker.nav.reports, icon: BarChart3 },
  { path: '/caretaker/igenamiterere', label: caretaker.nav.settings, icon: Settings },
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

function isNavActive(pathname: string, item: (typeof navItems)[number]): boolean {
  if (item.matchPaths) {
    return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  }
  return pathname === item.path
}

export function CaretakerLayout({ children, pageTitle }: CaretakerLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const title = pageTitle ?? getPageTitle(location.pathname)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-surface border-r border-border shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="p-4 xl:p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-light shrink-0">
              <Baby size={22} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-subheading text-primary leading-tight truncate">{common.appName}</h1>
              <p className="text-caption mt-0.5 truncate">{user?.centerName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2.5 xl:p-3 space-y-0.5 overflow-y-auto" aria-label="Imbuga nkuru">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = isNavActive(location.pathname, item)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-body font-medium
                  transition-all duration-200 ease-out
                  ${isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:bg-background-subtle hover:text-text hover:scale-[1.01]'}
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 xl:p-4 border-t border-border">
          <div className="px-4 py-3 rounded-xl bg-background-subtle">
            <p className="text-caption text-text-muted">Ukoresha sisitemu</p>
            <p className="text-body font-semibold text-text mt-0.5 truncate">{user?.name}</p>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-56 xl:ml-60">
        {/* Header */}
        <header className="bg-surface border-b border-border sticky top-0 z-40 shadow-sm">
          <div className="px-4 sm:px-5 lg:px-6 h-14 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-heading text-text truncate">{title}</h2>
            </div>

            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
              <div className="hidden md:block text-right">
                <p className="text-body font-semibold text-text leading-tight">{user?.name}</p>
                <p className="text-caption truncate max-w-[200px]">{user?.centerName}</p>
              </div>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background-subtle hover:bg-background transition-colors"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="true"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-light text-primary">
                    <User size={18} />
                  </div>
                  <ChevronDown size={16} className="text-text-muted hidden sm:block" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl border border-border shadow-lg py-1 z-50">
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

        {/* Mobile nav strip */}
        <nav className="lg:hidden flex overflow-x-auto border-b border-border bg-surface px-2 py-2 gap-1 shrink-0" aria-label="Imbuga nkuru">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = isNavActive(location.pathname, item)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-caption font-medium whitespace-nowrap shrink-0 transition-colors
                  ${isActive ? 'bg-primary text-white' : 'text-text-secondary hover:bg-background-subtle'}
                `}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                <span className="hidden xs:inline">{item.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </nav>

        <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 xl:px-8">
          {children}
        </main>
      </div>

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
