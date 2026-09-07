import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { GovernmentHeader } from '@/components/auth/GovernmentHeader'
import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { confirmPasswordReset } from '@/api/resources/auth'
import { normalizeApiError } from '@/api/errors'
import { auth } from '@/locales/rw/auth'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setConfirmError('')
    setFormError('')

    if (!token) {
      setFormError(auth.resetPassword.tokenMissing)
      return
    }
    if (!newPassword) {
      setPasswordError(auth.resetPassword.passwordRequired)
      return
    }
    if (newPassword.length < 6) {
      setPasswordError(auth.resetPassword.passwordTooShort)
      return
    }
    if (newPassword !== confirmPassword) {
      setConfirmError(auth.resetPassword.passwordMismatch)
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset({ token, newPassword })
      setSuccess(true)
    } catch (err) {
      setFormError(normalizeApiError(err).message || auth.resetPassword.error)
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
            {auth.resetPassword.goToLogin}
          </Link>
        </div>

        <GovernmentHeader />

        <div className="mt-6 mb-6 text-center">
          <h1 className="text-heading text-text mb-2">{auth.resetPassword.title}</h1>
          <p className="text-body-lg text-text-secondary">{auth.resetPassword.subtitle}</p>
        </div>

        {!token ? (
          <Alert variant="error">{auth.resetPassword.tokenMissing}</Alert>
        ) : success ? (
          <div className="space-y-5">
            <Alert variant="success">{auth.resetPassword.success}</Alert>
            <Link to="/" className="block">
              <Button type="button" variant="primary" size="lg" fullWidth>
                {auth.resetPassword.goToLogin}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {formError ? <Alert variant="error">{formError}</Alert> : null}

            <InputField
              label={auth.resetPassword.newPassword}
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={auth.resetPassword.newPasswordPlaceholder}
              error={passwordError}
              disabled={loading}
            />

            <InputField
              label={auth.resetPassword.confirmPassword}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={auth.resetPassword.confirmPasswordPlaceholder}
              error={confirmError}
              disabled={loading}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                {auth.resetPassword.submit}
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
