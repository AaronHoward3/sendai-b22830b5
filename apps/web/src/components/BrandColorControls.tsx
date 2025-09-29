import React, { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  readonly scrapedPrimary?: string;     // brandData.primary_color
  readonly scrapedSecondary?: string;   // brandData.link_color
  readonly brandId?: string | number;
  readonly brandDomain?: string;        // used when saving
  readonly onChange: (colors: { primary_color: string; link_color: string }) => void;
}

function normalizeHex(c?: string): string | undefined {
  if (!c || typeof c !== "string") return undefined;
  let v = c.trim();
  if (!v) return undefined;
  if (!v.startsWith("#")) v = "#" + v;
  v = v.toUpperCase();
  const hex = v.replace(/[^0-9A-F#]/g, "");
  if (!/^#[0-9A-F]{3,6}$/.test(hex)) return undefined;
  if (hex.length === 4) {
    // #RGB -> #RRGGBB
    const r = hex[1], g = hex[2], b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (hex.length === 7) return hex;
  return undefined;
}

const BrandColorControls: React.FC<Props> = ({
  scrapedPrimary,
  scrapedSecondary,
  brandId,
  brandDomain,
  onChange,
}) => {
  const normScraped = useMemo(() => ({
    primary: normalizeHex(scrapedPrimary) || "#000000",
    secondary: normalizeHex(scrapedSecondary) || "#0000FF",
  }), [scrapedPrimary, scrapedSecondary]);

  const [primary, setPrimary] = useState(normScraped.primary);
  const [secondary, setSecondary] = useState(normScraped.secondary);
  const [saving, setSaving] = useState(false);

  // keep a separate swatch so the native color input always stays valid
  const [swatchPrimary, setSwatchPrimary] = useState(primary);
  const [swatchSecondary, setSwatchSecondary] = useState(secondary);

  const primaryPickerRef = useRef<HTMLInputElement | null>(null);
  const secondaryPickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onChange({ primary_color: primary, link_color: secondary });
  }, [primary, secondary, onChange]);

  const setAndNotify = (which: "primary" | "secondary", hex: string) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    if (which === "primary") {
      setPrimary(normalized);
      setSwatchPrimary(normalized);
    } else {
      setSecondary(normalized);
      setSwatchSecondary(normalized);
    }
  };

  const onHexChange = (which: "primary" | "secondary") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (which === "primary") setPrimary(v);
    else setSecondary(v);
  };

  const onHexBlur = (which: "primary" | "secondary") => () => {
    const v = which === "primary" ? primary : secondary;
    const normalized = normalizeHex(v);
    if (normalized) {
      setAndNotify(which, normalized);
    } else {
      // reset to scraped if invalid
      setAndNotify(which, which === "primary" ? normScraped.primary : normScraped.secondary);
    }
  };

  const pick = (which: "primary" | "secondary") => {
    const ref = which === "primary" ? primaryPickerRef.current : secondaryPickerRef.current;
    ref?.click();
  };

  const save = async () => {
    const p = normalizeHex(primary);
    const l = normalizeHex(secondary);
    if (!p || !l) return;

    setSaving(true);
    try {
      // Save by domain (preferred)
      const body: { primary_color: string; link_color: string; domain?: string } = { primary_color: p, link_color: l };
      let url = "";
      if (brandDomain?.trim()) {
        url = "/api/brand/colors";
        body.domain = brandDomain;
      } else if (brandId !== undefined && brandId !== null) {
        url = `/api/brand/${brandId}/colors`;
      } else {
        throw new Error("Missing brandDomain or brandId to save colors.");
      }

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Save failed: ${res.status} ${msg}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const resetToScraped = () => {
    const p = normScraped.primary;
    const l = normScraped.secondary;
    setPrimary(p);
    setSecondary(l);
    setSwatchPrimary(p);
    setSwatchSecondary(l);
    onChange({ primary_color: p, link_color: l });
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary */}
        <div className="space-y-2">
          <label htmlFor="primary-color-input" className="text-sm font-medium">Primary Color</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => pick("primary")}
              style={{ background: swatchPrimary }}
              className="h-9 w-9 rounded-md border"
              title="Pick color"
            />
            <input
              id="primary-color-input"
              value={primary}
              onChange={onHexChange("primary")}
              onBlur={onHexBlur("primary")}
              placeholder="#112233"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              spellCheck={false}
            />
            <input
              ref={primaryPickerRef}
              type="color"
              value={swatchPrimary}
              onChange={(e) => setAndNotify("primary", e.target.value)}
              className="hidden"
            />
          </div>
        </div>

        {/* Link / Secondary */}
        <div className="space-y-2">
          <label htmlFor="secondary-color-input" className="text-sm font-medium">Link / Secondary Color</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => pick("secondary")}
              style={{ background: swatchSecondary }}
              className="h-9 w-9 rounded-md border"
              title="Pick color"
            />
            <input
              id="secondary-color-input"
              value={secondary}
              onChange={onHexChange("secondary")}
              onBlur={onHexBlur("secondary")}
              placeholder="#0000FF"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              spellCheck={false}
            />
            <input
              ref={secondaryPickerRef}
              type="color"
              value={swatchSecondary}
              onChange={(e) => setAndNotify("secondary", e.target.value)}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          {saving ? 'Saving…' : 'Update Brand Colors'}
        </button>
        <button
          type="button"
          onClick={resetToScraped}
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Reset to Scraped
        </button>
      </div>
    </div>
  );
};

export default BrandColorControls;
