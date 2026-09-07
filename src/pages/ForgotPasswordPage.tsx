import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { GovernmentHeader } from '@/components/auth/GovernmentHeader'
import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { requestPasswordReset } from '@/api/resources/auth'
import { normalizeApiError } from '@/api/errors'
import { auth } from '@/locales/rw/auth'

function looksLikeEmail(value: string): boolean {
  return value.includes('@')
}

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError('')
    setFormError('')

    const trimmed = identifier.trim()
    if (!trimmed) {
      setFieldError(auth.forgotPassword.emailOrUsernameRequired)
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset(
        looksLikeEmail(trimmed) ? { email: trimmed } : { username: trimmed },
      )
      setAccepted(true)
    } catch (err) {
      setFormError(normalizeApiError(err).message || auth.forgotPassword.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-start sm:justify-center bg-background px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12 w-full min-w-0">
      <div className="w-full max-w-[30rem] bg-surface rounded-xl border border-border shadow-md px-5 py-7 sm:px-7">
        <div className="mb-5">
          <Link
            to="/"
            className="touch-target inline-flex items-center gap-1.5 text-body text-text-secondary font-semibold hover:text-primary transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
          >
            <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
            {auth.forgotPassword.backToLogin}
          </Link>
        </div>

        <GovernmentHeader />

        <div className="mt-6 mb-6 text-center">
          <h1 className="text-heading text-text mb-2">{auth.forgotPassword.title}</h1>
          <p className="text-body-lg text-text-secondary">{auth.forgotPassword.subtitle}</p>
        </div>

        {accepted ? (
          <Alert variant="success">{auth.forgotPassword.accepted}</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {formError ? <Alert variant="error">{formError}</Alert> : null}

            <InputField
              label={auth.forgotPassword.emailOrUsername}
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={auth.forgotPassword.emailOrUsernamePlaceholder}
              error={fieldError}
              disabled={loading}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                {auth.forgotPassword.submit}
              </Button>
            </div>
          </form>
        )}
      </div>

      <footer className="mt-8 text-center max-w-md">
        <p className="text-body text-text-muted">{auth.login.governmentFooterLine1}</p>
      </footer>
    </main>
  )
}
