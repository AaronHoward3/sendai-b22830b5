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

/* ---------- Occasion helpers (US holidays only) ---------- */

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
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

type Occasion = {
  key: string;
  label: string;
  date: Date;
  short?: string;
  defaultCTA?: string;
};

function getOccasionsForYear(year: number): Occasion[] {
  const easter = computeEaster(year);
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4); // Nov, Thu (4th)
  const blackFriday = new Date(thanksgiving); blackFriday.setDate(blackFriday.getDate() + 1);
  const cyberMonday = new Date(thanksgiving); cyberMonday.setDate(cyberMonday.getDate() + 4);
  const memorialDay = lastWeekdayOfMonth(year, 4, 1);     // May, Mon
  const laborDay = nthWeekdayOfMonth(year, 8, 1, 1);      // Sep, Mon (1st)
  const mlk = nthWeekdayOfMonth(year, 0, 1, 3);           // Jan, Mon (3rd)
  const presidents = nthWeekdayOfMonth(year, 1, 1, 3);    // Feb, Mon (3rd)
  const mothers = nthWeekdayOfMonth(year, 4, 0, 2);       // May, Sun (2nd)
  const fathers = nthWeekdayOfMonth(year, 5, 0, 3);       // Jun, Sun (3rd)

  return [
    { key: 'new_year',      label: 'New Year',          date: new Date(year, 0, 1),  short: 'New Year',        defaultCTA: 'Shop Now' },
    { key: 'mlk',           label: 'MLK Day',           date: mlk,                   short: 'MLK Day',         defaultCTA: 'Learn More' },
    { key: 'valentines',    label: 'Valentine’s Day',   date: new Date(year, 1, 14), short: 'Valentine’s',     defaultCTA: 'Find a Gift' },
    { key: 'presidents',    label: 'Presidents’ Day',   date: presidents,            short: 'Presidents’ Day', defaultCTA: 'Save Today' },
    { key: 'stpats',        label: 'St. Patrick’s Day', date: new Date(year, 2, 17), short: 'St. Patrick’s',   defaultCTA: 'Shop Now' },
    { key: 'easter',        label: 'Easter',            date: easter,                short: 'Easter',          defaultCTA: 'Celebrate' },
    { key: 'mothers',       label: 'Mother’s Day',      date: mothers,               short: 'Mother’s Day',    defaultCTA: 'Shop Gifts' },
    { key: 'memorial',      label: 'Memorial Day',      date: memorialDay,           short: 'Memorial Day',    defaultCTA: 'Shop Deals' },
    { key: 'fathers',       label: 'Father’s Day',      date: fathers,               short: 'Father’s Day',    defaultCTA: 'Shop Gifts' },
    { key: 'independence',  label: 'Independence Day',  date: new Date(year, 6, 4),  short: '4th of July',     defaultCTA: 'Shop Summer' },
    { key: 'labor',         label: 'Labor Day',         date: laborDay,              short: 'Labor Day',       defaultCTA: 'Shop Deals' },
    { key: 'halloween',     label: 'Halloween',         date: new Date(year, 9, 31), short: 'Halloween',       defaultCTA: 'Shop Now' },
    { key: 'thanksgiving',  label: 'Thanksgiving',      date: thanksgiving,          short: 'Thanksgiving',    defaultCTA: 'See Picks' },
    { key: 'black_friday',  label: 'Black Friday',      date: blackFriday,           short: 'Black Friday',    defaultCTA: 'Shop Doorbusters' },
    { key: 'cyber_monday',  label: 'Cyber Monday',      date: cyberMonday,           short: 'Cyber Monday',    defaultCTA: 'Online Only' },
    { key: 'christmas',     label: 'Christmas',         date: new Date(year, 11, 25),short: 'Holiday',         defaultCTA: 'Holiday Shop' },
  ];
}

