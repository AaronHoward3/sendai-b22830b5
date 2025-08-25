import React, { useState } from 'react';
import { motion, easeOut } from 'framer-motion';
import { FormData } from '../EmailGenerator';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient'; // ➜ added
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

      // ➜ added: claim brand against user's limit (redirect on 402)
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
            <div
              className="absolute inset-0 rounded-full p-[2px] blur-xl opacity-90 bg-repeat bg-[length:800%_100%] animate-gradient-sweep"
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
                className={`bg-transparent text-base w-full focus:outline-none placeholder-opacity-50 ${inputText} ${placeholderText}`}
              />

              <button
                onClick={handleContinue}
                disabled={!domain.trim() || isLoading}
                className="ml-2 p-2 rounded-full bg-gradient-to-r from-[#00ffc3] to-[#a3f2d9] hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="loader"></div>
                ) : (
                  <ArrowRight className="w-5 h-5 text-black" />
                )}
              </button>
            </div>
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
