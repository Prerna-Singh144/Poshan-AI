import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading)
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-label="Checking your session"
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
      </div>
    );
  if (!isLoading && (!isAuthenticated || !user)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user.onboardingCompleted !== true && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (user.onboardingCompleted === true && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }
  return children ?? <Outlet />;
}
