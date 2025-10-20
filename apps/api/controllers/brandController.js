import { scrapeProductsFromDomain } from "../utils/productScraper.js";
import { getStoredBrand, storeBrand } from "../utils/dataStore.js";
import fetch from "node-fetch";

export async function checkBrand(req, res) {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain required" });
  }

  const normalizedDomain = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  try {
    const existing = await getStoredBrand(normalizedDomain);
    if (existing) {
      console.log(`Returning stored brand for ${normalizedDomain} from disk.`);
      return res.json(existing.brand);
    }

    // Check if we have the required API key
    if (!process.env.BRANDDEV_API_KEY) {
      console.log(`No BRANDDEV_API_KEY found, returning fallback brand for ${normalizedDomain}`);
      
      // Return fallback brand data for freemium users in brand.dev format
      const fallbackBrand = {
        brand: {
          domain: normalizedDomain,
          title: normalizedDomain,
          description: `Brand for ${normalizedDomain}`,
          slogan: "",
          colors: [
            { hex: "#4f46e5", name: "Primary" },
            { hex: "#22d3ee", name: "Secondary" }
          ],
          logos: [],
          backdrops: [],
          fonts: [],
          socials: []
        }
      };
      
      return res.json(fallbackBrand);
    }

    const response = await fetch(`https://api.brand.dev/v1/brand/retrieve?domain=${normalizedDomain}`, {
      headers: {
        Authorization: `Bearer ${process.env.BRANDDEV_API_KEY}`
      }
    });

    if (!response.ok) {
      console.log("Brand.dev status code:", response.status);
      return res.status(500).json({ error: "brand.dev lookup failed" });
    }

    const brandDevData = await response.json();
    
    // Store the original brand.dev response without normalization
    await storeBrand(normalizedDomain, null, brandDevData);

    console.log(`Stored original brand.dev data for ${normalizedDomain}.`);

    res.json(brandDevData);

  } catch (err) {
    console.error("Brand check error:", err.message);
    res.status(500).json({ error: "Failed to check brand" });
  }
}

/**
 * PATCH /api/brand/colors
 * Body: { domain: string, primary_color: string, link_color: string }
 * Updates the stored brand's colors and mirrors keys at the top level for compatibility.
 */
export async function updateBrandColors(req, res) {
  try {
    let { domain, primary_color, link_color } = req.body || {};
    if (!domain || !primary_color || !link_color) {
      return res.status(400).json({ error: "domain, primary_color and link_color are required" });
    }

    // normalize domain
    const normalizedDomain = String(domain)
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    // normalize hex to #RRGGBB
    const toHashHex6 = (v) => {
      if (typeof v !== "string") return undefined;
      let s = v.trim();
      if (!s) return undefined;
      if (!s.startsWith("#")) s = "#" + s;
      // expand #RGB
      if (/^#[0-9a-fA-F]{3}$/.test(s)) {
        const r = s[1], g = s[2], b = s[3];
        s = `#${r}${r}${g}${g}${b}${b}`;
      }
      return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : undefined;
    };

    primary_color = toHashHex6(primary_color);
    link_color = toHashHex6(link_color);
    if (!primary_color || !link_color) {
      return res.status(400).json({ error: "Colors must be valid hex (#RRGGBB)" });
    }

    const existing = await getStoredBrand(normalizedDomain);
    if (!existing?.brand) {
      return res.status(404).json({ error: "Brand not found for domain", domain: normalizedDomain });
    }

    // clone, modify, persist
    const brand = structuredClone(existing.brand);
    brand.brandData = brand.brandData || {};
    brand.brandData.primary_color = primary_color;
    brand.brandData.link_color = link_color;

    // mirror for template compatibility
    brand.primary_color = primary_color;
    brand.link_color = link_color;

    await storeBrand(normalizedDomain, existing.userId ?? null, brand);
    return res.json({ ok: true, brand });
  } catch (err) {
    console.error("updateBrandColors error:", err.message);
    return res.status(500).json({ error: "Failed to update brand colors" });
  }
}
