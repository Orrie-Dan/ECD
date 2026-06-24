import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Map, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { ConfirmModal } from '@/components/ui/Modal'
import { BottomNav } from '@/components/ui/BottomNav'
import { useState } from 'react'
import { common, messages } from '@/locales/rw/common'
import { district } from '@/locales/rw/district'
import ncdaLogo from '@/assets/ncda-logo.png'

interface DistrictLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: '/district', label: district.nav.overview, icon: LayoutDashboard },
  { path: '/district/ibigo', label: district.nav.centers, icon: Building2 },
  { path: '/district/ikarita', label: district.nav.gis, icon: Map },
]

export function DistrictLayout({ children }: DistrictLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-border shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-border overflow-hidden">
              <img
                src={ncdaLogo}
                alt="NCDA"
                className="w-full h-full object-contain scale-[1.35]"
                loading="eager"
                decoding="async"
              />
            </div>
            <div>
              <h1 className="text-subheading text-primary leading-tight">{common.appName}</h1>
              <p className="text-caption mt-0.5">{user?.districtName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5" aria-label="Imbuga nkuru">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-body font-medium transition-colors
                  ${isActive
                    ? 'bg-primary-light text-primary shadow-sm'
                    : 'text-text-secondary hover:bg-background-subtle hover:text-text'}
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="px-4 py-3 mb-2 rounded-xl bg-background-subtle">
            <p className="text-caption text-text-muted">Ukoresha sisitemu</p>
            <p className="text-body font-semibold text-text mt-0.5">{user?.name}</p>
          </div>
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-body text-error hover:bg-error-light transition-colors font-medium"
          >
            <LogOut size={20} />
            {common.logout}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-surface border-b border-border sticky top-0 z-40 shadow-sm">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-border overflow-hidden">
                <img
                  src={ncdaLogo}
                  alt="NCDA"
                  className="w-full h-full object-contain scale-[1.35]"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div>
                <h1 className="text-body font-bold text-text leading-tight">{common.appName}</h1>
                <p className="text-caption">{user?.districtName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogout(true)}
              className="p-2 rounded-lg text-error hover:bg-error-light transition-colors"
              aria-label={common.logout}
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 xl:px-8 pb-24 lg:pb-6">
          {children}
        </main>

        <BottomNav items={navItems} />
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
