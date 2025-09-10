import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { TrialBlockedOverlay } from '@/components/TrialBlockedOverlay';

interface TrialGuardProps {
  children: React.ReactNode;
}

export const TrialGuard: React.FC<TrialGuardProps> = ({ children }) => {
  const { user } = useSupabaseAuth();
  const [isTrialBlocked, setIsTrialBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [blockReason, setBlockReason] = useState<'localStorage' | 'ip'>('localStorage');

  useEffect(() => {
    // If user is authenticated, they can access everything
    if (user) {
      setIsTrialBlocked(false);
      setIsLoading(false);
      return;
    }

    // Check localStorage first
    const freeTrialUsed = localStorage.getItem('freemium_trial_used');
    if (freeTrialUsed) {
      setIsTrialBlocked(true);
      setBlockReason('localStorage');
      setIsLoading(false);
      return;
    }

    // Check IP-based blocking by making a test request
    checkIPTrialStatus().then((ipBlocked) => {
      if (ipBlocked) {
        setIsTrialBlocked(true);
        setBlockReason('ip');
      }
      setIsLoading(false);
    }).catch(() => {
      // If check fails, allow access (don't block legitimate users)
      setIsLoading(false);
    });
  }, [user]);

  const checkIPTrialStatus = async (): Promise<boolean> => {
    try {
      // Make a test request to check if IP is blocked
      const response = await fetch('/api/generate/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: 'test.com',
          emailType: 'Promotion',
          userContext: 'test',
          imageContext: 'test',
          products: [],
          brandData: {},
          customHeroImage: true
        })
      });

      if (response.status === 403) {
        const data = await response.json();
        return data.code === 'TRIAL_USED';
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check IP trial status:', error);
      return false;
    }
  };

  const handleSubscribe = () => {
    window.location.href = "/settings?plan=1";
  };

  const handleSignIn = () => {
    window.location.href = "/settings";
  };

  // Show loading state briefly to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If trial is blocked, show the blocking overlay
  if (isTrialBlocked) {
    return <TrialBlockedOverlay onSubscribe={handleSubscribe} onSignIn={handleSignIn} />;
  }

  // Otherwise, render the normal app
  return <>{children}</>;
};
