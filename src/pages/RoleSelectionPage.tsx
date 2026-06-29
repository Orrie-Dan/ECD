import { GovernmentHeader } from '@/components/auth/GovernmentHeader'
import { RoleSelector } from '@/components/auth/RoleSelector'
import { auth } from '@/locales/rw/auth'

export function RoleSelectionPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#F3F7F5] px-4 py-8 sm:py-12 w-full min-w-0">
      {/* TODO: optional illustration/background element */}

      <div className="w-full max-w-[30rem] bg-surface rounded-xl border border-border/80 shadow-md px-5 py-6 sm:px-6 sm:py-7">
        <GovernmentHeader variant="compact" />

        <div className="mt-6 mb-6 text-center">
          <h1 className="text-heading text-text mb-2">{auth.roleSelection.welcomeTitle}</h1>
          <p className="text-body-lg text-text-secondary">{auth.roleSelection.welcomeSubtitle}</p>
        </div>

        <RoleSelector />
      </div>

      <footer className="mt-6 sm:mt-8 text-center max-w-[34rem] w-full">
        <p className="text-body text-text-muted">{auth.login.governmentFooterLine1}</p>
        {auth.login.governmentFooterLine2 && (
          <p className="text-body text-text-muted mt-1">{auth.login.governmentFooterLine2}</p>
        )}
      </footer>
    </main>
  )
}
