// src/components/steps/Step2EmailType.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Pencil, Save, X, Check, Sparkles, RotateCcw } from 'lucide-react';
import { motion, easeOut } from 'framer-motion';

import { GradientButton } from '../ui/gradient-button';
import { GradientInput } from '../ui/gradient-input';
import BrandColorControls from '../BrandColorControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

import {
  EmailType,
  FormData,
  Tone,
  ProductLink,
  DesignAesthetic,
} from '../EmailGenerator';

import { supabase } from '@/lib/supabaseClient';

const API_ROOT = '/api';

interface Step2EmailTypeProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type SavedImage = {
  id: string;
  public_url: string;
  path: string;
  created_at: string;
  width?: number | null;
  height?: number | null;
};

const EMAIL_TYPES: { value: EmailType; label: string; description: string }[] = [
  { value: 'Promotion',   label: 'Promotional',       description: 'Sales and special offers' },
  { value: 'Productgrid', label: 'Product Catalogue', description: 'Featured products showcase' },
  { value: 'Newsletter',  label: 'Newsletter',        description: 'Regular updates and news' },
];

const TONES: { value: Tone; label: string }[] = [
  { value: 'bold',     label: 'Bold' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal',   label: 'Formal' },
  { value: 'fun',      label: 'Fun' },
];

const DESIGN_STYLES: { value: DesignAesthetic; label: string; blurb?: string }[] = [
  { value: 'minimal_clean',    label: 'Minimal & Clean',    blurb: 'Whitespace, simple typography' },
  { value: 'bold_contrasting', label: 'Bold & Contrasting', blurb: 'High contrast, punchy CTAs' },
  { value: 'magazine_serif',   label: 'Elegant Serif',      blurb: 'Editorial, premium feel' },
  { value: 'warm_editorial',   label: 'Warm Editorial',     blurb: 'Serif headlines, paper texture' },
  { value: 'neo_brutalist',    label: 'Neo Brutalist',      blurb: 'Chunky type, stark blocks' },
  { value: 'gradient_glow',    label: 'Gradient Glow',      blurb: 'Dark canvas, glowing gradients' },
  { value: 'pastel_soft',      label: 'Pastel Soft',        blurb: 'Soft colors, friendly shapes' },
  { value: 'luxe_mono',        label: 'Luxe Mono',          blurb: 'Monochrome, refined' },
];

function normalizeDomain(input: string) {
  return String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

/* ---------- Occasion helpers (US + retail/corporate) ---------- */

function nthWeekdayOfMonth(year: number, monthIdx: number, weekday: number, n: number) {
  const d = new Date(year, monthIdx, 1);
  const add = (7 + weekday - d.getDay()) % 7;
  d.setDate(1 + add + 7 * (n - 1));
  return d;
}
function lastWeekdayOfMonth(year: number, monthIdx: number, weekday: number) {
  const d = new Date(year, monthIdx + 1, 0);
  const sub = (7 + (d.getDay() - weekday)) % 7;
  d.setDate(d.getDate() - sub);
  return d;
}
function computeEaster(year: number) {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

type Occasion = {
  key: string;
  label: string;
  date: Date;
  short?: string;
  imageryHints?: string[];
  defaultCTA?: string;
};

function getOccasionsForYear(year: number): Occasion[] {
  const easter = computeEaster(year);
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4); // Nov, Thu, 4th
  const blackFriday = new Date(thanksgiving); blackFriday.setDate(blackFriday.getDate() + 1);
  const smallBizSat = new Date(thanksgiving); smallBizSat.setDate(smallBizSat.getDate() + 2);
  const cyberMonday = new Date(thanksgiving); cyberMonday.setDate(cyberMonday.getDate() + 4);

  const memorialDay = lastWeekdayOfMonth(year, 4, 1);   // May, Mon
  const laborDay = nthWeekdayOfMonth(year, 8, 1, 1);    // Sep, Mon, 1st
  const mlk = nthWeekdayOfMonth(year, 0, 1, 3);         // Jan, Mon, 3rd
  const presidents = nthWeekdayOfMonth(year, 1, 1, 3);  // Feb, Mon, 3rd
  const mothers = nthWeekdayOfMonth(year, 4, 0, 2);     // May, Sun, 2nd
  const fathers = nthWeekdayOfMonth(year, 5, 0, 3);     // Jun, Sun, 3rd
  const indigenous = nthWeekdayOfMonth(year, 9, 1, 2);  // Oct, Mon, 2nd

  // “Ranges” represented by start-of-range anchor
  const backToSchool = new Date(year, 7, 1); // Aug 1
  const backToSchoolEnd = new Date(year, 8, 10); // Sep 10

  return [
    { key: 'new_year', label: 'New Year', date: new Date(year, 0, 1), short: 'New Year', imageryHints: ['confetti', 'sparklers', 'clean minimal “fresh start”'], defaultCTA: 'Shop New Arrivals' },
    { key: 'mlk', label: "MLK Day", date: mlk, short: 'MLK Day', imageryHints: ['abstract equality motif', 'subtle doves'], defaultCTA: 'Learn More' },
    { key: 'valentines', label: 'Valentine’s Day', date: new Date(year, 1, 14), short: 'Valentine’s', imageryHints: ['hearts', 'soft gradients'], defaultCTA: 'Find a Gift' },
    { key: 'presidents', label: 'Presidents’ Day', date: presidents, short: 'Presidents’ Day', imageryHints: ['subtle stars/stripes accents'], defaultCTA: 'Save Today' },
    { key: 'stpats', label: "St. Patrick’s Day", date: new Date(year, 2, 17), short: 'St. Patrick’s', imageryHints: ['greens', 'clover textures'], defaultCTA: 'Shop the Drop' },
    { key: 'easter', label: 'Easter', date: easter, short: 'Easter', imageryHints: ['pastels', 'spring florals'], defaultCTA: 'Celebrate Spring' },
    { key: 'mothers', label: "Mother’s Day", date: mothers, short: 'Mother’s Day', imageryHints: ['soft florals', 'warm light'], defaultCTA: 'Gift Mom' },
    { key: 'memorial', label: 'Memorial Day', date: memorialDay, short: 'Memorial Day', imageryHints: ['early summer vibes'], defaultCTA: 'Kick Off Summer' },
    { key: 'fathers', label: "Father’s Day", date: fathers, short: 'Father’s Day', imageryHints: ['bold textures'], defaultCTA: 'Gift Dad' },
    { key: 'independence', label: 'Independence Day', date: new Date(year, 6, 4), short: '4th of July', imageryHints: ['subtle red/white/blue accents'], defaultCTA: 'Summer Deals' },
    { key: 'back_to_school', label: 'Back to School', date: backToSchool, short: 'Back to School', imageryHints: ['notebook textures', 'chalk accents'], defaultCTA: 'Get Ready' },
    { key: 'labor', label: 'Labor Day', date: laborDay, short: 'Labor Day', imageryHints: ['late-summer palette'], defaultCTA: 'Long Weekend Deals' },
    { key: 'indigenous', label: 'Indigenous Peoples’ Day', date: indigenous, short: 'Indigenous Peoples’ Day', imageryHints: ['earthy tones'], defaultCTA: 'Learn More' },
    { key: 'halloween', label: 'Halloween', date: new Date(year, 9, 31), short: 'Halloween', imageryHints: ['subtle spooky glow'], defaultCTA: 'Spooky Picks' },
    { key: 'veterans', label: 'Veterans Day', date: new Date(year, 10, 11), short: 'Veterans Day', imageryHints: ['patriotic minimal'], defaultCTA: 'Thank You' },
    { key: 'thanksgiving', label: 'Thanksgiving', date: thanksgiving, short: 'Thanksgiving', imageryHints: ['warm fall palette'], defaultCTA: 'Grateful Picks' },
    { key: 'black_friday', label: 'Black Friday', date: blackFriday, short: 'Black Friday', imageryHints: ['high contrast', 'bold graphics'], defaultCTA: 'Shop Doorbusters' },
    { key: 'small_biz_sat', label: 'Small Business Saturday', date: smallBizSat, short: 'Small Biz Saturday', imageryHints: ['neighborhood vibe'], defaultCTA: 'Support Local' },
    { key: 'cyber_monday', label: 'Cyber Monday', date: cyberMonday, short: 'Cyber Monday', imageryHints: ['neon glow', 'tech lines'], defaultCTA: 'Online Only' },
    { key: 'christmas', label: 'Christmas', date: new Date(year, 11, 25), short: 'Holiday', imageryHints: ['cozy lights', 'evergreen'], defaultCTA: 'Holiday Shop' },
    { key: 'eoy', label: 'Year-End / Q4 Close', date: new Date(year, 11, 31), short: 'Year-End', imageryHints: ['gold accents', 'confetti'], defaultCTA: 'Final Deals' },
    { key: 'q1_end', label: 'End of Q1', date: new Date(year, 2, 31), short: 'Q1 Close', imageryHints: ['clean progress motif'], defaultCTA: 'Quarter-End Offers' },
    { key: 'q2_end', label: 'End of Q2', date: new Date(year, 5, 30), short: 'Q2 Close', imageryHints: ['mid-year refresh'], defaultCTA: 'Mid-Year Offers' },
    { key: 'q3_end', label: 'End of Q3', date: new Date(year, 8, 30), short: 'Q3 Close', imageryHints: ['early fall vibe'], defaultCTA: 'Quarter-End Offers' },
    // Back-to-school “range”: if we’re between Aug 1–Sep 10, keep it sticky/active with a near “now” date
    ...(new Array(0)), // placeholder for readability
  ];
}

function nearestOccasion(now = new Date()): Occasion {
  const year = now.getFullYear();
  const list = [...getOccasionsForYear(year), ...getOccasionsForYear(year + 1)];
  // Make Back-to-School sticky if within window
  const btsStart = new Date(year, 7, 1);
  const btsEnd = new Date(year, 8, 10);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const withinBTS = today >= btsStart && today <= btsEnd;
  const augmented = withinBTS
    ? [{ key: 'back_to_school', label: 'Back to School', date: today, short: 'Back to School', imageryHints: ['notebook textures', 'chalk accents'], defaultCTA: 'Get Ready' }, ...list]
    : list;

  // Pick the earliest on/after today
  const upcoming = augmented
    .filter(o => o.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcoming[0] || augmented[0];
}

/* ---------- Context builders ---------- */

function truncate(s: string, n = 180) {
  if (!s) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function buildUserContext(opts: {
  occasion: Occasion;
  brandName: string;
  brandDesc?: string;
  emailType: EmailType | null;
  tone: Tone;
}) {
  const { occasion, brandName, brandDesc, emailType, tone } = opts;
  const goalsByType: Record<string, string> = {
    Promotion: 'announce a timely offer and drive immediate clicks',
    Productgrid: 'showcase a tight selection of best-fit products',
    Newsletter: 'share timely updates with light merchandising',
  };
  const goal = goalsByType[emailType || 'Promotion'] || goalsByType.Promotion;
  const desc = brandDesc ? ` ${truncate(brandDesc, 220)}` : '';

  // small variety
  const openers = [
    `Plan a ${occasion.label} campaign for ${brandName}.`,
    `Create a ${occasion.short || occasion.label} email for ${brandName}.`,
    `Draft a ${occasion.label.toLowerCase()} themed email for ${brandName}.`,
  ];
  const opener = openers[Math.floor(Math.random() * openers.length)];

  return `${opener}${desc ? ` Brand snapshot:${desc}` : ''} Goal: ${goal}. Include: 1) punchy hook tied to ${occasion.short || occasion.label}, 2) concise value props, 3) ${occasion.defaultCTA || 'Shop Now'} CTA. Keep tone ${tone}. Keep copy skimmable (short sentences, scannable subheads).`;
}

function buildImageContext(opts: {
  occasion: Occasion;
  brandName: string;
  design: DesignAesthetic;
  brandPrimary?: string;
  brandLink?: string;
}) {
  const { occasion, brandName, design, brandPrimary, brandLink } = opts;
  const palette = [brandPrimary, brandLink].filter(Boolean).join(' & ');
  const hints = occasion.imageryHints?.slice(0, 2).join(', ');
  const style = String(design).replace(/_/g, ' ');

  return `Hero image for ${brandName} — ${occasion.short || occasion.label} theme. Style: ${style}. Visual hints: ${hints || 'seasonal accents'}. Clean composition, product-agnostic, no text, brand-aligned accents${palette ? ` (${palette})` : ''}. Portrait orientation.`;
}

/* ----------------- Component ----------------- */

export const Step2EmailType: React.FC<Step2EmailTypeProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrev,
}) => {
  const [selectedEmailType, setSelectedEmailType] = useState<EmailType | null>(formData.emailType);
  const [useCustomHero, setUseCustomHero] = useState<boolean>(formData.useCustomHero ?? true);
  const [userContext, setUserContext] = useState<string>(formData.userContext ?? '');
  const [imageContext, setImageContext] = useState<string>(formData.imageContext ?? '');
  const [tone, setTone] = useState<Tone>(formData.tone ?? 'bold');
  const [designAesthetic, setDesignAesthetic] =
    useState<DesignAesthetic>(formData.designAesthetic ?? 'bold_contrasting');

  const [products, setProducts] = useState<ProductLink[]>(
    Array.isArray(formData.products) ? formData.products : []
  );
  const [showProductForm, setShowProductForm] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductUrl, setNewProductUrl] = useState<string>('');
  const [newProductImage, setNewProductImage] = useState<string>('');

  // Inline edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editUrl, setEditUrl] = useState<string>('');
  const [editImage, setEditImage] = useState<string>('');

  // From Step 1 brand payload
  const scrapedPrimary = formData?.brandData?.brandData?.primary_color || '';
  const scrapedSecondary = formData?.brandData?.brandData?.link_color || '';
  const brandName =
    formData?.brandData?.brandData?.name ||
    formData?.brandData?.name ||
    normalizeDomain(formData.domain || 'your brand');
  const brandDesc =
    formData?.brandData?.brandData?.description ||
    formData?.brandData?.description ||
    formData?.brandData?.brandData?.tagline ||
    '';
  const brandPrimary = scrapedPrimary || formData?.brandData?.primary_color;
  const brandLink = scrapedSecondary || formData?.brandData?.link_color;

  const handleColorsChange = (colors: { primary_color: string; link_color: string }) => {
    const existing = formData.brandData || {};
    const updated = {
      ...existing,
      brandData: {
        ...(existing.brandData || {}),
        primary_color: colors.primary_color,
        link_color: colors.link_color,
      },
      primary_color: colors.primary_color,
      link_color: colors.link_color,
    };
    updateFormData({ brandData: updated });
  };

  const selectedStyleLabel = useMemo(
    () => DESIGN_STYLES.find(s => s.value === designAesthetic)?.label ?? 'Select style…',
    [designAesthetic]
  );

  // Saved images for this brand
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [selectedSavedUrl, setSelectedSavedUrl] = useState<string | null>((formData as any).savedHeroImageUrl || null);

  useEffect(() => {
    const domain = normalizeDomain(formData.domain || '');
    if (!domain) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`${API_ROOT}/images?domain=${encodeURIComponent(domain)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          setSavedImages(json?.images || []);
        }
      } catch {
        // ignore
      }
    })();
  }, [formData.domain]);

  /* ---------- Auto-suggest contexts on entry ---------- */
  const generateContexts = React.useCallback(() => {
    const occ = nearestOccasion(new Date());
    const uc = buildUserContext({
      occasion: occ,
      brandName,
      brandDesc,
      emailType: selectedEmailType,
      tone,
    });
    const ic = buildImageContext({
      occasion: occ,
      brandName,
      design: designAesthetic,
      brandPrimary,
      brandLink,
    });
    return { uc, ic, occ };
  }, [brandName, brandDesc, selectedEmailType, tone, designAesthetic, brandPrimary, brandLink]);

  useEffect(() => {
    // Prefill only if empty so we never overwrite user text when returning to Step 2
    if (!userContext?.trim() || !imageContext?.trim()) {
      const { uc, ic } = generateContexts();
      if (!userContext?.trim()) setUserContext(uc);
      if (!imageContext?.trim()) setImageContext(ic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductUrl.trim()) return;
    const newProduct: ProductLink = {
      name: newProductName.trim(),
      url: newProductUrl.trim(),
      image: newProductImage.trim() || undefined,
    };
    const exists = products.some(p => p.name === newProduct.name || p.url === newProduct.url);
    if (!exists) {
      setProducts(prev => [...prev, newProduct]);
      setNewProductName('');
      setNewProductUrl('');
      setNewProductImage('');
      setShowProductForm(false);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const startEdit = (index: number) => {
    const p = products[index];
    setEditingIndex(index);
    setEditName(p.name || '');
    setEditUrl(p.url || '');
    setEditImage(p.image || '');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditName('');
    setEditUrl('');
    setEditImage('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...products];
    updated[editingIndex] = {
      ...updated[editingIndex],
      name: editName.trim(),
      url: editUrl.trim(),
      image: editImage.trim() || undefined,
    };
    setProducts(updated);
    cancelEdit();
  };

  const handleContinue = () => {
    if (!selectedEmailType) return;
    updateFormData({
      emailType: selectedEmailType,
      useCustomHero,
      userContext,
      imageContext,
      tone,
      designAesthetic,
      products,
      ...(useCustomHero ? { savedHeroImageUrl: null as any } : {}),
      ...(!useCustomHero && selectedSavedUrl ? ({ savedHeroImageUrl: selectedSavedUrl } as any) : {}),
    });
    onNext();
  };

  // Unselected segmented buttons look
  const unselectedSegBtn =
    '!bg-background !text-foreground !border !border-border hover:!bg-muted';

  // ===== Animations (quicker than Step 1) =====
  const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const fadeInUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } } };

  // Textarea class
  const plainTextarea =
    'w-full min-h-[128px] rounded-xl border !border-border !bg-background !text-foreground ' +
    'placeholder:text-muted-foreground px-4 py-3 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
    'focus-visible:ring-offset-2 !ring-offset-background';

  return (
    <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="show">
      <motion.div className="text-center space-y-4" variants={fadeInUp}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Configure your email</h1>
        <p className="text-lg text-muted-foreground">
          Choose your type, tone, and style — text inputs stay inline.
        </p>
      </motion.div>

      {/* Email Type */}
      <motion.div className="space-y-3" variants={fadeInUp}>
        <label className="text-lg font-medium text-foreground">Email Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {EMAIL_TYPES.map(t => {
            const active = selectedEmailType === t.value;
            return (
              <GradientButton
                key={t.value}
                type="button"
                variant={active ? 'solid' : 'white-outline'}
                onClick={() => setSelectedEmailType(t.value)}
                title={t.description}
                aria-pressed={active}
                className={`w-full px-4 py-2 rounded-xl transition ${active ? '' : unselectedSegBtn}`}
              >
                {t.label}
              </GradientButton>
            );
          })}
        </div>
      </motion.div>

      {/* Tone */}
      <motion.div className="space-y-3" variants={fadeInUp}>
        <label className="text-lg font-medium text-foreground">Tone</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {TONES.map(tn => {
            const active = tone === tn.value;
            return (
              <GradientButton
                key={tn.value}
                type="button"
                variant={active ? 'solid' : 'white-outline'}
                onClick={() => setTone(tn.value)}
                aria-pressed={active}
                className={`w-full px-4 py-2 rounded-xl transition ${active ? '' : unselectedSegBtn}`}
              >
                {tn.label}
              </GradientButton>
            );
          })}
        </div>
      </motion.div>

      {/* Design Style */}
      <motion.div className="space-y-2" variants={fadeInUp}>
        <label className="text-lg font-medium text-foreground">Design Style</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <GradientButton variant="white-outline" className="w-full justify-between !bg-background !text-foreground !border !border-border hover:!bg-muted">
              <span>{selectedStyleLabel}</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </GradientButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[520px] max-h-[360px] overflow-auto p-2">
            <div className="grid grid-cols-2 gap-2">
              {DESIGN_STYLES.map(s => (
                <DropdownMenuItem key={s.value} onClick={() => setDesignAesthetic(s.value)} className="flex flex-col items-start gap-0.5 py-3">
                  <span className="font-medium">{s.label}</span>
                  {s.blurb && <span className="text-xs text-muted-foreground">{s.blurb}</span>}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Brand Colors */}
      {formData.brandData && (
        <motion.div className="space-y-2" variants={fadeInUp}>
          <label className="text-lg font-medium text-foreground">Brand Colors</label>
          <BrandColorControls
            scrapedPrimary={scrapedPrimary}
            scrapedSecondary={scrapedSecondary}
            brandDomain={formData.domain}
            onChange={handleColorsChange}
          />
        </motion.div>
      )}

      {/* Use Custom Hero */}
      <motion.div className="space-y-2" variants={fadeInUp}>
        <label className="text-lg font-medium text-foreground">Use Custom Hero Image?</label>
        <div className="flex gap-3">
          <GradientButton
            variant={useCustomHero ? 'solid' : 'white-outline'}
            onClick={() => { setUseCustomHero(true); setSelectedSavedUrl(null); }}
            className={`flex-1 ${useCustomHero ? '' : unselectedSegBtn}`}
          >
            Yes
          </GradientButton>
          <GradientButton
            variant={!useCustomHero ? 'solid' : 'white-outline'}
            onClick={() => setUseCustomHero(false)}
            className={`flex-1 ${!useCustomHero ? '' : unselectedSegBtn}`}
          >
            No
          </GradientButton>
        </div>
      </motion.div>

      {/* Saved images appear ONLY when NOT using custom hero */}
      {!useCustomHero && (
        <motion.div className="space-y-3" variants={fadeInUp}>
          <label className="text-lg font-medium text-foreground">Use a saved hero image (optional)</label>
          {savedImages.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No saved images yet for <span className="underline">{normalizeDomain(formData.domain || '')}</span>.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {savedImages.map((img) => {
                  const active = selectedSavedUrl === img.public_url;
                  return (
                    <button
                      type="button"
                      key={img.id}
                      onClick={() => setSelectedSavedUrl(active ? null : img.public_url)}
                      className={`relative rounded-lg border transition overflow-hidden ${active ? 'border-primary ring-2 ring-primary' : 'border-border hover:bg-muted/40'}`}
                      title={img.public_url}
                    >
                      <img
                        src={img.public_url}
                        alt="Saved"
                        className="w-full h-28 object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                      />
                      {active && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[11px] rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Selected
                        </div>
                      )}
                      <div className="text-[11px] px-2 py-1 text-muted-foreground break-all bg-background/80">
                        {img.public_url}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <GradientButton
                  variant="solid"
                  className="disabled:opacity-60"
                  onClick={() => selectedSavedUrl && setSelectedSavedUrl(selectedSavedUrl)}
                  disabled={!selectedSavedUrl}
                >
                  Use selected image
                </GradientButton>
                {selectedSavedUrl && (
                  <GradientButton
                    variant="white-outline"
                    onClick={() => setSelectedSavedUrl(null)}
                    className="!bg-background !text-foreground !border !border-border hover:!bg-muted"
                  >
                    Clear selection
                  </GradientButton>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Image Context only when using custom hero */}
      {useCustomHero && (
        <motion.div className="space-y-2" variants={fadeInUp}>
          <div className="flex items-center justify-between">
            <label className="text-lg font-medium text-foreground">Image Context</label>
            <div className="flex gap-2">
              <GradientButton
                variant="white-outline"
                onClick={() => {
                  const { ic } = generateContexts();
                  setImageContext(ic);
                }}
                className="!bg-background !text-foreground !border !border-border hover:!bg-muted px-3 py-1.5 text-sm"
                title="Regenerate Image Context"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Regenerate
              </GradientButton>
            </div>
          </div>
          <textarea
            placeholder="Describe the type of imagery..."
            value={imageContext}
            onChange={(e) => setImageContext(e.target.value)}
            rows={4}
            className={plainTextarea}
          />
        </motion.div>
      )}

      {/* User Context */}
      <motion.div className="space-y-2" variants={fadeInUp}>
        <div className="flex items-center justify-between">
          <label className="text-lg font-medium text-foreground">User Context</label>
          <div className="flex gap-2">
            <GradientButton
              variant="white-outline"
              onClick={() => {
                const { uc } = generateContexts();
                setUserContext(uc);
              }}
              className="!bg-background !text-foreground !border !border-border hover:!bg-muted px-3 py-1.5 text-sm"
              title="Regenerate User Context"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" /> Regenerate
            </GradientButton>
          </div>
        </div>
        <textarea
          placeholder="Tell us abut what you want to convey"
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          rows={4}
          className={plainTextarea}
        />
      </motion.div>

      {/* Products (unchanged) */}
      <motion.div className="space-y-4" variants={fadeInUp}>
        <label className="text-lg font-medium text-foreground">Products</label>
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No products added yet.</p>
        )}
        {products.map((product, index) => {
          const isEditing = editingIndex === index;

          return (
            <div key={index} className="space-y-2 rounded-lg border border-border p-4">
              {!isEditing ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name || 'Product image'}
                        className="w-12 h-12 rounded-md object-cover border border-border"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-md border border-dashed border-border grid place-items-center text-xs text-muted-foreground">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{product.name}</div>
                      <a href={product.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground underline underline-offset-2 break-all">
                        {product.url}
                      </a>
                      {product.image && (
                        <div className="text-xs text-muted-foreground mt-0.5 break-all">Image: {product.image}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <GradientButton
                      variant="white-outline"
                      onClick={() => startEdit(index)}
                      className="px-3 py-2 !bg-background !text-foreground !border !border-border hover:!bg-muted"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </GradientButton>
                    <GradientButton
                      variant="white-outline"
                      onClick={() => handleRemoveProduct(index)}
                      className="px-3 py-2 !bg-background !text-foreground !border !border-border hover:!bg-muted"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </GradientButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <GradientInput placeholder="Product name..." value={editName} onChange={(e) => setEditName(e.target.value)} className="!bg-background !text-foreground !border !border-input placeholder:!text-muted-foreground" />
                    <GradientInput placeholder="Product URL (https://...)" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="!bg-background !text-foreground !border !border-input placeholder:!text-muted-foreground" />
                    <GradientInput placeholder="Image URL (optional)" value={editImage} onChange={(e) => setEditImage(e.target.value)} className="!bg-background !text-foreground !border !border-input placeholder:!text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3">
                    {editImage ? (
                      <img src={editImage} alt="Preview" className="w-12 h-12 rounded-md object-cover border border-border" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-12 h-12 rounded-md border border-dashed border-border grid place-items-center text-xs text-muted-foreground">N/A</div>
                    )}
                    <div className="text-sm text-muted-foreground">Preview</div>
                  </div>
                  <div className="flex gap-2">
                    <GradientButton variant="solid" onClick={saveEdit} className="px-4" disabled={!editName.trim() || !editUrl.trim()}>
                      <Save className="w-4 h-4 mr-2" /> Save
                    </GradientButton>
                    <GradientButton variant="white-outline" onClick={cancelEdit} className="px-4 !bg-background !text-foreground !border !border-border hover:!bg-muted">
                      Cancel
                    </GradientButton>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!showProductForm && (
          <GradientButton onClick={() => setShowProductForm(true)} variant="white-outline" className="!bg-background !text-foreground !border !border-border hover:!bg-muted">
            Add Product
          </GradientButton>
        )}

        {showProductForm && (
          <div className="space-y-2 p-4 border border-border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <GradientInput placeholder="Product name..." value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="!bg-background !text-foreground !border !border-input placeholder:!text-muted-foreground" />
              <GradientInput placeholder="Product URL (https://...)" value={newProductUrl} onChange={(e) => setNewProductUrl(e.target.value)} className="!bg-background !text-foreground !border !border-input placeholder:!text-muted-foreground" />
              <GradientInput placeholder="Image URL (optional)" value={newProductImage} onChange={(e) => setNewProductImage(e.target.value)} className="!bg-background !text-foreground !border !border-input placeholder:!text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <GradientButton variant="solid" onClick={handleAddProduct} disabled={!newProductName || !newProductUrl} className="disabled:opacity-60">Add Product</GradientButton>
              <GradientButton variant="white-outline" onClick={() => { setShowProductForm(false); setNewProductName(''); setNewProductUrl(''); setNewProductImage(''); }} className="!bg-background !text-foreground !border !border-border hover:!bg-muted">Cancel</GradientButton>
            </div>
          </div>
        )}
      </motion.div>

      {/* Nav */}
      <motion.div className="flex justify-between pt-6" variants={fadeInUp}>
        <GradientButton variant="white-outline" onClick={onPrev} className="!bg-background !text-foreground !border !border-border hover:!bg-muted">
          Back
        </GradientButton>
        <GradientButton variant="solid" onClick={handleContinue} disabled={!selectedEmailType} className="disabled:opacity-60">
          Generate Email
        </GradientButton>
      </motion.div>
    </motion.div>
  );
};
