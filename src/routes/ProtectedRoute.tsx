import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "../components/feedback/StateMessage";
import { useAuth } from "../features/auth/authContext";

type ProtectedRouteProps = {
  allowedRoles?: string[];
  children: ReactNode;
};

export function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <main className="route-state">
        <LoadingState branded message="Preparing workspace" />
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    allowedRoles &&
    !user?.roles.some((role) => allowedRoles.includes(role))
  ) {
    return (
      <main className="route-state">
        <div className="state-message error">
          <strong>Access restricted</strong>
          <p>Your role does not have access to this page.</p>
        </div>
      </main>
    );
  }

  return children;
}
