import { createServerFn } from "@tanstack/react-start";
import { getAffiliateUrl } from "./affiliates";
import { findCoupons, type CouponResult } from "./coupons";

// --- Startup: log SERPAPI_KEY availability ---
console.log("[DealSage] SERPAPI_KEY present:", !!process.env["SERPAPI_KEY"], "length:", process.env["SERPAPI_KEY"]?.length || 0);

// --- Types ---

export interface CashBackResult {
  cardName: string;
  rate: number;
  cashBackAmount: number;
  annualFee: number;
  isCategoryRate: boolean;
}

export interface ComparisonPrice {
  retailer: string;
  price: number;
  currency: string;
  condition: "New" | "Refurbished" | "Used" | "Open Box";
  url: string; // affiliate-tagged URL
  isBest: boolean; // true if this is the lowest-priced option
}

export interface ReviewSample {
  rating: number;
  text: string;
}

export interface ScrapedProduct {
  title: string;
  currentPrice: number | null;
  wasPrice: number | null;
  currency: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  retailer: string;
  reviews: ReviewSample[];
  source: "scraped" | "demo";
  url: string;
  originalUrl: string;
  originalRetailer: string;
}

export interface FakeDiscountAnalysis {
  detected: boolean;
  severity: "none" | "low" | "medium" | "high";
  explanation: string;
  discountPercent: number | null;
}

export interface ReviewSummary {
  pros: string[];
  cons: string[];
  commonComplaints: string[];
  overallSentiment: "positive" | "mixed" | "negative";
}

export interface StackedSavings {
  bestCoupon: { code: string; savings: number } | null;
  bestCashback: { cardName: string; cashBackAmount: number } | null;
  totalSavings: number;
  finalPrice: number;
}

export interface PricePrediction {
  direction: "up" | "down" | "stable";
  confidence: number; // 0-100
  predictedChange: string; // e.g. "+$15-25" or "-$10-20" or "±$5"
  reasoning: string;
  recommendation: "buy_now" | "wait" | "monitor";
  factors: string[];
}

export interface ProductAnalysis {
  product: ScrapedProduct;
  fakeDiscount: FakeDiscountAnalysis;
  reviewSummary: ReviewSummary;
  cashback: CashBackResult[];
  coupons: CouponResult[];
  stackedSavings: StackedSavings | null;
  comparisonPrices: ComparisonPrice[];
  pricePrediction: PricePrediction;
  analysisNote?: string;
}

// --- Cash Back Calculation ---

interface CreditCardDef {
  name: string;
  baseRate: number;
  categoryRate: number | null;
  categoryLabel: string | null;
  annualFee: number;
}

const CREDIT_CARDS: CreditCardDef[] = [
  { name: "Amazon Prime Visa", baseRate: 0.01, categoryRate: 0.05, categoryLabel: "Amazon & Whole Foods", annualFee: 0 },
  { name: "Blue Cash Everyday (Amex)", baseRate: 0.01, categoryRate: 0.03, categoryLabel: "Online retail purchases", annualFee: 0 },
  { name: "Chase Freedom Unlimited", baseRate: 0.015, categoryRate: 0.05, categoryLabel: "Rotating quarterly categories", annualFee: 0 },
  { name: "Discover it Cash Back", baseRate: 0.01, categoryRate: 0.05, categoryLabel: "Rotating quarterly categories", annualFee: 0 },
  { name: "Citi Double Cash", baseRate: 0.02, categoryRate: null, categoryLabel: null, annualFee: 0 },
  { name: "Wells Fargo Active Cash", baseRate: 0.02, categoryRate: null, categoryLabel: null, annualFee: 0 },
  { name: "Apple Card", baseRate: 0.01, categoryRate: 0.02, categoryLabel: "Apple Pay purchases", annualFee: 0 },
  { name: "Capital One Quicksilver", baseRate: 0.015, categoryRate: null, categoryLabel: null, annualFee: 0 },
];

function qualifiesForCategoryRate(card: CreditCardDef, retailer: string): boolean {
  const r = retailer.toLowerCase();
  if (card.name === "Amazon Prime Visa") return r === "amazon";
  if (card.name === "Blue Cash Everyday (Amex)") return ["amazon", "ebay", "walmart", "target", "best buy", "etsy", "aliexpress"].some((x) => r.includes(x));
  if (card.name === "Chase Freedom Unlimited" || card.name === "Discover it Cash Back") return ["amazon", "walmart", "target"].some((x) => r.includes(x));
  if (card.name === "Apple Card") return ["amazon", "ebay", "walmart", "target", "best buy", "etsy", "aliexpress"].some((x) => r.includes(x));
  return false;
}

function calculateCashBack(productPrice: number, retailer: string): CashBackResult[] {
  const results: CashBackResult[] = CREDIT_CARDS.map((card) => {
    const useCategory = card.categoryRate !== null && qualifiesForCategoryRate(card, retailer);
    const rate = useCategory ? card.categoryRate! : card.baseRate;
    return {
      cardName: card.name,
      rate,
      cashBackAmount: Math.round(productPrice * rate * 100) / 100,
      annualFee: card.annualFee,
      isCategoryRate: useCategory,
    };
  });
  results.sort((a, b) => b.cashBackAmount - a.cashBackAmount);
  return results;
}

// --- Helper: parse price from text ---

function parsePrice(text: string): { price: number | null; currency: string } {
  const cleaned = text.replace(/[^\d.,]/g, "").trim();
  // Handle formats like "1,234.56" or "1.234,56"
  let num: number | null = null;
  const usFormat = /^[\d,]+\.\d{2}$/;
  const euFormat = /^[\d.]+,\d{2}$/;

  if (usFormat.test(cleaned)) {
    num = parseFloat(cleaned.replace(/,/g, ""));
  } else if (euFormat.test(cleaned)) {
    num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  } else {
    num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
  }

  const currency =
    text.includes("$") || text.includes("USD")
      ? "USD"
      : text.includes("£")
        ? "GBP"
        : text.includes("€")
          ? "EUR"
          : text.includes("¥")
            ? "JPY"
            : "USD";

  return { price: isNaN(num ?? NaN) ? null : num, currency };
}

// --- Helper: detect retailer from URL ---

function detectRetailer(url: string): string {
  const hostname = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (hostname.includes("amazon")) return "Amazon";
  if (hostname.includes("ebay")) return "eBay";
  if (hostname.includes("walmart")) return "Walmart";
  if (hostname.includes("target")) return "Target";
  if (hostname.includes("bestbuy")) return "Best Buy";
  if (hostname.includes("etsy")) return "Etsy";
  if (hostname.includes("aliexpress")) return "AliExpress";
  if (hostname.includes("books.toscrape")) return "Books to Scrape";
  return "Unknown Retailer";
}

// --- URL-to-query extraction for SerpAPI ---

