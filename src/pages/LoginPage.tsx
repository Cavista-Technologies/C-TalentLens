import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/apiClient'
import { useAuth } from '../features/auth/authContext'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, status } = useAuth()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={getRedirectPath(location.state)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')?.toString().trim()
    const password = formData.get('password')?.toString().trim()

    if (!email || !password) {
      setError('Enter email and password.')
      return
    }

    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate(getRedirectPath(location.state), { replace: true })
    } catch (err) {
      setError(getLoginError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <img className="auth-logo" src="/cavista-logo.png" alt="Cavista" />
        <h1>TalentLens</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" name="email" placeholder="somebody@cavista.com" />
          </label>
          <label>
            Password
            <input type="password" name="password" placeholder="Enter password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

function getRedirectPath(state: unknown) {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'object' &&
    state.from !== null &&
    'pathname' in state.from &&
    typeof state.from.pathname === 'string'
  ) {
    return state.from.pathname
  }

  return '/dashboard'
}

function getLoginError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return 'Email or password is incorrect.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Sign in failed.'
}
