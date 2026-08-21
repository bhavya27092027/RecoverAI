import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOnboarding = true,
}) => {
  const { isAuthenticated, isLoading, merchant } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400">Authenticating RecoverAI session...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login page with return url
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If merchant has NOT completed onboarding and tries to access dashboard or settings, redirect to /onboarding
  if (requireOnboarding && merchant && !merchant.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If merchant HAS completed onboarding and attempts to visit /onboarding, redirect to /dashboard
  if (location.pathname === '/onboarding' && merchant && merchant.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
