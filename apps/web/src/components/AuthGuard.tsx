/**
 * AuthGuard Component
 * Redirects authenticated users away from auth pages (signin/signup) to dashboard
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  redirectTo = '/dashboard' 
}) => {
  const { user, loading } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading) return;

    // If user is authenticated, redirect to dashboard
    if (user) {
      console.log('🔒 AuthGuard: User is authenticated, redirecting to', redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, don't render the auth pages
  if (user) {
    return null;
  }

  // User is not authenticated, render the auth pages
  return <>{children}</>;
};
