import React, { useEffect, useMemo, useState } from 'react';
import { motion, easeOut } from 'framer-motion';
import type { FormData } from '../EmailGenerator';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import Background from '../Background';
import { apiPath } from '@/lib/api';

const API_ROOT = '/api';

interface Step1DomainProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
}

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

export const Step1Domain: React.FC<Step1DomainProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  // fetch saved domains (brands the user has saved)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const tryBrands = async () => {
          const { data, error } = await supabase
            .from('brands')
            .select('domain')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data || []).map((r: any) => r.domain).filter(Boolean) as string[];
        };

        const tryUserBrands = async () => {
          const { data, error } = await supabase
            .from('user_brands')
            .select('domain')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data || []).map((r: any) => r.domain).filter(Boolean) as string[];
        };

        let domains: string[] = [];
        try { domains = await tryBrands(); } catch { 
          try { domains = await tryUserBrands(); } catch { domains = []; } 
        }

        if (!domains.length) {
          try {
            const res = await fetch(apiPath('brands/list'), { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
              const json = await res.json();
              const apiDomains = (json?.brands || []).map((b: any) => b.domain).filter(Boolean);
              domains = apiDomains;
            }
          } catch {
            // ignore
          }
        }

        // Keep raw domains; we'll normalize when comparing
        const unique = Array.from(new Set(domains.map((d) => String(d).trim()))).filter(Boolean);
        if (!cancelled) setSavedDomains(unique);
      } catch {
        // ignore
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

  // NEW: check if this domain is already owned by the user
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
      .limit(100);
    if (Array.isArray(ub) && ub.some((r: any) => normalizeDomain(r.domain) === target)) {
      return true;
    }

    // 3) DB fallback: brands (some projects store ownership here too)
    const { data: br } = await supabase
      .from('brands')
      .select('domain')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .limit(100);
    if (Array.isArray(br) && br.some((r: any) => normalizeDomain(r.domain) === target)) {
      return true;
    }

    return false;
  }

  const handleContinue = async () => {
    const trimmed = normalizeDomain(domain);
    if (!trimmed) return;
    setIsLoading(true);

    try {
      // ✅ If user already owns this domain, bypass slot check and skip claim
      const alreadyOwned = await domainOwnedByUser(trimmed);

      if (!alreadyOwned) {
        // ✅ pre-check brand availability to avoid 404 flows
        const available = await getAvailableBrandSlots();
        if (available <= 0) {
          setNoBrandsOpen(true);
          return;
        }
      }

      // brand info
      const brandRes = await fetch(apiPath('brand/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: trimmed }),
      });
      if (!brandRes.ok) throw new Error('Failed to fetch brand');
      const brandData = await brandRes.json();

      // product scrape
      const productRes = await fetch(`${API_ROOT}/products/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: trimmed }),
      });
      if (!productRes.ok) throw new Error('Failed to fetch products');
      const productSuggestions = await productRes.json();

      // claim brand (charge against limit) only if not already owned
      if (!alreadyOwned) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (token) {
            const claimRes = await fetch(`${API_ROOT}/credits/claim-brand`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ domain: trimmed }),
            });

            if (claimRes.status === 402) {
              window.location.href = '/settings?plan=1';
              return;
            } else if (claimRes.status === 409) {
              setNoBrandsOpen(true);
              return;
            }
          }
        } catch (err) {
          // Non-fatal
          console.warn('claim-brand check failed', err);
        }
      }

      // proceed
      updateFormData({
        domain: trimmed,
        brandData,
        products: productSuggestions.products,
      });
      onNext();
    } catch (error) {
      console.error('Failed to fetch brand info:', error);
      // still move on with domain captured so the user can continue
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
    <div className="fixed inset-0 overflow-hidden z-0 bg-transparent">
      {/* Hardcoded to blobs */}
      <Background variant="blobs" />

      <div className="relative z-10 h-screen flex items-center justify-center px-4">
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
              <ul
                className={`absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-xl border shadow-xl ${
                  isDark ? 'bg-[#111111]/95 border-white/10' : 'bg-white/95 border-black/10'
                }`}
              >
                {filteredSuggestions.map((s) => (
                  <li
                    key={s}
                    className={`px-4 py-2 text-left cursor-pointer hover:bg-white/10 ${isDark ? 'text-white' : 'text-black'}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDomain(s);
                      setShowSuggestions(false);
                      handleContinue();
                    }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}

            {isLoading && <p className="mt-3 text-xs text-muted-foreground text-center">Fetching brand…</p>}
          </motion.div>
        </motion.div>
      </div>

      {/* NEW: Upgrade modal */}
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
