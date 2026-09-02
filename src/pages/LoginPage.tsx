import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../lib/apiClient";
import { useAuth } from "../features/auth/authContext";
import "../styles/LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (status === "authenticated") {
    return <Navigate to={getRedirectPath(location.state)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);

    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email, password });

      navigate(getRedirectPath(location.state), {
        replace: true,
      });
    } catch (err) {
      setError(getLoginError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-grid" />
      </div>

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-wrapper">
            <img className="auth-logo" src="/cavista-logo.png" alt="Cavista" />
          </div>

          <div className="brand-divider" />

          <span className="brand-product">C-TalentLens</span>
        </div>

        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Sign in to continue to your C-TalentLens account.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Work email</label>

            <div className="input-wrapper">
              <svg
                className="input-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M4 6h16v12H4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="m4 7 8 6 8-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>

              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="somebody@cavista.com"
                disabled={isSubmitting}
                onChange={() => error && setError("")}
              />
            </div>
          </div>

          <div className="form-field">
            <div className="field-label-row">
              <label htmlFor="password">Password</label>
            </div>

            <div className="input-wrapper">
              <svg
                className="input-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 10V7a4 4 0 0 1 8 0v3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={isSubmitting}
                onChange={() => error && setError("")}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3 3l18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M9.9 4.3A10.7 10.7 0 0 1 12 4c5.2 0 8.8 4 10 8-0.4 1.3-1.1 2.5-2 3.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6.1 6.1C3.9 7.6 2.6 9.9 2 12c1.2 4 4.8 8 10 8 1.7 0 3.2-.4 4.5-1.1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 8v5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16.5" r="1" fill="currentColor" />
              </svg>

              <span>{error}</span>
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="button-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>© {new Date().getFullYear()} Cavista</span>
          <span className="footer-dot">•</span>
          <span>Secure access</span>
        </div>
      </section>
    </main>
  );
}

function getRedirectPath(state: unknown) {
  if (
    typeof state === "object" &&
    state !== null &&
    "from" in state &&
    typeof state.from === "object" &&
    state.from !== null &&
    "pathname" in state.from &&
    typeof state.from.pathname === "string"
  ) {
    return state.from.pathname;
  }

  return "/dashboard";
}

function getLoginError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Email or password is incorrect.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Sign in failed. Please try again.";
}
