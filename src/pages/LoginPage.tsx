export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">TalentLens</p>

        <form className="login-form">
          <label>
            Email
            <input type="email" name="email" placeholder="maya.chen@talentlens.local" />
          </label>
          <label>
            Password
            <input type="password" name="password" placeholder="Enter password" />
          </label>
          <button type="button">Sign in</button>
        </form>
      </section>
    </main>
  )
}
