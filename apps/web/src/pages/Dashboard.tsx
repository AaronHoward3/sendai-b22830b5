import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Pencil, X, Check, Copy, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';

/* --- Small pill switch (no external deps) --- */
function ThemeSwitch({
  checked,
  onChange,
}: { readonly checked: boolean; readonly onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
}

type UsedBrand = { domain: string; primary_color: string | null; link_color: string | null };

type Credits = {
  emails_remaining: number;
  images_remaining: number;
  revisions_remaining: number;
  brand_limit: number | null;
  updated_at: string | null;
};

type SavedImage = {
  id: string;
  public_url: string;
  path: string;
  created_at: string;
  width?: number | null;
  height?: number | null;
};

const API_ROOT = '/api';

// ---- Plan definitions ----
const PLANS = [
  { key: 'PAYG', title: 'Pay As You Go', priceLabel: '$9 one-time', blurb: 'Simple credits pack. No renewal.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PAYG as string | undefined,
    bullets: ['10 emails', '1 image', '20 revisions', '1 brand'],
    quotas: { emails: 10, images: 1, revisions: 20, brands: 1 } },
  { key: 'STARTER', title: 'Starter', priceLabel: '$19 / mo', blurb: 'For getting started with regular campaigns.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER as string | undefined,
    bullets: ['30 emails', '5 images', '60 revisions', '2 brands'],
    quotas: { emails: 30, images: 5, revisions: 60, brands: 2 } },
  { key: 'GROWTH', title: 'Growth', priceLabel: '$49 / mo', blurb: 'For growing teams and higher volume.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_GROWTH as string | undefined,
    bullets: ['120 emails', '25 images', '300 revisions', '5 brands'],
    quotas: { emails: 300/2, images: 25, revisions: 300, brands: 5 } },
  { key: 'SCALE', title: 'Scale', priceLabel: '$99 / mo', blurb: 'For scale and frequent iterations.',
    priceId: import.meta.env.VITE_STRIPE_PRICE_SCALE as string | undefined,
    bullets: ['300 emails', '75 images', '900 revisions', '15 brands'],
    quotas: { emails: 300, images: 75, revisions: 900, brands: 15 } },
];

function normalizeDomain(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

const priceToPlanKey: Record<string, 'PAYG' | 'STARTER' | 'GROWTH' | 'SCALE'> = {
  [import.meta.env.VITE_STRIPE_PRICE_PAYG || '']: 'PAYG',
  [import.meta.env.VITE_STRIPE_PRICE_STARTER || '']: 'STARTER',
  [import.meta.env.VITE_STRIPE_PRICE_GROWTH || '']: 'GROWTH',
  [import.meta.env.VITE_STRIPE_PRICE_SCALE || '']: 'SCALE',
};

function quotasFor(key: 'PAYG' | 'STARTER' | 'GROWTH' | 'SCALE' | 'FREE') {
  if (key === 'FREE') return { emails: 0, images: 0, revisions: 0, brands: 0 };
  const found = PLANS.find(p => p.key === key);
  return found?.quotas ?? { emails: 0, images: 0, revisions: 0, brands: 0 };
}

function pct(rem: number, total: number) {
  if (total <= 0) return 0;
  const v = Math.max(0, Math.min(1, rem / total));
  return Math.round(v * 100);
}

const Bar: React.FC<{ label: string; remaining: number; total: number; className?: string }> = ({ label, remaining, total, className }) => {
  // Handle loading state - if remaining is undefined/null and total is 0, show skeleton
  if (remaining === undefined || remaining === null || total === 0) {
    return (
      <div className={className}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <div className="h-3 w-12 animate-pulse rounded bg-muted"></div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-muted">
          <div className="h-2 animate-pulse bg-muted"></div>
        </div>
      </div>
    );
  }

  const used = total > 0 ? total - remaining : 0;
  const percent = total > 0 ? Math.max(0, Math.min(1, used / total)) * 100 : 0;
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {total > 0 ? (
          <span className="text-xs text-muted-foreground">{used} / {total}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{used} used</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-muted">
        <div className="h-2 bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, loading, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/');
  }, [user, loading, navigate]);

  // Theme local state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return document.documentElement.classList.contains('dark');
  });
  useEffect(() => {
    const next = isDark ? 'dark' : 'light';
    try { setTheme?.(next); } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', next);
  }, [isDark, setTheme]);

  // Image preview modal state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  useEffect(() => {
    if (!previewUrl) { dialogRef.current?.close(); return; }
    dialogRef.current?.showModal();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewUrl]);
  const [name, setName] = useState('');
  const [emailField, setEmailField] = useState('');
  // Subscription snapshot
  const [sub, setSub] = useState<{ status?: string; price_id?: string; current_period_end?: string } | null>(null);
  
  // Current plan info
  const currentPlan = useMemo(() => {
    if (!sub?.price_id) return null;
    return priceToPlanKey[sub.price_id] || null;
  }, [sub?.price_id]);

  // Credits snapshot
  const [credits, setCredits] = useState<Credits | null>(null);
  const [brandCount, setBrandCount] = useState<number>(0);

  // Brands + saved images
  const [usedBrands, setUsedBrands] = useState<UsedBrand[]>([]);
  const [imagesByDomain, setImagesByDomain] = useState<Record<string, SavedImage[]>>({});
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  // Edit brand modal
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandDomain, setBrandDomain] = useState('');
  const [color1, setColor1] = useState('#4f46e5');
  const [color2, setColor2] = useState('#22d3ee');
  const isBrandValid = useMemo(() => normalizeDomain(brandDomain).length > 0, [brandDomain]);

  // Plan picker modal
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Auto-open plan modal when arriving with ?plan=1
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('plan')) {
      setShowPlanModal(true);
    }
  }, [location.search]);

  // --- Profile: load & save ---
  useEffect(() => {
    if (!user) return;
    setEmailField(user.email ?? '');
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.display_name) setName(data.display_name);
    })();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, display_name: name || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Profile saved' });
  };

  // --- Subscription snapshot ---
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('status, price_id, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      setSub(data ?? null);
    })();
  }, [user]);

  // --- Credits snapshot ---
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API_ROOT}/credits/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setCredits(json.balance as Credits);
        setBrandCount(json.brand_count as number);
      }
    })();
  }, [user]);

  const startCheckout = async (priceId: string) => {
    if (!priceId) {
      toast({ title: 'Missing price', description: 'Set the VITE_STRIPE_PRICE_* env for this plan.', variant: 'destructive' });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${API_ROOT}/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ price_id: priceId }),
    });
    const json = await res.json();
    if (json?.url) {
      window.location.href = json.url;
    } else if (json?.fallback === 'billing_portal') {
      // User already has this plan - redirect to billing portal
      toast({ 
        title: 'Already Subscribed', 
        description: `You already have the ${json.currentPlan?.name || 'current'} plan. Redirecting to billing portal...`,
        variant: 'default'
      });
      // Open billing portal instead
      setTimeout(() => openBillingPortal(), 2000);
    } else if (json?.fallback === 'subscription_upgrade') {
      // User has a different plan - show upgrade options
      toast({ 
        title: 'Upgrade Required', 
        description: `You have the ${json.currentPlan?.name || 'current'} plan. Please use the upgrade option to change to ${json.requestedPlan?.name || 'the requested plan'}.`,
        variant: 'default'
      });
      // Show plan selection modal for upgrade
      setShowPlanModal(true);
    } else {
      toast({ title: 'Checkout error', description: json?.error || 'Unable to start checkout', variant: 'destructive' });
    }
  };

  const openBillingPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`${API_ROOT}/billing/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json?.url) {
      window.location.href = json.url;
    } else if (json?.fallback === 'subscription_management') {
      // Show subscription management options
      toast({ 
        title: 'Subscription Management', 
        description: `Current plan: ${json.currentPlan?.name || 'Unknown'}. ${json.message || 'Please contact support for subscription management.'}`,
        variant: 'default'
      });
      
      // TODO: Show subscription management modal with upgrade/downgrade/cancel options
      // For now, show the plan selection modal as a fallback
      setShowPlanModal(true);
    } else if (json?.fallback === 'plan_selection') {
      // Fallback to plan selection modal
      setShowPlanModal(true);
      toast({ 
        title: 'Billing Portal Unavailable', 
        description: 'Please use the plan selection below to manage your subscription.',
        variant: 'default'
      });
    } else {
      toast({ title: 'Portal error', description: json?.error || 'Unable to open billing portal', variant: 'destructive' });
    }
  };
  // --- Brands list + colors + images ---
  useEffect(() => {
    if (!user) return;
    (async () => {
      // First, get domains from user_brands table (the correct source)
      const { data: userBrandsRows } = await supabase
        .from('user_brands')
        .select('domain')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const domains = Array.from(new Set((userBrandsRows || []).map((r: { domain?: string }) => normalizeDomain(r?.domain || '')).filter(Boolean)));
      if (domains.length === 0) { 
        setUsedBrands([]); 
        setImagesByDomain({}); 
        setIsLoadingBrands(false);
        return; 
      }

      const { data: cacheRows } = await supabase
        .from('brand_cache')
        .select('domain, primary_color, link_color')
        .in('domain', domains);

      const brands = (cacheRows || []).map((r: { domain: string; primary_color?: string | null; link_color?: string | null }) => ({
        domain: r.domain,
        primary_color: r.primary_color ?? null,
        link_color: r.link_color ?? null,
      }));
      setUsedBrands(brands);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const imagesMap: Record<string, SavedImage[]> = {};
      for (const b of brands) {
        try {
          const resp = await fetch(`${API_ROOT}/images?domain=${encodeURIComponent(b.domain)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!resp.ok) continue;
          const json = await resp.json();
          imagesMap[b.domain] = json?.images || [];
        } catch { /* ignore */ }
      }
      setImagesByDomain(imagesMap);
      setIsLoadingBrands(false);
    })();
  }, [user]);

  const openBrandModal = (brand?: UsedBrand) => {
    if (!brand) return;
    setBrandDomain(brand.domain);
    setColor1(brand.primary_color || '#4f46e5');
    setColor2(brand.link_color || '#22d3ee');
    setShowBrandModal(true);
  };

  const closeBrandModal = () => setShowBrandModal(false);

  const saveBrandColors = async () => {
    const domain = normalizeDomain(brandDomain);
    if (!domain) return;
    try {
      const res = await fetch(`${API_ROOT}/brand/colors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, primary_color: color1, link_color: color2 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update brand colors');
      setUsedBrands(prev => prev.map(b => (b.domain === domain ? { ...b, primary_color: color1, link_color: color2 } : b)));
      closeBrandModal();
    } catch (e: unknown) {
      console.error(e);
    }
  };

  const planKey: 'FREE' | 'PAYG' | 'STARTER' | 'GROWTH' | 'SCALE' = useMemo(() => {
    const pid = sub?.price_id || '';
    if (pid.startsWith('manual:')) {
      const k = pid.split(':')[1]?.toUpperCase();
      if (k === 'STARTER' || k === 'GROWTH' || k === 'SCALE') return k;
    }
    const mapped = priceToPlanKey[pid];
    if (mapped) return mapped;
    if (!sub?.status || sub.status !== 'active') {
      if ((credits?.emails_remaining || 0) > 0 || (credits?.images_remaining || 0) > 0 || (credits?.revisions_remaining || 0) > 0) return 'PAYG';
    }
    return sub?.status === 'active' ? 'STARTER' : 'FREE';
  }, [sub?.price_id, sub?.status, credits?.emails_remaining, credits?.images_remaining, credits?.revisions_remaining]);

  const totals = quotasFor(planKey);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">Manage your profile, preferences, brands, and billing.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT COLUMN */}
            <div className="space-y-6 lg:col-span-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>Update your personal information and account details.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className={`h-4 w-4 ${isDark ? 'text-muted-foreground' : ''}`} />
                      <ThemeSwitch checked={isDark} onChange={setIsDark} />
                      <Moon className={`h-4 w-4 ${!isDark ? 'text-muted-foreground' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={emailField} disabled placeholder="you@example.com" />
                  </div>
                  <Button variant="outline" onClick={handleSaveProfile}>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Your current subscription and usage.</CardDescription>
                  {!sub && !currentPlan ? (
                    <div className="mt-2 inline-flex items-center gap-2">
                      <div className="h-6 w-24 animate-pulse rounded-md bg-muted"></div>
                    </div>
                  ) : currentPlan ? (
                      <div className="mt-2 inline-flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-gradient-to-r from-[#00ffc3] to-[#a3f2d9] px-2 py-2 text-xs font-semibold text-black shadow-sm">
                          <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          {PLANS.find(p => p.key === currentPlan)?.title || 'Unknown'}
                      </span></div>
                    ) : sub?.status === 'active' ? (
                      <div className="mt-2 inline-flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                          <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          Active
                      </span></div>
                    ) : null}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Bar label="Emails" remaining={credits?.emails_remaining ?? 0} total={totals.emails} />
                    <Bar label="Images" remaining={credits?.images_remaining ?? 0} total={totals.images} />
                    <Bar label="Revisions" remaining={credits?.revisions_remaining ?? 0} total={totals.revisions} />
                    <Bar label="Brands" total={totals.brands} remaining={(credits?.brand_limit ?? 0) - (brandCount ?? 0) >= 0 ? (credits?.brand_limit ?? 0) - (brandCount ?? 0) : 0} />
                  </div>
                  <div className="flex gap-3">
                    {sub?.status === 'active' ? (
                      <GradientButton variant="solid" onClick={openBillingPortal} className="!bg-primary !text-primary-foreground">Manage Plan</GradientButton>
                    ) : (
                      <GradientButton variant="solid" onClick={() => setShowPlanModal(true)} className="!bg-primary !text-primary-foreground">Choose Plan</GradientButton>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Button variant="outline" onClick={signOut} className="w-full"><LogOut className="h-4 w-4" />Log out</Button>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6 lg:col-span-8"><Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">Brands</CardTitle>
                  <CardDescription>Brands you’ve used appear here. Edit to tweak cached colors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingBrands ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[1, 2].map((i) => (
                        <Card key={i} className="overflow-hidden animate-pulse">
                          <div className="h-20 w-full bg-gray-200 dark:bg-gray-700"></div>
                          <CardContent className="space-y-3 pt-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                              </div>
                              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : usedBrands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-6 rounded-full bg-gradient-to-br from-[#00ffc3]/10 to-[#a3f2d9]/10 p-6">
                        <svg className="h-12 w-12 text-[#00ffc3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No brands yet</h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm">Generate your first email to automatically discover and save brand ideas from any website.</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => window.location.href = '/'}
                          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Start Creating
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {usedBrands.map((b) => {
                        const imgs = imagesByDomain[b.domain] || [];
                        return (
                          <Card key={b.domain} className="overflow-hidden">
                            <div
                              className="h-20 w-full"
                              style={{ backgroundImage: `linear-gradient(90deg, ${b.primary_color || '#4f46e5'}, ${b.link_color || '#22d3ee'})` }}
                            />
                            <CardContent className="space-y-3 pt-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{b.domain}</p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: b.primary_color || '#4f46e5' }} />
                                    <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: b.link_color || '#22d3ee' }} />
                                    <span className="text-xs text-muted-foreground">
                                      {(b.primary_color || '#4f46e5').toUpperCase()} → {(b.link_color || '#22d3ee').toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <Button variant="outline" size="icon" onClick={() => openBrandModal(b)} aria-label="Edit brand"><Pencil className="h-4 w-4" /></Button>
                              </div>
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Saved images</div>
                                {imgs.length === 0 ? (
                                  <div className="text-xs italic text-muted-foreground">None yet — generate or reuse a hero image to save it here.</div>
                                ) : (
                                  /* --- VERTICAL SCROLL: 2-column grid of image boxes (no URLs shown) --- */
                                  <div className="relative -mx-1"><div className="max-h-28 overflow-y-auto px-1"><div className="grid grid-cols-2 gap-3">
                                    {imgs.map((img) => (
                                      <div key={img.id} className="relative overflow-hidden rounded-lg border border-border">
                                        <button
                                          type="button" onClick={() => setPreviewUrl(img.public_url)}
                                          className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                          <div className="aspect-[4/3] w-full"><img
                                              src={img.public_url} alt="Saved" className="h-full w-full object-cover"
                                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                                          /></div>
                                        </button>
                                        {/* Copy button (doesn't trigger preview) */}
                                        <button
                                          type="button" onClick={(e) => { e.stopPropagation(); copy(img.public_url); }} aria-label="Copy image URL"
                                          className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 backdrop-blur text-foreground hover:bg-muted"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                      </button></div>
                                    ))}
                                  </div></div></div>
                                )}
                          </div></CardContent></Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Edit Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle>Edit Brand</CardTitle>
                  <CardDescription>Update cached colors for this domain.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={closeBrandModal} aria-label="Close"><X className="h-5 w-5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="brand-domain">Brand domain</Label>
                <Input id="brand-domain" value={brandDomain} onChange={(e) => setBrandDomain(e.target.value)} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="brand-primary">Primary</Label>
                  <input id="brand-primary" type="color" value={color1} onChange={(e) => setColor1(e.target.value)} className="h-10 w-full rounded-lg bg-background border-none cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="brand-link">Link</Label>
                  <input id="brand-link" type="color" value={color2} onChange={(e) => setColor2(e.target.value)} className="h-10 w-full rounded-lg bg-background border-none cursor-pointer" />
                </div>
              </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeBrandModal}>Cancel</Button>
                  <GradientButton variant="solid" onClick={saveBrandColors} disabled={!isBrandValid} className="!bg-primary !text-primary-foreground disabled:opacity-60 h-10 px-4 py-2">Save</GradientButton>
                </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan Picker Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><Card className="w-full max-w-5xl">
            <CardHeader className='space-y-0'>
              <div className="flex items-center justify-between">
                <CardTitle>Choose a Plan</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPlanModal(false)} aria-label="Close"><X className="h-5 w-5" /></Button>
              </div>
              <CardDescription>Select the plan that fits your workflow. You can change or cancel anytime.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {PLANS.map((p) => {
                  const disabled = !p.priceId;
                  const isCurrentPlan = currentPlan === p.key;
                  return (
                    <Card key={p.key} className={`flex flex-col ${isCurrentPlan ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {p.title}
                          {isCurrentPlan && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </CardTitle>
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
                          disabled={disabled || isCurrentPlan}
                          onClick={() => startCheckout(p.priceId || '')}
                          className="mt-auto !bg-primary !text-primary-foreground disabled:opacity-60"
                        >
                          {disabled ? 'Set Price ID in .env' : isCurrentPlan ? 'Current Plan' : 'Select'}
                        </GradientButton>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
        </Card></div>
      )}

      {/* Image Preview Modal */}
      <dialog 
        ref={dialogRef}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm border-0 max-w-none max-h-none w-full h-full p-0"
      >
        {previewUrl && (
          <>
            <button
              type="button"
              className="absolute inset-0 w-full h-full"
              onClick={() => setPreviewUrl(null)}
              aria-label="Close image preview"
            />
            <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
              <div className="relative w-full max-w-5xl max-h-[90vh]">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-[90vh] object-contain rounded-xl border border-border"
                />
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  aria-label="Close"
                  className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/90 text-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => copy(previewUrl)}
                  aria-label="Copy image URL"
                  className="absolute right-2 bottom-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/90 text-foreground hover:bg-muted"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </dialog>
    </>
  );
};

export default Dashboard;
