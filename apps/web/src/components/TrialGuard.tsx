import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { TrialBlockedOverlay } from '@/components/TrialBlockedOverlay';
import { supabase } from '@/lib/supabaseClient';

const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .maybeSingle();
    
    return Boolean(data?.is_admin);
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
};

const checkSubscriptionStatus = async (userId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Check if user has an active subscription
    return data?.status === 'active';
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
};

interface TrialGuardProps {
  children: React.ReactNode;
}

export const TrialGuard: React.FC<TrialGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [isTrialBlocked, setIsTrialBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [blockReason, setBlockReason] = useState<'localStorage' | 'ip'>('localStorage');

  useEffect(() => {
    // Development override - check for dev flag
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('dev_override_trial')) {
      console.log('🔧 Development mode: Trial blocking disabled');
      setIsTrialBlocked(false);
      setIsLoading(false);
      return;
    }

    // Wait for auth to finish loading before making any decisions
    if (authLoading) {
      return;
    }

    // If user is authenticated, check if they're an admin first
    if (user) {
      checkAdminStatus(user.id).then((isAdmin) => {
        if (isAdmin) {
          console.log('🔧 Admin user: Bypassing all trial and subscription checks');
          setIsTrialBlocked(false);
          setIsLoading(false);
          return;
        }

        // Not an admin, check subscription status
        checkSubscriptionStatus(user.id).then((hasActiveSubscription) => {
          if (hasActiveSubscription) {
            setIsTrialBlocked(false);
          } else {
            // User is authenticated but has no active subscription
            // Authenticated users should always have access to the app
            // They'll be blocked from generation functions instead
            setIsTrialBlocked(false);
          }
          setIsLoading(false);
        }).catch(() => {
          // If subscription check fails, allow access (don't block legitimate users)
          setIsTrialBlocked(false);
          setIsLoading(false);
        });
      }).catch(() => {
        // If admin check fails, proceed with normal subscription check
        checkSubscriptionStatus(user.id).then((hasActiveSubscription) => {
          if (hasActiveSubscription) {
            setIsTrialBlocked(false);
          } else {
            // User is authenticated but has no active subscription
            // Authenticated users should always have access to the app
            // They'll be blocked from generation functions instead
            setIsTrialBlocked(false);
          }
          setIsLoading(false);
        }).catch(() => {
          setIsTrialBlocked(false);
          setIsLoading(false);
        });
      });
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
  }, [user, authLoading]);

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
    window.location.href = "/dashboard?plan=1";
  };

  const handleSignIn = () => {
    window.location.href = "/dashboard";
  };

  // Show loading state while auth is loading or while we're checking trial status
  if (isLoading || authLoading) {
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
