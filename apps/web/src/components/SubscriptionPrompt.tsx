import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { GradientButton } from './ui/gradient-button';
import { Check } from 'lucide-react';

interface SubscriptionPromptProps {
  onSubscribe: () => void;
  onSignIn: () => void;
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

export const SubscriptionPrompt: React.FC<SubscriptionPromptProps> = ({ onSubscribe, onSignIn }) => {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Choose a Plan</CardTitle>
          <CardDescription className="text-center">
            You've seen what we can do! Subscribe to access all features and save your emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((p) => (
              <Card key={p.key} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">{p.title}</CardTitle>
                  <CardDescription>{p.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="mb-3 text-2xl font-semibold">{p.priceLabel}</div>
                  <ul className="mb-4 space-y-2 text-sm">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <GradientButton
                    variant="solid"
                    onClick={onSubscribe}
                    className="mt-auto !bg-primary !text-primary-foreground"
                  >
                    Select
                  </GradientButton>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Sign In Option */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Already have an account?
            </p>
            <GradientButton
              variant="outline"
              onClick={onSignIn}
              className="!bg-background !text-foreground !border-border hover:!bg-muted"
            >
              Sign In First
            </GradientButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};