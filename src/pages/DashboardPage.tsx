export function DashboardPage() {
  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <div className="brand-mark">TL</div>
        <div>
          <strong>TalentLens</strong>
          <span>Recruitment dashboard</span>
        </div>
      </aside>

      <section className="dashboard-shell">
        <p className="eyebrow">Dashboard</p>
        <h1>Backend connection is ready</h1>
        <p className="lede">
          Routing and API plumbing are in place. The next chunk can connect login and load live
          dashboard metrics from the backend.
        </p>
      </section>
    </main>
  )
}
