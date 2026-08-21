import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, merchant } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
        </div>
      </div>
    );
  }

  // If already authenticated, redirect away from public login/signup
  if (isAuthenticated) {
    // If onboarding is incomplete, take to onboarding, else dashboard
    if (merchant && !merchant.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
