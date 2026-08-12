import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AppContext'
import { GovernmentHeader } from '@/components/auth/GovernmentHeader'
import { InputField } from '@/components/auth/InputField'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { auth } from '@/locales/rw/auth'
import { env } from '@/config/env'
import { hasRole, homePathForRole } from '@/api/roles'
import type { UserRole } from '@/types'

interface LoginFormProps {
  role: UserRole
}

export function LoginForm({ role }: LoginFormProps) {
  const { loginWithCredentials } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const title = hasRole({ role }, 'caretaker')
    ? auth.login.titleCaretaker
    : hasRole({ role }, 'ncda')
      ? auth.login.titleNcda
      : auth.login.titleDistrictOfficer

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUsernameError('')
    setPasswordError('')
    setFormError('')
    setLoading(true)

    try {
      const result = await loginWithCredentials(username, password, role)

      if (!result.success) {
        switch (result.error) {
          case 'username_required':
            setUsernameError(auth.login.usernameRequired)
            break
          case 'password_required':
            setPasswordError(auth.login.passwordRequired)
            break
          case 'invalid_credentials':
            setFormError(auth.login.invalidCredentials)
            break
          case 'wrong_role':
            setFormError(auth.login.wrongRole)
            break
          case 'api_unavailable':
            setFormError(auth.login.apiUnavailable)
            break
        }
        return
      }

      navigate(homePathForRole(result.role))
    } catch {
      setFormError(auth.login.invalidCredentials)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[30rem] bg-surface rounded-xl border border-border shadow-md px-5 py-7 sm:px-7">
      <div className="mb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-body text-text-secondary font-semibold hover:text-primary transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          {auth.login.backToRoleSelection}
        </Link>
      </div>

      <GovernmentHeader />

      <div className="mt-6 mb-6 text-center">
        <h1 className="text-heading text-text mb-2">{title}</h1>
        <p className="text-body-lg text-text-secondary">{auth.login.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {env.isProductionMock && (
          <Alert variant="warning">{auth.login.apiUnavailable}</Alert>
        )}
        {formError && <Alert variant="error">{formError}</Alert>}

        <InputField
          label={auth.login.username}
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={auth.login.usernamePlaceholder}
          error={usernameError}
          disabled={loading}
        />

        <InputField
          label={auth.login.password}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={auth.login.passwordPlaceholder}
          error={passwordError}
          disabled={loading}
        />

        <div className="pt-2">
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {auth.login.submit}
          </Button>
        </div>
      </form>

      <p className="text-center mt-6">
        <button
          type="button"
          className="text-body text-primary font-semibold underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
          onClick={() => {
            window.alert(auth.login.helpMessage)
          }}
        >
          {auth.login.helpLink}
        </button>
      </p>
    </div>
  )
}
