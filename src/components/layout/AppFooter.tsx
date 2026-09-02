import "../../styles/AppFooter.css";

export function AppFooter() {
  const environment = import.meta.env.VITE_APP_ENVIRONMENT ?? "Development";

  const release = import.meta.env.VITE_APP_VERSION ?? "1.0.0";

  return (
    <footer className="app-footer">
      <span>
        Environment: <strong>{environment}</strong>
      </span>

      <span className="app-footer-divider">•</span>

      <span>
        Release: <strong>v{release}</strong>
      </span>
    </footer>
  );
}