function nearestOccasion(now = new Date()): Occasion {
  const year = now.getFullYear();
  const list = [...getOccasionsForYear(year), ...getOccasionsForYear(year + 1)];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = list.filter(o => o.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
  return upcoming[0] || list[0];
}

/* ---------- Prompt helpers (make it sound human) ---------- */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function truncate(s: string, n = 140) {
  if (!s) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}
function joinAnd(items: string[], max = 3) {
  const uniq = Array.from(new Set(items.filter(Boolean)));
  const take = uniq.slice(0, max);
  if (take.length <= 1) return take.join('');
  return take.slice(0, -1).join(', ') + ' and ' + take.slice(-1);
}

const STYLE_TRAITS: Record<DesignAesthetic, string[]> = {
  bold_contrasting: ['high contrast', 'dramatic lighting', 'rich shadows'],
  minimal_clean: ['clean background', 'soft light', 'plenty of whitespace'],
  magazine_serif: ['editorial feel', 'subtle film grain', 'artful composition'],
  warm_editorial: ['warm light', 'paper texture', 'cozy editorial vibe'],
  neo_brutalist: ['hard edges', 'flat planes', 'graphic balance'],
  gradient_glow: ['glowing gradients', 'dark canvas', 'atmospheric depth'],
  pastel_soft: ['soft tones', 'gentle lighting', 'rounded shapes'],
  luxe_mono: ['monochrome palette', 'refined minimalism', 'crisp contrast'],
};

const OCCASION_VISUALS: Record<string, { palette: string[]; motifs: string[] }> = {
  labor:       { palette: ['deep navy', 'white', 'cherry red'], motifs: ['subtle stars/stripes geometry', 'clean ribbon accents'] },
  memorial:    { palette: ['navy', 'silver', 'white'], motifs: ['clean bands', 'subtle flag-inspired angles'] },
  independence:{ palette: ['red', 'white', 'blue'], motifs: ['confetti bokeh', 'sparks (abstract)'] },
  black_friday:{ palette: ['near-black', 'charcoal', 'white'], motifs: ['spotlight contrast', 'sleek shadows'] },
  cyber_monday:{ palette: ['ink', 'electric blue', 'white'], motifs: ['neon glow', 'grids (subtle)'] },
  halloween:   { palette: ['coal', 'pumpkin', 'bone'], motifs: ['soft haze', 'crescent arcs'] },
  christmas:   { palette: ['pine', 'cranberry', 'cream'], motifs: ['soft snow grain', 'garland curve (abstract)'] },
  valentines:  { palette: ['rose', 'cream', 'claret'], motifs: ['bokeh hearts (very subtle)', 'ribbons'] },
  fathers:     { palette: ['slate', 'steel', 'ivory'], motifs: ['diagonal stripes', 'ticket-corner blocks'] },
  mothers:     { palette: ['blush', 'pearl', 'sage'], motifs: ['soft petals (abstract)', 'paper texture'] },
  stpats:      { palette: ['emerald', 'linen', 'charcoal'], motifs: ['leaf shapes (abstract)', 'soft grain'] },
  easter:      { palette: ['pastel mix', 'ivory', 'mist'], motifs: ['soft gradients', 'rounded shapes'] },
  presidents:  { palette: ['navy', 'cream', 'scarlet'], motifs: ['rosette arcs', 'bold banners'] },
  thanksgiving:{ palette: ['maple', 'wheat', 'espresso'], motifs: ['grain texture', 'leaf silhouettes (abstract)'] },
  new_year:    { palette: ['ink', 'champagne', 'white'], motifs: ['confetti blur', 'light streaks'] },
};

const CTA_ALTS_COMMON = [
  'Shop Deals',
  'See the Collection',
  'Save Now',
  'Get Yours',
  'Explore Now',
  'Claim the Offer',
];

function ctaForOccasion(occ: Occasion) {
  return occ.defaultCTA || pick(CTA_ALTS_COMMON);
}

function shortTimeHint(occ: Occasion) {
  const now = new Date();
  const days = Math.ceil((occ.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Ends soon';
  if (days === 1) return 'Ends tomorrow';
  if (days <= 3) return 'This week only';
  return undefined;
}

/** Human-y user context */
function buildUserContext(opts: {
  occasion: Occasion;
  brandName: string;
  brandDesc?: string;
  emailType: EmailType | null;
  tone: Tone;
  products?: ProductLink[];
}) {
  const { occasion, brandName, brandDesc, emailType, tone, products } = opts;
  const type = emailType || 'Promotion';

  const toneOpeners: Record<Tone, string[]> = {
    bold:     ['Big savings, zero fluff.', 'Go big on value.', 'Turn it up.'],
    friendly: ['Hey there — deal time!', 'A little pick-me-up.', 'Sharing something good.'],
    formal:   ['Seasonal savings have arrived.', 'A timely offer for you.', 'Valuable updates inside.'],
    fun:      ['Let’s make it a win.', 'Deal mode: ON.', 'A tasty little treat.'],
  };

  const opener = pick(toneOpeners[tone]);
  const descBit = brandDesc ? ` ${truncate(brandDesc)}` : '';
  const occName = occasion.short || occasion.label;
  const timeHint = shortTimeHint(occasion);
  const cta = ctaForOccasion(occasion);

  const productNames = (products || [])
    .map(p => p?.name?.trim())
    .filter(Boolean);

  const productLine = productNames.length
    ? ` Spotlight on ${joinAnd(productNames)}.`
    : '';

  const typeLine: Record<EmailType, string> = {
    Promotion:    `${occName} savings are live for ${brandName}.`,
    Productgrid:  `Browse ${brandName} picks for ${occName}.`,
    Newsletter:   `${brandName} updates for ${occName}.`,
  };

  const closes = [
    `Ready when you are — ${cta}.`,
    `${timeHint ? timeHint + '. ' : ''}${cta}.`,
    `${cta} while it’s fresh.`,
  ];

  // 2–3 short, human sentences.
  return [
    opener,
    typeLine[type] + descBit + productLine,
    pick(closes),
  ].filter(Boolean).join(' ');
}

/** Crisp, visual image context (no text) */
function buildImageContext(opts: {
  occasion: Occasion;
  brandName: string;
  design: DesignAesthetic;
  brandPrimary?: string;
  brandLink?: string;
}) {
  const { occasion, brandName, design, brandPrimary, brandLink } = opts;
  const key = occasion.key in OCCASION_VISUALS ? occasion.key : 'new_year';
  const visuals = OCCASION_VISUALS[key];
  const traits = STYLE_TRAITS[design] || [];

  const palette = [brandPrimary, brandLink, ...visuals.palette].filter(Boolean);
  const paletteLine = `palette: ${palette.slice(0, 3).join(', ')}`;
  const motif = pick(visuals.motifs);
  const trait = pick(traits);

  // Single clean sentence that guides composition but stays free of text/logos.
  return `${occasion.short || occasion.label} hero for ${brandName} — ${motif}, ${trait}, ${paletteLine}; cinematic product focus if applicable; no text, no logos, no watermark, uncluttered background.`;
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

  /* ---------- Auto-suggest contexts on entry (human-friendly) ---------- */
  const generateContexts = React.useCallback(() => {
    const occ = nearestOccasion(new Date());
    const uc = buildUserContext({
      occasion: occ,
      brandName,
      brandDesc,
      emailType: selectedEmailType,
      tone,
      products,
    });
    const ic = buildImageContext({
      occasion: occ,
      brandName,
      design: designAesthetic,
      brandPrimary,
      brandLink,
    });
    return { uc, ic, occ };
  }, [brandName, brandDesc, selectedEmailType, tone, designAesthetic, brandPrimary, brandLink, products]);

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

      {/* Saved images (only when NOT using custom hero) */}
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
            placeholder="Describe the hero vibe (e.g., “Dynamic splash shot with icy droplets; bold contrast; clean background; no text.”)"
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
          placeholder="In 2–3 short sentences, say what this email should do (offer, audience, vibe). Avoid labels like “Tone: …”. End with a natural CTA (e.g., “Shop Deals”)."
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
