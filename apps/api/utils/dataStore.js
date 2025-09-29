// apps/api/utils/dataStore.js
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "./supabaseClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "../data/brands.json");

const USE_SUPABASE = !!supabase; // true if env keys were set

/**
 * getStoredBrand(domain) -> { userId, brand, updatedAt } | null
 * - Maintains the same shape your controllers expect.
 */
export async function getStoredBrand(domain) {
  const normalized = String(domain).trim().toLowerCase();
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from("brand_cache")
      .select("normalized, updated_at")
      .eq("domain", normalized)
      .maybeSingle();

    if (error) {
      console.error("[brand_cache] getStoredBrand error:", error.message);
      return null;
    }
    if (!data) return null;

    return {
      userId: null, // global cache, not user-specific
      brand: data.normalized,
      updatedAt: data.updated_at,
    };
  } else {
    // Disk fallback
    try {
      const file = JSON.parse(await readFile(DATA_FILE, "utf8"));
      return file[normalized] || null;
    } catch {
      return null;
    }
  }
}

/**
 * storeBrand(domain, userId, brandJson) -> void
 * - Writes normalized brand JSON to Supabase (or disk fallback).
 * - Also mirrors useful top-level columns for quick filtering.
 */
export async function storeBrand(domain, _userId, brandJson) {
  const normalized = String(domain).trim().toLowerCase();

  // Extract helpful columns
  const primary_color =
    brandJson?.primary_color ??
    brandJson?.brandData?.primary_color ??
    null;

  const link_color =
    brandJson?.link_color ??
    brandJson?.brandData?.link_color ??
    null;

  const store_id = brandJson?.brandData?.store_id ?? null;

  if (USE_SUPABASE) {
    const row = {
      domain: normalized,
      normalized: brandJson,
      primary_color,
      link_color,
      store_id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("brand_cache").upsert(row);
    if (error) {
      console.error("[brand_cache] storeBrand upsert error:", error.message);
      throw error;
    }
    return;
  } else {
    // Disk fallback
    let data = {};
    try {
      data = JSON.parse(await readFile(DATA_FILE, "utf8"));
    } catch {
      // start fresh
    }

    data[normalized] = {
      userId: null,
      brand: brandJson,
      updatedAt: new Date().toISOString(),
    };

    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  }
}