function extractProductQuery(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;
    const segments = pathname.split("/").filter(Boolean);

    if (hostname.includes("amazon")) {
      // /Product-Name/dp/B0XXX/ — extract product name + ASIN
      const dpIndex = segments.findIndex((s) => s === "dp");
      if (dpIndex > 0) {
        const nameParts = segments.slice(0, dpIndex).join(" ");
        const asin = segments[dpIndex + 1] || "";
        return `${nameParts} ${asin}`.trim();
      }
      return segments.join(" ");
    }

    if (hostname.includes("walmart")) {
      // /ip/Product-Name/12345678
      const ipIndex = segments.findIndex((s) => s === "ip");
      if (ipIndex >= 0 && segments[ipIndex + 1]) {
        return segments[ipIndex + 1].replace(/-/g, " ");
      }
      return segments.join(" ");
    }

    if (hostname.includes("bestbuy")) {
      // /site/product-name/6505727.p
      const siteIndex = segments.findIndex((s) => s === "site");
      if (siteIndex >= 0 && segments[siteIndex + 1]) {
        return segments[siteIndex + 1].replace(/-/g, " ");
      }
      return segments.join(" ");
    }

    if (hostname.includes("ebay")) {
      // /itm/123456789012 — title is often the 3rd segment after /itm/
      const itmIndex = segments.findIndex((s) => s === "itm");
      if (itmIndex >= 0 && segments[itmIndex + 2]) {
        return segments[itmIndex + 2].replace(/-/g, " ");
      }
      return segments.join(" ");
    }

    if (hostname.includes("target")) {
      const pIndex = segments.findIndex((s) => s === "p");
      if (pIndex >= 0 && segments[pIndex + 1]) {
        return segments[pIndex + 1].replace(/-/g, " ");
      }
      return segments.join(" ");
    }

    // Generic: extract meaningful words from path
    const cleaned = pathname
      .replace(/\.(html?|php|jsp|aspx?)$/, "")
      .replace(/[\/\-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || url;
  } catch {
    return url;
  }
}

// --- Build direct retailer search URLs for comparison prices ---

function buildRetailerSearchUrl(retailer: string, productTitle: string): string {
  const encoded = encodeURIComponent(productTitle);
  const retailerLower = retailer.toLowerCase().replace(/\s+/g, "");
  let url: string;

  if (retailerLower.includes("amazon")) {
    url = `https://www.amazon.com/s?k=${encoded}`;
  } else if (retailerLower.includes("ebay")) {
    url = `https://www.ebay.com/sch/i.html?_nkw=${encoded}`;
  } else if (retailerLower.includes("walmart")) {
    url = `https://www.walmart.com/search?q=${encoded}`;
  } else if (retailerLower.includes("target")) {
    url = `https://www.target.com/s?searchTerm=${encoded}`;
  } else if (retailerLower.includes("bestbuy")) {
    url = `https://www.bestbuy.com/site/searchpage.jsp?st=${encoded}`;
  } else if (retailerLower.includes("etsy")) {
    url = `https://www.etsy.com/search?q=${encoded}`;
  } else if (retailerLower.includes("aliexpress")) {
    url = `https://www.aliexpress.com/wholesale?SearchText=${encoded}`;
  } else {
    // Unknown retailer — no affiliate program, don't link to Google
    return "";
  }

  return getAffiliateUrl(url, retailer);
}

// --- SerpAPI eBay listing resolver ---

async function getEbayListingUrl(productTitle: string, targetPrice?: number): Promise<string | null> {
  const apiKey = process.env["SERPAPI_KEY"];
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://serpapi.com/search?engine=ebay&_nkw=${encodeURIComponent(productTitle)}&api_key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) },
    );

    if (!response.ok) {
      console.error(`[DealSage] eBay SerpAPI returned status ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      organic_results?: Array<{
        link?: string;
        title?: string;
        price?: { raw?: string; extracted?: number };
      }>;
    };
    const results = data.organic_results;

    if (!results || results.length === 0) {
      console.error("[DealSage] eBay SerpAPI returned empty organic_results");
      return null;
    }

    // Price-aware matching: if targetPrice is provided, find a result within ±5%
    if (targetPrice !== undefined && targetPrice > 0) {
      const tolerance = targetPrice * 0.05;
      for (const result of results) {
        const resultPrice = result.price?.extracted;
        if (resultPrice !== undefined && resultPrice > 0) {
          const diff = Math.abs(resultPrice - targetPrice);
          if (diff <= tolerance) {
            const listingUrl = result.link;
            if (listingUrl) {
              console.error(
                `[DealSage] eBay price match found: ${resultPrice.toFixed(2)} vs target ${targetPrice.toFixed(2)} (diff: ${diff.toFixed(2)})`,
              );
              return listingUrl;
            }
          }
        }
      }
      // No price match found — fall back to top result
      console.error(
        `[DealSage] eBay: no price match for ${targetPrice.toFixed(2)}, using top result`,
      );
    }

    const listingUrl = results[0].link;
    if (!listingUrl) {
      console.error("[DealSage] eBay SerpAPI first result has no link field");
      return null;
    }

    console.error(`[DealSage] Resolved eBay listing: ${listingUrl.slice(0, 80)}`);
    return listingUrl;
  } catch (err) {
    console.error(`[DealSage] eBay SerpAPI error: ${(err as Error).message}`);
    return null;
  }
}

// --- SerpAPI Walmart listing resolver ---

async function getWalmartListingUrl(productTitle: string, targetPrice?: number): Promise<string | null> {
  const apiKey = process.env["SERPAPI_KEY"];
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://serpapi.com/search?engine=walmart&query=${encodeURIComponent(productTitle)}&api_key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) },
    );

    if (!response.ok) {
      console.error(`[DealSage] Walmart SerpAPI returned status ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      organic_results?: Array<{
        product_page_url?: string;
        title?: string;
        primary_offer?: { offer_price?: number; offer_id?: string };
      }>;
    };
    const results = data.organic_results;

    if (!results || results.length === 0) {
      console.error("[DealSage] Walmart SerpAPI returned empty organic_results");
      return null;
    }

    // Price-aware matching: if targetPrice is provided, find a result within ±5%
    if (targetPrice !== undefined && targetPrice > 0) {
      const tolerance = targetPrice * 0.05;
      for (const result of results) {
        const resultPrice = result.primary_offer?.offer_price;
        if (resultPrice !== undefined && resultPrice > 0) {
          const diff = Math.abs(resultPrice - targetPrice);
          if (diff <= tolerance) {
            const listingUrl = result.product_page_url;
            if (listingUrl) {
              console.error(
                `[DealSage] Walmart price match found: ${resultPrice.toFixed(2)} vs target ${targetPrice.toFixed(2)} (diff: ${diff.toFixed(2)})`,
              );
              return listingUrl;
            }
          }
        }
      }
      // No price match found — fall back to top result
      console.error(
        `[DealSage] Walmart: no price match for ${targetPrice.toFixed(2)}, using top result`,
      );
    }

    const listingUrl = results[0].product_page_url;
    if (!listingUrl) {
      console.error("[DealSage] Walmart SerpAPI first result has no product_page_url field");
      return null;
    }

    console.error(`[DealSage] Resolved Walmart listing: ${listingUrl.slice(0, 80)}`);
    return listingUrl;
  } catch (err) {
    console.error(`[DealSage] Walmart SerpAPI error: ${(err as Error).message}`);
    return null;
  }
}

// --- Scraper: SerpAPI Google Shopping ---

interface SerpAPIShoppingResult {
  title: string;
  price?: string;
  extracted_price?: number;
  original_price?: string;
  source?: string;
  link?: string;
  product_link?: string;
  rating?: number;
  reviews_count?: number;
  thumbnail?: string;
  condition?: string;
}

