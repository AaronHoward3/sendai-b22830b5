import React, { useEffect, useMemo, useState } from 'react';
import { motion, easeOut } from 'framer-motion';
import { FormData } from '../EmailGenerator';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import Background from "../Background.tsx";
import { apiPath } from "@/lib/api";

const API_ROOT = '/api';

interface Step1DomainProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
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

  const [domain, setDomain] = useState(formData.domain);
  const [isLoading, setIsLoading] = useState(false);

  // ➜ added: saved domains + dropdown state
  const [savedDomains, setSavedDomains] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ➜ added: fetch saved domains (brands the user has saved)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        // Try primary table
        const tryBrands = async () => {
          const { data, error } = await supabase
            .from('brands')
            .select('domain')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(25);
          if (error) throw error;
          return data?.map((r: any) => r.domain).filter(Boolean) as string[];
        };

        // Fallback table name (if your schema differs)
        const tryUserBrands = async () => {
          const { data, error } = await supabase
            .from('user_brands')
            .select('domain')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(25);
          if (error) throw error;
          return data?.map((r: any) => r.domain).filter(Boolean) as string[];
        };

        let domains: string[] = [];
        try {
          domains = await tryBrands();
        } catch {
          try {
            domains = await tryUserBrands();
          } catch {
            domains = [];
          }
        }

        // Optional final fallback via API if you expose something like /api/brands/list
        if (!domains.length) {
          try {
            const res = await fetch(apiPath('brands/list'), { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
              const json = await res.json();
              const apiDomains = (json?.brands || []).map((b: any) => b.domain).filter(Boolean);
              domains = apiDomains;
            }
          } catch {
            /* ignore */
          }
        }

        // Deduplicate + normalize
        const unique = Array.from(new Set(domains.map((d) => String(d).trim()))).filter(Boolean);

        if (!cancelled) setSavedDomains(unique);
      } catch {
        /* non-fatal; suggestions just won't show */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleContinue = async () => {
    if (!domain.trim()) return;
    setIsLoading(true);

    try {
      // brand check (unchanged design, updated URL)
      const brandRes = await fetch(apiPath("brand/check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!brandRes.ok) throw new Error('Failed to fetch brand');
      const brandData = await brandRes.json();

      // product scrape (unchanged design, updated URL)
      const productRes = await fetch(`${API_ROOT}/products/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      if (!productRes.ok) throw new Error('Failed to fetch products');
      const productSuggestions = await productRes.json();

      // ➜ claim brand against user's limit (redirect on 402)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const claimRes = await fetch(`${API_ROOT}/credits/claim-brand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ domain: domain.trim() }),
          });
          if (claimRes.status === 402) {
            window.location.href = '/settings?plan=1';
            return;
          }
        }
      } catch {
        // non-fatal, keep going
      }

      updateFormData({
        domain: domain.trim(),
        brandData,
        products: productSuggestions.products,
      });

      onNext();
    } catch (error) {
      console.error('Failed to fetch brand info:', error);
      updateFormData({ domain: domain.trim() });
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

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.2 } },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
  };

  // ➜ added: filter suggestions as user types
  const filteredSuggestions = useMemo(() => {
    if (!domain.trim()) return savedDomains;
    const q = domain.trim().toLowerCase();
    return savedDomains.filter((d) => d.toLowerCase().includes(q));
  }, [domain, savedDomains]);

  return (
    <div className="fixed inset-0 overflow-hidden z-0 bg-transparent">
      {/* ✅ Hardcoded to blobs */}
      <Background variant="blobs" />

      <div className="relative z-10 h-screen flex items-center justify-center px-4">
        <motion.div
          className="text-center max-w-lg w-full"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div className="space-y-2" variants={fadeInUp}>
            <h1 className="text-4xl font-semibold text-foreground tracking-tight">
              Let's create amazing emails
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Enter your website domain to get started
            </p>
          </motion.div>

          <motion.div
            className="relative w-full max-w-md mx-auto mt-10"
            variants={fadeInUp}
          >
            {/* glow border */}
            <div
              className="absolute inset-0 rounded-full p-[2px] blur-xl opacity-90 bg-repeat bg-[length:800%_100%] animate-gradient-sweep pointer-events-none"
              style={{ backgroundImage: gradientBg }}
            />

            {/* input + button */}
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
                onFocus={() => setShowSuggestions(true)}        // ➜ added
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)} // ➜ added (delay to allow click)
                className={`bg-transparent text-base w-full focus:outline-none placeholder-opacity-50 ${inputText} ${placeholderText}`}
              />

              <button
                onClick={handleContinue}
                disabled={!domain.trim() || isLoading}
                className="ml-2 p-2 rounded-full bg-gradient-to-r from-[#00ffc3] to-[#a3f2d9] hover:scale-105 transition-transform disabled:opacity-50"
                aria-label="Continue to Step 2"
              >
                {isLoading ? (
                  <div className="loader" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-black" />
                )}
              </button>
            </div>

            {/* ➜ added: suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul
                className={`absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-xl border shadow-xl ${
                  isDark ? 'bg-[#111111]/95 border-white/10' : 'bg-white/95 border-black/10'
                }`}
              >
                {filteredSuggestions.map((s) => (
                  <li
                    key={s}
                    className={`px-4 py-2 text-left cursor-pointer hover:bg-white/10 ${
                      isDark ? 'text-white' : 'text-black'
                    }`}
                    // use mousedown so blur doesn't swallow the click
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDomain(s);
                      setShowSuggestions(false);
                      // auto-continue for convenience
                      handleContinue();
                    }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}

            {/* ➜ added: tiny status under the bar */}
            {isLoading && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Fetching brand…
              </p>
            )}
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @keyframes gradient-sweep {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .animate-gradient-sweep {
          animation: gradient-sweep 12s linear infinite;
        }
      `}</style>
    </div>
  );
};
