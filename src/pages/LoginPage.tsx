import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAccessToken } from '../lib/authToken'

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')?.toString().trim()
    const password = formData.get('password')?.toString().trim()

    if (!email || !password) {
      setError('Enter email and password.')
      return
    }

    setAccessToken('demo-token')
    navigate('/dashboard')
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
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  )
}
