import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { GradientButton } from './ui/gradient-button';
import { Check, CreditCard, ArrowLeft } from 'lucide-react';
import { supabase, getAuthRedirectUrl } from '@/lib/supabaseClient';

interface SubscriptionUpgradePromptProps {
  onUpgrade: () => void;
  onBack: () => void;
  reason?: 'no_credits' | 'no_subscription' | 'trial_expired';
}

// Use the same plans as Settings page
const PLANS = [
  { key: 'PAYG', title: 'Pay As You Go', priceLabel: '$9 one-time', blurb: 'Simple credits pack. No renewal.',
    bullets: ['10 emails', '1 image', '20 revisions', '1 brand'] },
  { key: 'STARTER', title: 'Starter', priceLabel: '$19 / mo', blurb: 'For getting started with regular campaigns.',
    bullets: ['30 emails', '5 images', '60 revisions', '2 brands'] },
  { key: 'GROWTH', title: 'Growth', priceLabel: '$49 / mo', blurb: 'For growing teams and higher volume.',
    bullets: ['120 emails', '25 images', '300 revisions', '5 brands'] },
  { key: 'SCALE', title: 'Scale', priceLabel: '$99 / mo', blurb: 'For scale and frequent iterations.',
    bullets: ['300 emails', '75 images', '900 revisions', '15 brands'] },
];

const getReasonMessage = (reason?: string) => {
  switch (reason) {
    case 'no_credits':
      return {
        title: 'No Email Credits Remaining',
        description: 'You\'ve used all your email credits. Upgrade your plan to continue generating emails.',
        icon: '📧'
      };
    case 'no_subscription':
      return {
        title: 'Subscription Required',
        description: 'You need an active subscription to generate emails. Choose a plan below to get started.',
        icon: '💳'
      };
    case 'trial_expired':
      return {
        title: 'Trial Period Ended',
        description: 'Your free trial has ended. Upgrade to continue generating emails and unlock all features.',
        icon: '⏰'
      };
    default:
      return {
        title: 'Upgrade Required',
        description: 'You need to upgrade your plan to continue generating emails.',
        icon: '🚀'
      };
  }
};

export const SubscriptionUpgradePrompt: React.FC<SubscriptionUpgradePromptProps> = ({ 
  onUpgrade, 
  onBack, 
  reason 
}) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonInfo = getReasonMessage(reason);

  const sendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto">
        <Card className="border-2 border-primary/20 bg-card">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">{reasonInfo.icon}</span>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {reasonInfo.title}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {reasonInfo.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Show plan cards only for non-trial-expired reasons */}
            {reason !== 'trial_expired' && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                  {PLANS.map((p) => (
                    <Card key={p.key} className="flex flex-col bg-card border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={onUpgrade}>
                      <CardHeader>
                        <CardTitle className="text-xl text-foreground">{p.title}</CardTitle>
                        <CardDescription className="text-muted-foreground">{p.blurb}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col">
                        <div className="mb-3 text-2xl font-semibold text-foreground">{p.priceLabel}</div>
                        <ul className="mb-4 space-y-2 text-sm">
                          {p.bullets.map((b) => (
                            <li key={b} className="flex items-center gap-2 text-muted-foreground">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="text-center space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <GradientButton
                      variant="solid"
                      onClick={onUpgrade}
                      className="!bg-primary !text-primary-foreground hover:!bg-primary/90"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Choose Plan & Upgrade
                    </GradientButton>
                    
                    <GradientButton
                      variant="outline"
                      onClick={onBack}
                      className="!bg-background !text-foreground !border !border-border hover:!bg-muted"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </GradientButton>
                  </div>
                </div>
              </>
            )}
            
            {/* For trial_expired, show simplified sign-up only */}
            {reason === 'trial_expired' && (
              <div className="text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <GradientButton
                    variant="outline"
                    onClick={onBack}
                    className="!bg-background !text-foreground !border !border-border hover:!bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </GradientButton>
                </div>
              </div>
            )}
              
            {/* Sign Up Section */}
            <div className={`${reason === 'trial_expired' ? 'mt-4' : 'mt-8 pt-6 border-t border-border'}`}>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {reason === 'trial_expired' ? 'Sign up to continue' : "Don't have an account yet?"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {reason === 'trial_expired' 
                      ? 'Enter your email to receive a magic link and create your account'
                      : 'Enter your email to receive a magic link and create your account'
                    }
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-3 mt-4">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMagicLink();
                      }
                    }}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    autoFocus
                  />
                  
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {sent && <p className="text-sm text-green-600">Magic link sent! Check your inbox.</p>}
                  
                  <GradientButton
                    variant="solid"
                    onClick={sendMagicLink}
                    disabled={loading || !email.trim()}
                    className="w-full !bg-primary !text-primary-foreground"
                  >
                    {loading ? "Sending…" : "Send magic link"}
                  </GradientButton>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