async function scrapeWithSerpAPI(
  url: string,
): Promise<{ product: ScrapedProduct; comparisonPrices: ComparisonPrice[] } | null> {
  let apiKey = process.env["SERPAPI_KEY"];
  if (!apiKey) {
    // Fallback: try reading from .env file
    try {
      const { readFileSync } = await import("fs");
      const envContent = readFileSync(".env", "utf8");
      apiKey = envContent.match(/SERPAPI_KEY=(.+)/)?.[1]?.trim();
      if (apiKey) {
        console.error("[DealSage] SERPAPI_KEY loaded from .env file");
      }
    } catch {
      // .env file not found or unreadable — that's fine
    }
  }
  if (!apiKey) {
    console.error("[DealSage] SERPAPI_KEY not set (process.env + .env fallback both empty) — skipping SerpAPI");
    return null;
  }

  const query = extractProductQuery(url);
  console.error(`[DealSage] SerpAPI query: "${query.slice(0, 120)}"`);

  let response: Response;
  try {
    const serpUrl = `https://serpapi.com/search?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${apiKey.slice(0, 8)}***`;
    // Use the real key in the actual fetch, not the logged version
    response = await fetch(
      `https://serpapi.com/search?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${apiKey}`,
      { signal: AbortSignal.timeout(15000) },
    );
  } catch (err) {
    console.error(`[DealSage] SerpAPI fetch error: ${(err as Error).message}`);
    return null;
  }

  if (!response.ok) {
    const status = response.status;
    console.error(
      `[DealSage] SerpAPI returned status ${status}: ${status === 429 ? "rate limited" : status >= 500 ? "server error" : "request error"}`,
    );
    return null;
  }

  let data: { shopping_results?: SerpAPIShoppingResult[]; search_metadata?: { status?: string } };
  try {
    data = (await response.json()) as {
      shopping_results?: SerpAPIShoppingResult[];
      search_metadata?: { status?: string };
    };
  } catch (err) {
    console.error(`[DealSage] SerpAPI JSON parse error: ${(err as Error).message}`);
    return null;
  }

  const results = data.shopping_results;
  if (!results || results.length === 0) {
    console.error("[DealSage] SerpAPI returned empty shopping_results");
    return null;
  }

  console.error(
    `[DealSage] SerpAPI returned ${results.length} shopping results`,
  );

  // Helper: parse a SerpAPI price value (handles both string "$79.99" and numeric extracted_price)
  const parseSerpPrice = (result: SerpAPIShoppingResult): number | null => {
    if (result.extracted_price && result.extracted_price > 0) {
      return result.extracted_price;
    }
    if (result.price) {
      const parsed = parsePrice(result.price);
      return parsed.price;
    }
    return null;
  };

  // Normalize retailer name from SerpAPI source (e.g. "Amazon.com" → "Amazon")
  const normalizeRetailer = (name: string): string => {
    const lower = name.toLowerCase().replace(/\s+/g, "");
    if (lower.includes("amazon")) return "Amazon";
    if (lower.includes("ebay")) return "eBay";
    if (lower.includes("walmart")) return "Walmart";
    if (lower.includes("target")) return "Target";
    if (lower.includes("bestbuy")) return "Best Buy";
    if (lower.includes("etsy")) return "Etsy";
    if (lower.includes("aliexpress")) return "AliExpress";
    return name;
  };

  const first = results[0];
  const retailer = detectRetailer(url);
  const serpRetailer = normalizeRetailer(first.source || retailer);

  const product: ScrapedProduct = {
    title: first.title || "Unknown Product",
    currentPrice: parseSerpPrice(first),
    wasPrice: first.original_price ? parsePrice(first.original_price).price : null,
    currency: first.price ? parsePrice(first.price).currency : "USD",
    imageUrl: first.thumbnail || null,
    rating: typeof first.rating === "number" ? first.rating : null,
    reviewCount: typeof first.reviews_count === "number" ? first.reviews_count : null,
    retailer: serpRetailer,
    reviews: [],
    source: "scraped",
    url,
    originalUrl: url,
    originalRetailer: detectRetailer(url),
  };

  // Build comparison prices from results #2–6
  const comparisonPrices: ComparisonPrice[] = [];
  const seenRetailers = new Set<string>();
  seenRetailers.add(serpRetailer.toLowerCase());

  for (let i = 1; i < Math.min(results.length, 7); i++) {
    const r = results[i];
    const rRetailer = normalizeRetailer(r.source || "Unknown");
    const rKey = rRetailer.toLowerCase();

    // Skip duplicates (same retailer)
    if (seenRetailers.has(rKey)) continue;
    seenRetailers.add(rKey);

    const price = parseSerpPrice(r);
    if (price === null || price <= 0) continue;

    const affiliateUrl = buildRetailerSearchUrl(rRetailer, product.title);

    let condition: ComparisonPrice["condition"] = "New";
    if (r.condition) {
      const c = r.condition.toLowerCase();
      if (c.includes("refurbished")) condition = "Refurbished";
      else if (c.includes("used")) condition = "Used";
      else if (c.includes("open box") || c.includes("open-box")) condition = "Open Box";
    }

    comparisonPrices.push({
      retailer: rRetailer,
      price,
      currency: product.currency,
      condition,
      url: affiliateUrl,
      isBest: false, // computed below
    });
  }

  // Mark the cheapest as best
  if (comparisonPrices.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < comparisonPrices.length; i++) {
      if (comparisonPrices[i].price < comparisonPrices[bestIdx].price) {
        bestIdx = i;
      }
    }
    comparisonPrices[bestIdx].isBest = true;
  }

  // Resolve real eBay listing URLs for any eBay comparison entries.
  // Google Shopping often returns an eBay search-results URL; we replace it
  // with the actual /itm/ listing from SerpAPI's eBay engine.
  // Pass each entry's price so the linked listing matches the shown price.
  if (comparisonPrices.length > 0) {
    const ebayEntries = comparisonPrices.filter((cp) =>
      cp.retailer.toLowerCase().includes("ebay"),
    );
    if (ebayEntries.length > 0) {
      let replacedCount = 0;
      for (const entry of ebayEntries) {
        try {
          const realEbayUrl = await getEbayListingUrl(product.title, entry.price);
          if (realEbayUrl) {
            entry.url = getAffiliateUrl(realEbayUrl, "eBay");
            replacedCount++;
          }
        } catch {
          // Individual entry resolution failed — keep existing URL
        }
      }
      if (replacedCount > 0) {
        console.error(
          `[DealSage] Replaced ${replacedCount}/${ebayEntries.length} eBay comparison URL(s) with price-matched listings`,
        );
      }
    }
  }

  // Resolve real Walmart listing URLs for any Walmart comparison entries.
  // Google Shopping often returns a Walmart search-results URL; we replace it
  // with the actual /ip/ listing from SerpAPI's Walmart engine.
  // Pass each entry's price so the linked listing matches the shown price.
  if (comparisonPrices.length > 0) {
    const walmartEntries = comparisonPrices.filter((cp) =>
      cp.retailer.toLowerCase().includes("walmart"),
    );
    if (walmartEntries.length > 0) {
      let replacedCount = 0;
      for (const entry of walmartEntries) {
        try {
          const realWalmartUrl = await getWalmartListingUrl(product.title, entry.price);
          if (realWalmartUrl) {
            entry.url = getAffiliateUrl(realWalmartUrl, "Walmart");
            replacedCount++;
          }
        } catch {
          // Individual entry resolution failed — keep existing URL
        }
      }
      if (replacedCount > 0) {
        console.error(
          `[DealSage] Replaced ${replacedCount}/${walmartEntries.length} Walmart comparison URL(s) with price-matched listings`,
        );
      }
    }
  }

  console.error(
    `[DealSage] SerpAPI success: "${product.title.slice(0, 60)}" @ ${product.currentPrice} ${product.currency}, ${comparisonPrices.length} comparison prices`,
  );

  return { product, comparisonPrices };
}

// --- Scraper: run agent-browser to extract product data ---

