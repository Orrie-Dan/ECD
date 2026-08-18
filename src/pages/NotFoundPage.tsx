import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { GovernmentHeader } from '@/components/auth/GovernmentHeader'
import { common } from '@/locales/rw/common'

export function NotFoundPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-start sm:justify-center bg-background px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12 w-full min-w-0">
      <div className="w-full max-w-120 bg-surface rounded-xl border border-border/80 shadow-md px-5 py-6 text-center sm:px-6 sm:py-7">
        <GovernmentHeader variant="compact" />

        <div className="mt-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-light/40 text-warning-dark">
            <AlertTriangle size={30} strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        <p className="mt-5 text-caption font-semibold uppercase tracking-[0.18em] text-text-muted">
          {common.notFound.code}
        </p>
        <h1 className="mt-2 text-heading text-text">{common.notFound.title}</h1>
        <p className="mt-3 text-body-lg text-text-secondary">{common.notFound.description}</p>

        <Link
          to="/"
          className="mt-6 inline-flex min-h-13 items-center justify-center rounded-xl border border-primary bg-primary px-5 text-body font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:scale-[1.02] hover:border-primary-dark hover:bg-primary-dark hover:shadow-md focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 active:scale-[0.98] active:shadow-sm"
        >
          {common.notFound.goHome}
        </Link>
      </div>
    </main>
  )
}
