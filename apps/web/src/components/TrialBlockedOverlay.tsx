import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { GradientButton } from './ui/gradient-button';
import { Lock } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';

interface TrialBlockedOverlayProps {
  onSubscribe: () => void;
  onSignIn: () => void;
}

export const TrialBlockedOverlay: React.FC<TrialBlockedOverlayProps> = ({ onSubscribe, onSignIn }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
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
        <Card className="border-2 border-destructive/20 bg-card">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-destructive to-orange-600 rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Free Trial Complete
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              You've used your free trial! Sign up to continue generating emails and unlock all features.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Sign Up Section */}
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Sign up to get started</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your email to receive a magic link and create your account
                </p>
              </div>
              
              {/* Sign into existing account option */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Already have an account?
                </p>
                <button
                  onClick={onSignIn}
                  className="text-primary hover:text-primary/80 underline text-sm font-medium transition-colors"
                >
                  Sign into existing account
                </button>
              </div>
              
              <div className="max-w-md mx-auto space-y-3">
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