async function scrapeWithAgentBrowser(
  url: string,
): Promise<ScrapedProduct | null> {
  const retailer = detectRetailer(url);

  // Helper: run a single agent-browser command with timeout.
  // Each invocation is a separate process that connects to the shared browser.
  const runBrowser = async (
    cmd: string,
    timeoutMs = 20000,
  ): Promise<string> => {
    const parts = cmd.split(/\s+/).filter(Boolean);
    const proc = Bun.spawn(["agent-browser", ...parts], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const timer = setTimeout(() => {
      try { proc.kill(); } catch { /* ignore */ }
    }, timeoutMs);

    const output = await new Response(proc.stdout).text();
    clearTimeout(timer);
    await proc.exited.catch(() => {});
    return output.trim();
  };

  // --- Single scrape attempt (used for both first try and retry) ---
  const attemptScrape = async (
    waitStrategy: string,
    navTimeout: number,
    waitTimeout: number,
  ): Promise<{
    title: string | null;
    pageText: string;
    snapshot: string;
    imageUrl: string | null;
    h1Text: string | null;
  } | null> => {
    // Step 1: Navigate to the URL (no quotes — agent-browser handles URL directly)
    const navResult = await runBrowser(`open ${url}`, navTimeout);
    if (navResult.includes("Error") || navResult.includes("timeout")) {
      console.error(
        `[DealSage] Navigation error for ${url}: ${navResult.slice(0, 200)}`,
      );
      return null;
    }

    // Step 2: Wait for page content to render
    const waitResult = await runBrowser(`wait ${waitStrategy}`, waitTimeout);
    if (waitResult.includes("timeout")) {
      console.error(
        `[DealSage] Wait timed out for ${url} (strategy: ${waitStrategy})`,
      );
      // Continue anyway — we may still have partial content
    } else if (waitResult.includes("Error")) {
      console.error(
        `[DealSage] Wait error for ${url}: ${waitResult.slice(0, 200)}`,
      );
    }

    // Step 3: Get the page title (may return garbage — validated later)
    let title: string | null = null;
    try {
      title = await runBrowser("get title", 10000);
      console.error(`[DealSage] Raw get title: "${title?.slice(0, 100)}"`);
    } catch {
      console.error(`[DealSage] Failed to get title for ${url}`);
    }

    // Step 3b: Get h1 text as a fallback title source
    let h1Text: string | null = null;
    try {
      h1Text = await runBrowser(`get text "h1"`, 10000);
      if (h1Text) {
        console.error(`[DealSage] Raw get text h1: "${h1Text.slice(0, 100)}"`);
      }
    } catch {
      console.error(`[DealSage] Failed to get h1 for ${url}`);
    }

    // Step 4: Get all visible page text.
    // Primary approach: use the full accessibility snapshot (most reliable across pages).
    let pageText = "";
    try {
      pageText = await runBrowser("snapshot", 10000);
    } catch { /* fall through */ }

    // Secondary: try getting text from body element specifically
    if (!pageText || pageText.length < 50) {
      try {
        const bodyText = await runBrowser(`get text "body"`, 10000);
        if (bodyText && bodyText.length > 0) {
          pageText = (pageText || "") + "\n" + bodyText;
        }
      } catch { /* fall through */ }
    }

    // Step 5: Get interactive snapshot for structured extraction (element refs)
    let snapshot = "";
    try {
      snapshot = await runBrowser("snapshot -i", 10000);
    } catch {
      console.error(`[DealSage] Failed interactive snapshot for ${url}`);
    }

    // Step 6: Get image
    let imageUrl: string | null = null;
    try {
      const imgSrc = await runBrowser(
        `get attr "img[src]:first-of-type" src`,
        8000,
      );
      if (imgSrc && imgSrc.startsWith("http")) {
        imageUrl = imgSrc;
      }
    } catch { /* best-effort */ }

    return { title, pageText, snapshot, imageUrl, h1Text };
  };

  // --- First attempt: networkidle (best for JS-heavy retail sites) ---
  console.error(`[DealSage] Scraping ${url} (attempt 1: networkidle)...`);
  let data = await attemptScrape("--load networkidle", 20000, 25000);

  // --- Retry if first attempt produced too little content ---
  if (!data || (!data.title && data.pageText.length < 50)) {
    console.error(
      `[DealSage] First attempt yielded minimal content (title=${data?.title}, textLen=${data?.pageText.length}). Retrying with --wait 5000...`,
    );
    data = await attemptScrape("5000", 25000, 30000);
  }

  // If still nothing useful, give up
  if (!data || (!data.title && data.pageText.length < 20)) {
    console.error(
      `[DealSage] All attempts failed for ${url} — no usable content extracted`,
    );
    return null;
  }

  const { title, pageText, snapshot, imageUrl, h1Text } = data;
  const allText = snapshot + "\n" + pageText;
  const snapshotLines = snapshot.split("\n").filter(Boolean);

  // --- Price extraction ---
  let currentPrice: number | null = null;
  let wasPrice: number | null = null;
  let currency = "USD";

  // Strategy 1: Look for price-like elements in snapshot
  const priceLines = snapshotLines.filter(
    (l) =>
      l.includes("price") ||
      l.includes("Price") ||
      l.includes("$") ||
      l.includes("£") ||
      l.includes("€") ||
      l.includes("¥") ||
      /\d+\.\d{2}/.test(l),
  );

  console.error(
    `[DealSage] Price lines found: ${priceLines.length} (snapshot has ${snapshotLines.length} lines)`,
  );

  // Strategy 1a: Find current price — match lines with price indicators
  // Helper inline: extract quoted text from snapshot line to avoid ref number contamination
  const getPriceText = (line: string): string => {
    const m = line.match(/"([^"]*[£$€¥]\s*\d[\d,]*\.?\d*[^"]*)"/);
    return m ? m[1] : line;
  };

  for (const line of priceLines) {
    const l = line.toLowerCase();
    if (
      (l.includes("price") || l.includes("$") || l.includes("£") || l.includes("€") || l.includes("¥")) &&
      !l.includes("was") &&
      !l.includes("list price") &&
      !l.includes("original")
    ) {
      const parsed = parsePrice(getPriceText(line));
      if (parsed.price !== null && parsed.price > 0.5) {
        if (currentPrice === null || parsed.price < currentPrice) {
          if (currentPrice !== null && parsed.price > currentPrice) {
            wasPrice = parsed.price;
          } else {
            if (currentPrice !== null) wasPrice = currentPrice;
            currentPrice = parsed.price;
            currency = parsed.currency;
          }
        }
      }
    }
    // Check for was/previous price indicators
    if (
      l.includes("was") ||
      l.includes("list price") ||
      l.includes("original") ||
      l.includes("reg.") ||
      l.includes("regular")
    ) {
      const parsed = parsePrice(getPriceText(line));
      if (parsed.price !== null && parsed.price > 0.5) {
        if (wasPrice === null && currentPrice !== null && parsed.price > currentPrice) {
          wasPrice = parsed.price;
        } else if (wasPrice === null) {
          wasPrice = parsed.price;
        }
      }
    }
  }

  // Strategy 1b: Snapshot-specific — look for "Price (excl. tax)" / "Price (incl. tax)" rowheader+cell pairs
  if (currentPrice === null) {
    for (let i = 0; i < snapshotLines.length; i++) {
      const line = snapshotLines[i].toLowerCase();
      if (line.includes("price") && (line.includes("excl") || line.includes("incl"))) {
        // Next line or nearby lines might have the cell value
        for (let j = i + 1; j < Math.min(i + 3, snapshotLines.length); j++) {
          const cellLine = snapshotLines[j];
          const cellMatch = cellLine.match(/^\s*-\s+cell\s+"([^"]+)"/);
          if (cellMatch) {
            const parsed = parsePrice(cellMatch[1]);
            if (parsed.price !== null && parsed.price > 0.5 && parsed.price < 100000) {
              currentPrice = parsed.price;
              currency = parsed.currency;
              console.error(
                `[DealSage] Price from snapshot rowheader+cell: ${currentPrice} ${currency}`,
              );
              break;
            }
          }
        }
        if (currentPrice !== null) break;
      }
    }
  }

  // Strategy 1c: Snapshot-specific — look for currency symbols in cell/StaticText lines
  if (currentPrice === null) {
    for (const line of snapshotLines) {
      const hasCurrency =
        line.includes("$") || line.includes("£") || line.includes("€") || line.includes("¥");
      const isValueLine =
        line.includes("cell") || line.includes("StaticText") || line.includes("paragraph");
      if (hasCurrency && isValueLine) {
        const textMatch = line.match(/"([^"]*[£$€¥]\s*\d[\d,]*\.?\d*[^"]*)"/);
        if (textMatch) {
          const parsed = parsePrice(textMatch[1]);
          if (parsed.price !== null && parsed.price > 0.5 && parsed.price < 100000) {
            currentPrice = parsed.price;
            currency = parsed.currency;
            console.error(
              `[DealSage] Price from snapshot currency line: ${currentPrice} ${currency}`,
            );
            break;
          }
        }
      }
    }
  }

  // Strategy 2: Scan all text for currency + number patterns
  if (currentPrice === null) {
    const allPriceTexts: string[] = [
      ...(allText.match(/\$\s*\d[\d,]*\.?\d*/g) || []),
      ...(allText.match(/£\s*\d[\d,]*\.?\d*/g) || []),
      ...(allText.match(/€\s*\d[\d,]*\.?\d*/g) || []),
    ];

    console.error(
      `[DealSage] Regex price scan found ${allPriceTexts.length} currency patterns in text`,
    );

    const validPrices: Array<{ price: number; currency: string }> = [];
    for (const pt of allPriceTexts) {
      const parsed = parsePrice(pt);
      if (parsed.price !== null && parsed.price > 0.5 && parsed.price < 100000) {
        validPrices.push({ price: parsed.price, currency: parsed.currency });
      }
    }

    if (validPrices.length > 0) {
      // Sort ascending — the lowest plausible price is likely the current price
      validPrices.sort((a, b) => a.price - b.price);
      currentPrice = validPrices[0].price;
      currency = validPrices[0].currency;
      // If there's a significantly higher price, it might be the "was" price
      if (validPrices.length >= 2) {
        const highest = validPrices[validPrices.length - 1];
        if (highest.price > currentPrice * 1.2) {
          wasPrice = highest.price;
        }
      }
    }
  }

  // Strategy 3: Look for common price CSS selectors in raw page text
  if (currentPrice === null) {
    const dollarAmounts = allText.match(/\$\s*\d[\d,]*\.\d{2}/g) || [];
    const parsedAmounts = dollarAmounts
      .map((d) => parsePrice(d))
      .filter(
        (p): p is { price: number; currency: string } =>
          p.price !== null && p.price > 0.5 && p.price < 100000,
      )
      .sort((a, b) => a.price - b.price);

    if (parsedAmounts.length > 0) {
      currentPrice = parsedAmounts[0].price;
      currency = parsedAmounts[0].currency;
      if (parsedAmounts.length >= 2) {
        const highest = parsedAmounts[parsedAmounts.length - 1];
        if (highest.price > currentPrice * 1.15) {
          wasPrice = highest.price;
        }
      }
    }
  }

  // --- Rating and review count extraction ---
  let rating: number | null = null;
  let reviewCount: number | null = null;

  // Try snapshot lines first
  for (const line of snapshotLines) {
    // Rating patterns: "4.5 out of 5", "Rating: 4.2", "4.3 stars"
    if (rating === null) {
      const rMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:out of\s*5|stars?|rating)/i);
      if (rMatch) {
        const val = parseFloat(rMatch[1]);
        if (val >= 1 && val <= 5) rating = val;
      }
    }
    // Review count
    if (reviewCount === null) {
      const rcMatch = line.match(/(\d[\d,]*)\s*(?:ratings?|reviews?)/i);
      if (rcMatch) {
        reviewCount = parseInt(rcMatch[1].replace(/,/g, ""), 10);
      }
    }
  }

  // Fallback to page text
  if (rating === null) {
    const ratingMatch = allText.match(/(\d+(?:\.\d+)?)\s*out of\s*5/i);
    if (ratingMatch) {
      const val = parseFloat(ratingMatch[1]);
      if (val >= 1 && val <= 5) rating = val;
    }
  }
  if (reviewCount === null) {
    const reviewCountMatch = allText.match(
      /(\d[\d,]*)\s*(?:ratings?|reviews?)/i,
    );
    if (reviewCountMatch) {
      reviewCount = parseInt(reviewCountMatch[1].replace(/,/g, ""), 10);
    }
  }

  // --- Review samples ---
  const reviews: ReviewSample[] = [];
  const reviewBlocks = allText.match(
    /\d+(?:\.\d+)?\s*out of\s*5[^\n]{0,200}/gi,
  );
  if (reviewBlocks) {
    for (const block of reviewBlocks.slice(0, 5)) {
      const rMatch = block.match(/(\d+(?:\.\d+)?)\s*out of\s*5/i);
      if (rMatch) {
        reviews.push({
          rating: parseFloat(rMatch[1]),
          text: block.replace(rMatch[0], "").trim().slice(0, 200),
        });
      }
    }
  }

  // --- Title extraction: multi-strategy with aggressive garbage detection ---
  // Helper: validate a title candidate
  const isValidTitle = (t: string | null | undefined): boolean => {
    if (!t || t.length < 3) return false;
    const trimmed = t.trim();
    if (trimmed.length < 3) return false;
    if (trimmed.startsWith("http") || trimmed.startsWith('"http')) return false;
    if (/^["']?https?:/i.test(trimmed)) return false;
    if (trimmed === "null" || trimmed === "undefined") return false;
    // Must have at least 1 word
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 1) return false;
    return true;
  };

  // Helper: extract quoted text from a snapshot line
  const extractQuotedText = (line: string): string | null => {
    const match = line.match(/"([^"]{3,200})"/);
    return match ? match[1].trim() : null;
  };

  let finalTitle = "";

  // Strategy 1: Use get title result (after cleaning)
  if (title) {
    const cleaned = title.trim().replace(/^["']+|["']+$/g, "");
    if (isValidTitle(cleaned)) {
      finalTitle = cleaned;
      console.error(`[DealSage] Title S1 (get title): "${finalTitle}"`);
    } else {
      console.error(
        `[DealSage] Title S1 rejected: "${cleaned.slice(0, 80)}" (len=${cleaned.length}, startsHttp=${cleaned.startsWith("http")})`,
      );
    }
  }

  // Strategy 2: Extract from interactive snapshot heading lines
  // Format: - heading "Product Name" [level=1, ref=eN]
  if (!finalTitle) {
    for (const line of snapshotLines) {
      // Match accessibility snapshot heading role
      if (/\bheading\b/i.test(line)) {
        const text = extractQuotedText(line);
        if (text && isValidTitle(text)) {
          finalTitle = text;
          console.error(`[DealSage] Title S2 (snapshot heading): "${finalTitle}"`);
          break;
        }
      }
    }
  }

  // Strategy 3: Use h1 text from get text "h1"
  if (!finalTitle && h1Text) {
    const cleaned = h1Text.trim();
    if (isValidTitle(cleaned)) {
      finalTitle = cleaned;
      console.error(`[DealSage] Title S3 (get text h1): "${finalTitle}"`);
    } else {
      console.error(
        `[DealSage] Title S3 rejected: "${cleaned.slice(0, 80)}"`,
      );
    }
  }

  // Strategy 4: Extract from non-interactive snapshot heading lines
  if (!finalTitle) {
    const pageTextLines = pageText.split("\n");
    for (const line of pageTextLines) {
      if (/\bheading\b/i.test(line)) {
        const text = extractQuotedText(line);
        if (text && isValidTitle(text)) {
          finalTitle = text;
          console.error(`[DealSage] Title S4 (page text heading): "${finalTitle}"`);
          break;
        }
      }
    }
  }

  // Strategy 5: First substantial quoted text from snapshot
  if (!finalTitle) {
    for (const line of snapshotLines) {
      const text = extractQuotedText(line);
      if (
        text &&
        text.length >= 8 &&
        !text.includes("http") &&
        !text.includes("menu") &&
        !text.includes("nav") &&
        !text.includes("cart") &&
        !text.includes("search") &&
        !text.includes("banner") &&
        text.split(/\s+/).length >= 2
      ) {
        finalTitle = text;
        console.error(`[DealSage] Title S5 (snapshot text fallback): "${finalTitle}"`);
        break;
      }
    }
  }

  // Strategy 6: Extract first sentence-like chunk from page text (non-interactive snapshot)
  if (!finalTitle) {
    // Look for StaticText or heading lines with meaningful content
    const pageTextLines = pageText.split("\n");
    for (const line of pageTextLines) {
      const text = extractQuotedText(line);
      if (
        text &&
        text.length >= 8 &&
        !text.includes("http") &&
        !text.includes("menu") &&
        !text.includes("nav") &&
        text.split(/\s+/).length >= 2
      ) {
        finalTitle = text;
        console.error(`[DealSage] Title S6 (page text fallback): "${finalTitle}"`);
        break;
      }
    }
  }

  // Strategy 7: Last resort — extract from document title by stripping site name suffix
  if (!finalTitle && title) {
    // Try splitting on common separators: " | ", " - ", " – ", " — "
    const cleaned = title.trim().replace(/^["']+|["']+$/g, "");
    for (const sep of [" | ", " - ", " – ", " — ", " |"]) {
      if (cleaned.includes(sep)) {
        const parts = cleaned.split(sep);
        // Take the first part that's reasonable
        for (const part of parts) {
          const candidate = part.trim();
          if (isValidTitle(candidate)) {
            finalTitle = candidate;
            console.error(`[DealSage] Title S7 (title split on "${sep}"): "${finalTitle}"`);
            break;
          }
        }
        if (finalTitle) break;
      }
    }
  }

  // Final fallback
  if (!finalTitle || finalTitle.length < 3) {
    finalTitle = "Unknown Product";
    console.error(`[DealSage] Title fallback: all strategies failed, using "Unknown Product"`);
  } else if (finalTitle.startsWith("http") || finalTitle.startsWith('"http')) {
    console.error(
      `[DealSage] Title WARNING: final title still looks like URL: "${finalTitle.slice(0, 80)}"`,
    );
    finalTitle = "Unknown Product";
  }

  // Final sanity: strip any remaining leading/trailing quotes
  finalTitle = finalTitle.replace(/^["']+|["']+$/g, "").trim();
  if (!finalTitle || finalTitle.length < 2) {
    finalTitle = "Unknown Product";
  }

  console.error(
    `[DealSage] Scrape result for ${url}: title="${finalTitle.slice(0, 60)}", price=${currentPrice}, rating=${rating}, reviews=${reviewCount}, textLen=${pageText.length}`,
  );

  return {
    title: finalTitle,
    currentPrice,
    wasPrice,
    currency,
    imageUrl,
    rating,
    reviewCount,
    retailer,
    reviews,
    source: "scraped",
    url,
    originalUrl: url,
    originalRetailer: retailer,
  };
}

// --- AI Analysis: fake discount detection ---

function analyzeFakeDiscount(
  currentPrice: number | null,
  wasPrice: number | null,
): FakeDiscountAnalysis {
  if (currentPrice === null || wasPrice === null || wasPrice <= currentPrice) {
    return {
      detected: false,
      severity: "none",
      explanation: 'No "was" price to compare.',
      discountPercent: null,
    };
  }

  const discountPercent = Math.round(
    ((wasPrice - currentPrice) / wasPrice) * 100,
  );

  // Heuristic: if the discount is more than 60%, it's suspicious
  if (discountPercent > 60) {
    return {
      detected: true,
      severity: "high",
      explanation: `The "was" price (${wasPrice}) is ${discountPercent}% higher than the current price (${currentPrice}). Discounts this large are rarely genuine and often indicate an inflated reference price.`,
      discountPercent,
    };
  }

  if (discountPercent > 40) {
    return {
      detected: true,
      severity: "medium",
      explanation: `The ${discountPercent}% discount looks aggressive. While possible during clearance sales, verify that the "was" price was the actual recent selling price — not an MSRP that was never charged.`,
      discountPercent,
    };
  }

  if (discountPercent > 25) {
    return {
      detected: true,
      severity: "low",
      explanation: `The ${discountPercent}% discount is reasonable but worth verifying. Check price history to confirm this is a real markdown.`,
      discountPercent,
    };
  }

  return {
    detected: false,
    severity: "none",
    explanation: `The ${discountPercent}% discount from $${wasPrice} to $${currentPrice} appears reasonable.`,
    discountPercent,
  };
}

// --- AI Analysis: review summary ---

function summarizeReviews(
  reviews: ReviewSample[],
  rating: number | null,
): ReviewSummary {
  if (reviews.length === 0) {
    return {
      pros: [],
      cons: [],
      commonComplaints: [],
      overallSentiment: rating !== null && rating >= 4 ? "positive" : "mixed",
    };
  }

  const avgReviewRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Simple keyword-based sentiment analysis
  const positiveKeywords = [
    "great",
    "good",
    "excellent",
    "love",
    "amazing",
    "best",
    "perfect",
    "nice",
    "recommend",
    "worth",
    "happy",
    "impressed",
    "fast",
    "quality",
    "easy",
    "beautiful",
    "comfortable",
    "solid",
    "reliable",
    "works",
  ];
  const negativeKeywords = [
    "bad",
    "poor",
    "terrible",
    "worst",
    "disappointed",
    "broke",
    "broken",
    "cheap",
    "damaged",
    "defective",
    "flimsy",
    "issue",
    "problem",
    "return",
    "waste",
    "difficult",
    "hard",
    "slow",
    "noisy",
    "overpriced",
  ];

  const pros: string[] = [];
  const cons: string[] = [];

  for (const review of reviews) {
    const lowerText = review.text.toLowerCase();
    if (review.rating >= 4) {
      for (const kw of positiveKeywords) {
        if (lowerText.includes(kw) && !pros.includes(kw)) {
          pros.push(kw.charAt(0).toUpperCase() + kw.slice(1));
        }
      }
    }
    if (review.rating <= 2) {
      for (const kw of negativeKeywords) {
        if (lowerText.includes(kw) && !cons.includes(kw)) {
          cons.push(kw.charAt(0).toUpperCase() + kw.slice(1));
        }
      }
    }
  }

  const commonComplaints = cons.slice(0, 5);
  const overallSentiment: "positive" | "mixed" | "negative" =
    avgReviewRating >= 3.8
      ? "positive"
      : avgReviewRating >= 2.5
        ? "mixed"
        : "negative";

  return {
    pros: pros.slice(0, 5),
    cons: cons.slice(0, 5),
    commonComplaints,
    overallSentiment,
  };
}

// --- Generate realistic demo data for when scraping fails ---

function generateDemoData(url: string): ScrapedProduct {
  const retailer = detectRetailer(url);
  const demoProducts: Record<string, Partial<ScrapedProduct>> = {
    Amazon: {
      title: "Wireless Noise-Cancelling Headphones (Demo)",
      currentPrice: 79.99,
      wasPrice: 199.99,
      currency: "USD",
      rating: 3.8,
      reviewCount: 1247,
      reviews: [
        {
          rating: 5,
          text: "Great sound quality for the price! Really comfortable for long listening sessions.",
        },
        {
          rating: 4,
          text: "Good headphones overall. Battery life is excellent, but the case feels a bit cheap.",
        },
        {
          rating: 1,
          text: "Stopped working after 3 weeks. Very disappointed with the build quality.",
        },
        {
          rating: 2,
          text: "Sound is decent but the noise cancelling barely works. Returned them.",
        },
        {
          rating: 4,
          text: "Good value for money. Not as good as premium brands but solid for everyday use.",
        },
      ],
    },
    eBay: {
      title: "Refurbished Tablet 10.2 inch (Demo)",
      currentPrice: 149.99,
      wasPrice: 299.99,
      currency: "USD",
      rating: 4.1,
      reviewCount: 89,
      reviews: [
        {
          rating: 5,
          text: "Looks brand new! Great refurbished buy.",
        },
        {
          rating: 3,
          text: "Minor scratches but works fine. Battery life is decent.",
        },
        {
          rating: 4,
          text: "Good tablet for the price. Fast shipping too.",
        },
      ],
    },
    Walmart: {
      title: "Stainless Steel Water Bottle 32oz (Demo)",
      currentPrice: 14.99,
      wasPrice: 24.99,
      currency: "USD",
      rating: 4.5,
      reviewCount: 3421,
      reviews: [
        {
          rating: 5,
          text: "Keeps drinks cold all day! Best water bottle I've owned.",
        },
        {
          rating: 4,
          text: "Great bottle. The lid could be better designed but overall very happy.",
        },
        {
          rating: 5,
          text: "Perfect size, doesn't leak, easy to clean. Highly recommend!",
        },
      ],
    },
  };

  const defaults: ScrapedProduct = {
    title: "Product Analysis (Demo Mode)",
    currentPrice: 49.99,
    wasPrice: 89.99,
    currency: "USD",
    imageUrl: null,
    rating: 4.0,
    reviewCount: 500,
    retailer,
    reviews: [
      {
        rating: 5,
        text: "Excellent product! Exceeded my expectations.",
      },
      {
        rating: 3,
        text: "It's okay for the price. Nothing special but gets the job done.",
      },
      {
        rating: 1,
        text: "Disappointed with the quality. Would not buy again.",
      },
    ],
    source: "demo",
    url,
    originalUrl: url,
    originalRetailer: retailer,
  };

  const demoData = demoProducts[retailer] || {};
  return { ...defaults, ...demoData, retailer, source: "demo" as const, url, originalUrl: url, originalRetailer: retailer };
}

// --- Generate comparison prices with affiliate links ---

function generateComparisonPrices(
  product: ScrapedProduct,
): ComparisonPrice[] {
  const retailer = product.retailer;
  const currentPrice = product.currentPrice ?? 49.99;
  const currency = product.currency;

  // Build a set of comparison retailers (exclude the original retailer)
  const allRetailers = ["Amazon", "eBay", "Walmart", "Best Buy", "Target"];
  const competitors = allRetailers.filter(
    (r) => r.toLowerCase() !== retailer.toLowerCase(),
  );

  // Generate mock pricing with realistic variance
  const listings: Omit<ComparisonPrice, "isBest">[] = [];

  // Always include the original retailer at the original price
  listings.push({
    retailer,
    price: currentPrice,
    currency,
    condition: "New",
    url: getAffiliateUrl(product.url, retailer),
  });

  // Generate competitor prices with small variations
  const variations: Array<{
    retailer: string;
    priceMult: number;
    condition: ComparisonPrice["condition"];
  }> = [];

  // First competitor: slightly cheaper (New)
  if (competitors.length > 0) {
    variations.push({
      retailer: competitors[0],
      priceMult: 0.92 + Math.random() * 0.06, // 92-98% of original
      condition: "New",
    });
  }

  // Second competitor: close to original, New
  if (competitors.length > 1) {
    variations.push({
      retailer: competitors[1],
      priceMult: 0.95 + Math.random() * 0.08, // 95-103%
      condition: "New",
    });
  }

  // Third competitor: eBay refurb
  variations.push({
    retailer: "eBay",
    priceMult: 0.55 + Math.random() * 0.2, // 55-75% of original
    condition: "Refurbished",
  });

  // Fourth competitor: Amazon used/refurb
  variations.push({
    retailer: "Amazon",
    priceMult: 0.65 + Math.random() * 0.15, // 65-80%
    condition: "Used",
  });

  // Fifth: Best Buy open box (if not already covered)
  if (!competitors.some((c) => c === "Best Buy")) {
    variations.push({
      retailer: "Best Buy",
      priceMult: 0.75 + Math.random() * 0.12, // 75-87%
      condition: "Open Box",
    });
  }

  // Generate mock URLs and add to listings
  const mockUrls: Record<string, string> = {
    Amazon: "https://www.amazon.com/dp/B0EXAMPLE1",
    eBay: "https://www.ebay.com/itm/123456789012",
    Walmart: "https://www.walmart.com/ip/product/12345678",
    "Best Buy": "https://www.bestbuy.com/site/product/6543210.p",
    Target: "https://www.target.com/p/product/-/A-12345678",
  };

  for (const v of variations) {
    // Deduplicate: skip if this retailer+condition combo already exists
    const exists = listings.some(
      (l) => l.retailer === v.retailer && l.condition === v.condition,
    );
    if (exists) continue;

    const baseUrl = mockUrls[v.retailer] || `https://www.${v.retailer.toLowerCase().replace(/\s+/g, "")}.com/product`;
    const price = Math.round(currentPrice * v.priceMult * 100) / 100;

    listings.push({
      retailer: v.retailer,
      price,
      currency,
      condition: v.condition,
      url: getAffiliateUrl(baseUrl, v.retailer),
    });
  }

  // Sort by price ascending, determine best deal
  listings.sort((a, b) => a.price - b.price);

  // Mark the best deal (lowest price)
  const result: ComparisonPrice[] = listings.map((l, i) => ({
    ...l,
    isBest: i === 0,
  }));

  // Limit to 6 results max
  return result.slice(0, 6);
}

// --- AI Price Prediction ---

export function predictPrice(
  product: ScrapedProduct,
  fakeDiscount: FakeDiscountAnalysis,
): PricePrediction {
  const price = product.currentPrice ?? 50;
  const wasPrice = product.wasPrice;
  const retailer = product.retailer;

  let score = 0;
  const factors: string[] = [];

  // Signal 1: Fake discount analysis
  switch (fakeDiscount.severity) {
    case "high":
      score -= 2;
      factors.push("Inflated reference price detected");
      break;
    case "medium":
      score -= 1;
      factors.push("Suspicious reference pricing");
      break;
    case "low":
      score -= 0.3;
      factors.push("Minor pricing discrepancy");
      break;
  }

  // Signal 2: Demand (rating + review count)
  const rating = product.rating;
  const reviewCount = product.reviewCount;
  if (rating !== null && reviewCount !== null) {
    if (rating >= 4.3 && reviewCount > 1000) {
      score += 2;
      factors.push("High demand product (top-rated, many reviews)");
    } else if (rating >= 4.0 && reviewCount > 500) {
      score += 1;
      factors.push("Solid demand (good rating, active reviews)");
    } else if (rating >= 4.0) {
      score += 0.5;
      factors.push("Positive buyer sentiment");
    } else if (rating < 3.5 && reviewCount > 100) {
      score -= 0.8;
      factors.push("Below-average ratings may push prices down");
    }
  }

  // Signal 3: Discount magnitude
  const discountPercent = fakeDiscount.discountPercent;
  if (discountPercent !== null) {
    if (discountPercent > 50) {
      score -= 1.5;
      factors.push("Deep discount — possible clearance pricing");
    } else if (discountPercent > 30) {
      score -= 0.5;
      factors.push("Moderate discount window");
    } else if (discountPercent < 10) {
      score += 0.5;
      factors.push("Near-full-price listing — stable pricing");
    }
  }

  // Signal 4: Retailer patterns
  const retailerLower = retailer.toLowerCase();
  if (retailerLower.includes("ebay")) {
    score -= 0.5;
    factors.push("eBay marketplace volatility");
  } else if (retailerLower.includes("amazon")) {
    score += 0.3;
    factors.push("Amazon typically has stable algorithmic pricing");
  } else if (retailerLower.includes("walmart")) {
    score += 0.2;
    factors.push("Walmart everyday-low-price model");
  } else if (retailerLower.includes("best buy")) {
    score += 0.4;
    factors.push("Best Buy price-match guarantees");
  }

  // Signal 5: Current vs was price spread (if available)
  if (wasPrice !== null && wasPrice > price && discountPercent !== null) {
    if (discountPercent > 60) {
      // Huge gap — likely clearance, price may drop further
      factors.push("60%+ price gap suggests clearance cycle");
    }
  }

  // Determine direction
  let direction: "up" | "down" | "stable";
  if (score > 1.2) {
    direction = "up";
  } else if (score < -1.2) {
    direction = "down";
  } else {
    direction = "stable";
  }

  // Calculate confidence: base 55 + up to 35 from signal strength
  const signalCount = factors.length;
  const absScore = Math.abs(score);
  let confidence = Math.round(55 + absScore * 6 + signalCount * 4);
  confidence = Math.min(95, Math.max(50, confidence));

  // Predicted change range
  let predictedChange: string;
  const changeAmount = Math.round(price * 0.08);
  if (direction === "up") {
    predictedChange = `+${changeAmount}-${changeAmount * 2}`;
  } else if (direction === "down") {
    predictedChange = `-${changeAmount}-${changeAmount * 2}`;
  } else {
    const stableAmount = Math.round(price * 0.03);
    predictedChange = `±${stableAmount}`;
  }

  // Reasoning
  let reasoning: string;
  if (direction === "up") {
    reasoning = `Based on strong buyer demand${rating !== null && rating >= 4 ? ` (${rating}/5 rating across ${(reviewCount ?? 0).toLocaleString()} reviews)` : ""} and ${retailer}'s pricing patterns, this product's price is likely to increase in the coming weeks. ${fakeDiscount.detected ? 'Despite a current promotional price, demand signals suggest an upward trend once the promotion ends.' : 'The current market conditions favor a price increase.'}`;
  } else if (direction === "down") {
    reasoning = `Multiple indicators suggest this product's price will decline. ${fakeDiscount.detected ? `The ${discountPercent}% "discount" appears inflated — the "was" price may not reflect true market value. ` : ""}${rating !== null && rating < 3.8 ? 'Below-average ratings are dampening demand, which typically leads to price drops. ' : ""}${retailerLower.includes("ebay") ? "eBay's competitive marketplace often sees prices drift downward over time. " : ""}Consider waiting for a better deal.`;
  } else {
    reasoning = `The price appears stable with no strong signals pointing up or down. ${fakeDiscount.detected ? `The ${discountPercent}% discount may not be as dramatic as advertised, but the current price is fair. ` : ""}${rating !== null && rating >= 4 ? 'Strong ratings keep demand steady, which supports stable pricing. ' : ""}If you need this product now, it's a reasonable time to buy.`;
  }

  // Recommendation
  let recommendation: "buy_now" | "wait" | "monitor";
  if (direction === "up") {
    recommendation = "buy_now";
  } else if (direction === "down" && confidence >= 65) {
    recommendation = "wait";
  } else {
    recommendation = "monitor";
  }

  return {
    direction,
    confidence,
    predictedChange,
    reasoning,
    recommendation,
    factors: factors.slice(0, 5),
  };
}

// --- Main server function ---

export const analyzeProduct = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (typeof data !== "object" || data === null || !("url" in data)) {
      throw new Error("url is required");
    }
    const url = (data as { url: string }).url;
    if (!url || typeof url !== "string" || url.length < 5) {
      throw new Error("Invalid URL");
    }
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }
    return { url };
  })
  .handler(async ({ data }) => {
    const { url } = data;

    // Try real scraping: SerpAPI → agent-browser → demo data
    let product: ScrapedProduct;
    let analysisNote: string;
    let comparisonPrices: ComparisonPrice[] = [];

    // Strategy 1: SerpAPI Google Shopping (best — real product + real comparison prices)
    const serpResult = await scrapeWithSerpAPI(url);

    if (serpResult && serpResult.product.currentPrice !== null) {
      product = serpResult.product;
      comparisonPrices = serpResult.comparisonPrices;
      analysisNote = "Live data via Google Shopping";
    } else if (serpResult && serpResult.product.title && serpResult.product.title !== "Unknown Product") {
      // SerpAPI found the product but couldn't get a price
      product = { ...serpResult.product, source: "scraped" };
      comparisonPrices = serpResult.comparisonPrices;
      analysisNote = "Product found via Google Shopping — price unavailable, using estimates";
    } else {
      // Strategy 2: agent-browser (fallback for when SerpAPI fails)
      const scraped = await scrapeWithAgentBrowser(url);

      if (scraped && scraped.currentPrice !== null) {
        product = scraped;
        analysisNote = "Live data";
      } else if (scraped && scraped.title && scraped.title !== "Unknown Product") {
        product = { ...scraped, source: "scraped" };
        analysisNote =
          "Price not found — showing estimated analysis based on the real product title. Some data may be estimated.";
      } else {
        // Strategy 3: Demo data (last resort)
        product = generateDemoData(url);
        analysisNote = "Demo mode — could not extract product data, showing sample data";
      }
    }

    // Run AI analysis
    const fakeDiscount = analyzeFakeDiscount(
      product.currentPrice,
      product.wasPrice,
    );
    const reviewSummary = summarizeReviews(product.reviews, product.rating);

    const cashback =
      product.currentPrice !== null
        ? calculateCashBack(product.currentPrice, product.retailer)
        : [];

    const coupons =
      product.currentPrice !== null
        ? findCoupons(product.retailer, product.currentPrice)
        : [];

    // Calculate stacked savings: best coupon + best cashback
    let stackedSavings: StackedSavings | null = null;
    if (product.currentPrice !== null && (coupons.length > 0 || cashback.length > 0)) {
      const bestCoupon = coupons.length > 0 ? coupons[0] : null;
      const bestCashback = cashback.length > 0 ? cashback[0] : null;

      const couponSavings = bestCoupon?.savings ?? 0;
      const cashbackAmount = bestCashback?.cashBackAmount ?? 0;
      const totalSavings = Math.round((couponSavings + cashbackAmount) * 100) / 100;
      const finalPrice = Math.round((product.currentPrice - totalSavings) * 100) / 100;

      stackedSavings = {
        bestCoupon: bestCoupon
          ? { code: bestCoupon.code, savings: bestCoupon.savings }
          : null,
        bestCashback: bestCashback
          ? { cardName: bestCashback.cardName, cashBackAmount: bestCashback.cashBackAmount }
          : null,
        totalSavings,
        finalPrice: Math.max(0, finalPrice),
      };
    }

    // Use SerpAPI comparison prices if available; otherwise generate from seed data
    if (comparisonPrices.length === 0) {
      comparisonPrices.push(...generateComparisonPrices(product));
    }
    const pricePrediction = predictPrice(product, fakeDiscount);

    const result: ProductAnalysis = {
      product,
      fakeDiscount,
      reviewSummary,
      cashback,
      coupons,
      stackedSavings,
      comparisonPrices,
      pricePrediction,
      analysisNote,
    };

    return result;
  });
