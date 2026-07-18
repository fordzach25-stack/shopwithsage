// --- Affiliate Link Configuration ---
//
// PLACEHOLDER TAGS — Replace these with your real affiliate IDs before launching:
//   Amazon:    Replace "dealsage-20" with your Amazon Associates tracking ID
//   eBay:      Replace "5338765432" with your eBay Partner Network campaign ID
//   Walmart:   Replace "dealsage" with your Walmart affiliate wmlspartner ID
//   Best Buy:  Replace the base64 cjdata string with your actual encoded data
//
// After replacing placeholders, remove this comment block.

/**
 * Affiliate network configuration.
 * Each entry defines how to append tracking parameters to a clean product URL.
 */
interface AffiliateConfig {
  /** URL query parameter to set */
  param: string;
  /** Value for the parameter. If a function, called with the URL to produce the value. */
  value: string | ((url: string) => string);
}

const AFFILIATE_CONFIG: Record<string, AffiliateConfig> = {
  amazon: {
    param: "tag",
    value: "shopwithsag08-20", // ← REPLACE with your Amazon Associates tag
  },
  ebay: {
    param: "campid",
    value: "5339168270", // ← REPLACE with your eBay Partner Network campaign ID
  },
  walmart: {
    param: "wmlspartner",
    value: "dealsage", // ← REPLACE with your Walmart wmlspartner ID
  },
  bestbuy: {
    param: "cjdata",
    value: "REPLACE_WITH_YOUR_ENCODED_CJDATA", // ← REPLACE with your Best Buy cjdata
  },
};

/** Fallback parameter used for any retailer not in the config above. */
const FALLBACK_PARAM = "ref";
const FALLBACK_VALUE = "dealsage";

/**
 * Maps a retailer display name (e.g. "Amazon", "Best Buy") to the config key.
 * Handles case-insensitive matching.
 */
function getAffiliateKey(retailer: string): string | undefined {
  const normalized = retailer.toLowerCase().replace(/\s+/g, "");
  // Direct match
  if (AFFILIATE_CONFIG[normalized]) return normalized;
  // Partial match (e.g. "Amazon.com" → "amazon")
  for (const key of Object.keys(AFFILIATE_CONFIG)) {
    if (normalized.includes(key)) return key;
  }
  return undefined;
}

/**
 * Appends affiliate tracking parameters to a clean product URL.
 *
 * @param url    - The clean product URL (no existing affiliate tags)
 * @param retailer - Retailer display name (e.g. "Amazon", "eBay")
 * @returns The URL with the appropriate affiliate tracking parameter appended
 */
export function getAffiliateUrl(url: string, retailer: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // If URL parsing fails, return the original — don't corrupt it
    return url;
  }

  const key = getAffiliateKey(retailer);
  const config = key ? AFFILIATE_CONFIG[key] : undefined;

  const param = config?.param ?? FALLBACK_PARAM;
  const rawValue = config?.value ?? FALLBACK_VALUE;
  const value = typeof rawValue === "function" ? rawValue(url) : rawValue;

  parsed.searchParams.set(param, value);
  return parsed.toString();
}

/**
 * Returns true if the given retailer has a real affiliate config (not the fallback).
 * Useful for UI hints or debugging.
 */
export function hasAffiliateConfig(retailer: string): boolean {
  return getAffiliateKey(retailer) !== undefined;
}
