import React, { useEffect, useMemo, useState } from 'react';
import { motion, easeOut } from 'framer-motion';
import type { FormData } from '../EmailGenerator';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import Background from '../Background';
import { apiPath } from '@/lib/api';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

// Normalize domains to a comparable canonical form
function normalizeDomain(dom: string): string {
  let d = String(dom || '').trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');      // strip protocol
  d = d.replace(/^www\./, '');            // strip www
  d = d.replace(/\/.*$/, '');             // strip path
  d = d.replace(/\s+/g, '');              // strip internal spaces
  if (d.endsWith('.')) d = d.slice(0, -1);
  return d;
}

export const Step1Domain: React.FC<{
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
}> = ({ formData, updateFormData, onNext }) => {
  const { theme } = useTheme();
  const { user } = useSupabaseAuth();
  const isDark = theme === 'dark';
  const isAuthenticated = !!user;

  // 🎨 Glow Colors (4-color sweep)
  const glowColor1 = isDark ? '#8affa7ff' : '#00bcd4';
  const glowColor2 = isDark ? '#56adffff' : '#9c27b0';
  const glowColor3 = isDark ? '#4d32b1ff' : '#5cff3bff';
  const glowColor4 = isDark ? '#8affa7ff' : '#4caf50';

  const inputBg = isDark ? '#111111' : '#ffffff';
  const inputText = isDark ? 'text-white' : 'text-[#111111]';
  const placeholderText = isDark ? 'placeholder-white/50' : 'placeholder-black/40';

  const [domain, setDomain] = useState(formData.domain || '');
  const [isLoading, setIsLoading] = useState(false);

  // saved domains + dropdown state
  const [savedDomains, setSavedDomains] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // NEW: upgrade modal
  const [noBrandsOpen, setNoBrandsOpen] = useState(false);

  // -------- Saved brand domains (client-only; user_brands only; safe alphabetical order) --------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        // Read from user_brands only (brands table not present in your project)
        // Order safely by domain to avoid 400s from missing timestamp columns
        const { data, error } = await supabase
          .from('user_brands')
          .select('domain')
          .eq('user_id', userId)
          .order('domain', { ascending: true, nullsFirst: true })
          .limit(100);

        if (error) throw error;

        const unique = Array.from(
          new Set((data || []).map((r: { domain?: string }) => String(r.domain || '').trim()))
        ).filter(Boolean);

        if (!cancelled) setSavedDomains(unique);
      } catch {
        // ignore; suggestions are optional
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // helper: compute available brand slots
  async function getAvailableBrandSlots(): Promise<number> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return 0;

    // brand_limit
    const { data: bal } = await supabase
      .from('credit_balances')
      .select('brand_limit')
      .eq('user_id', userId)
      .maybeSingle();
    const limit = bal?.brand_limit ?? 0;

    // used count
    const { count } = await supabase
      .from('user_brands')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const used = count ?? 0;
    return Math.max(limit - used, 0);
  }

  // NEW: check if this domain is already owned by the user (user_brands only)
  async function domainOwnedByUser(dom: string): Promise<boolean> {
    const target = normalizeDomain(dom);
    if (!target) return false;

    // 1) Client-side quick check using savedDomains (already fetched)
    if (savedDomains.length) {
      const owned = savedDomains.some((d) => normalizeDomain(d) === target);
      if (owned) return true;
    }

    // 2) DB fallback: user_brands
    const { data: ub } = await supabase
      .from('user_brands')
      .select('domain')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .limit(200);

    if (Array.isArray(ub) && ub.some((r: { domain?: string }) => normalizeDomain(r.domain || '') === target)) {
      return true;
    }

    return false;
  }

  // Helper function to check brand slot availability
  const checkBrandSlotAvailability = async (alreadyOwned: boolean): Promise<boolean> => {
    if (alreadyOwned) return true;
    
    const available = await getAvailableBrandSlots();
    if (available <= 0) {
      setNoBrandsOpen(true);
      return false;
    }
    return true;
  };

  // Helper function to fetch brand data
  const fetchBrandData = async (domain: string) => {
    const brandRes = await fetch(apiPath('brand/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    if (!brandRes.ok) throw new Error('Failed to fetch brand');
    return brandRes.json();
  };

  // Helper function to fetch product data
  const fetchProductData = async (domain: string) => {
    const productRes = await fetch(apiPath('products/scrape'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    if (!productRes.ok) throw new Error('Failed to fetch products');
    return productRes.json();
  };

  // Helper function to claim brand
  const claimBrandIfNeeded = async (domain: string, alreadyOwned: boolean): Promise<boolean> => {
    if (alreadyOwned) return true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return true;

      const claimRes = await fetch(apiPath('credits/claim-brand'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain }),
      });

      if (claimRes.status === 402) {
        window.location.href = '/settings?plan=1';
        return false;
      } else if (claimRes.status === 409) {
        setNoBrandsOpen(true);
        return false;
      }
    } catch {
      // Non-fatal
    }
    return true;
  };

  const handleContinue = async () => {
    const trimmed = normalizeDomain(domain);
    if (!trimmed) return;
    setIsLoading(true);

    try {
      // For anonymous users, do brand scraping but skip user-specific operations
      if (!isAuthenticated) {
        console.log("🎯 [FREEMIUM] Fetching brand data for anonymous user...");
        
        const [brandData, productSuggestions] = await Promise.all([
          fetchBrandData(trimmed),
          fetchProductData(trimmed)
        ]);

        updateFormData({
          domain: trimmed,
          brandData,
          products: productSuggestions.products,
        });
        onNext();
        return;
      }

      // For authenticated users, do the full brand checking flow
      const alreadyOwned = await domainOwnedByUser(trimmed);
      
      const canProceed = await checkBrandSlotAvailability(alreadyOwned);
      if (!canProceed) return;

      const [brandData, productSuggestions] = await Promise.all([
        fetchBrandData(trimmed),
        fetchProductData(trimmed)
      ]);

      const claimSuccessful = await claimBrandIfNeeded(trimmed, alreadyOwned);
      if (!claimSuccessful) return;

      updateFormData({
        domain: trimmed,
        brandData,
        products: productSuggestions.products,
      });
      onNext();
    } catch (error) {
      console.error('Failed to fetch brand info:', error);
      updateFormData({ domain: trimmed });
      onNext();
    } finally {
      setIsLoading(false);
    }
  };

  const gradientBg = `linear-gradient(
    90deg,
    ${glowColor1} 0%,
    ${glowColor2} 25%,
    ${glowColor3} 50%,
    ${glowColor4} 75%,
    ${glowColor1} 100%,
    ${glowColor2},
    ${glowColor3},
    ${glowColor4},
    ${glowColor1}
  )`;

  const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.2 } } };
  const fadeInUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } } };

  const filteredSuggestions = useMemo(() => {
    if (!domain.trim()) return savedDomains;
    const q = normalizeDomain(domain);
    return savedDomains.filter((d) => normalizeDomain(d).includes(q));
  }, [domain, savedDomains]);

  return (
    <div className="fixed inset-0 z-0 bg-transparent">
      {/* Background blobs */}
      <Background variant="blobs" />

      <div className="relative z-10 h-screen flex items-center justify-center px-4 overflow-hidden">
        <motion.div className="text-center max-w-lg w-full" variants={containerVariants} initial="hidden" animate="show">
          <motion.div className="space-y-2" variants={fadeInUp}>
            <h1 className="text-4xl font-semibold text-foreground tracking-tight">Let's create amazing emails</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">Enter your website domain to get started</p>
          </motion.div>

          <motion.div className="relative w-full max-w-md mx-auto mt-10" variants={fadeInUp}>
            <div
              className="absolute inset-0 rounded-full p-[2px] blur-xl opacity-90 bg-repeat bg-[length:800%_100%] animate-gradient-sweep pointer-events-none"
              style={{ backgroundImage: gradientBg }}
            />
            <div
              className="relative z-10 flex items-center rounded-full ring-1 ring-white/20 pl-5 pr-2 py-2 shadow-xl transition"
              style={{ backgroundColor: inputBg }}
            >
              <input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                className={`bg-transparent text-base w-full focus:outline-none placeholder-opacity-50 ${inputText} ${placeholderText}`}
              />
              <button
                onClick={handleContinue}
                disabled={!domain.trim() || isLoading}
                className="ml-2 p-2 rounded-full bg-gradient-to-r from-[#00ffc3] to-[#a3f2d9] hover:scale-105 transition-transform disabled:opacity-50"
                aria-label="Continue to Step 2"
              >
                {isLoading ? <div className="loader" /> : <ArrowRight className="w-5 h-5 text-black" />}
              </button>
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                className={`absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-xl border shadow-xl ${
                  isDark ? 'bg-[#111111]/95 border-white/10' : 'bg-white/95 border-black/10'
                }`}
              >
                {filteredSuggestions.map((s, index) => (
                  <button
                    key={s}
                    type="button"
                    className={`w-full px-4 py-2 text-left cursor-pointer hover:bg-white/10 ${isDark ? 'text-white' : 'text-black'}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDomain(s);
                      setShowSuggestions(false);
                      handleContinue();
                    }}
                    aria-label={`Select domain ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Loading text positioned absolutely to prevent layout shift */}
            {isLoading && (
              <div className="absolute top-full left-0 right-0 mt-3">
                <p className="text-xs text-muted-foreground text-center">Fetching brand…</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Upgrade modal */}
      {noBrandsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-xl p-6">
            <h3 className="text-lg font-semibold">No more brand slots</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You’ve reached your plan’s brand limit. Upgrade your plan to add more brands.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn bg-secondary text-secondary-foreground" onClick={() => setNoBrandsOpen(false)}>Cancel</button>
              <button
                className="btn"
                onClick={() => { setNoBrandsOpen(false); window.location.href = '/settings?plan=1'; }}
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gradient-sweep {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .animate-gradient-sweep { animation: gradient-sweep 10s linear infinite; }
      `}</style>
    </div>
  );
};

export default Step1Domain;
