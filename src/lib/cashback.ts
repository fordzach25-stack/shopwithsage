// --- Credit Card Cash Back Data ---

export interface CreditCard {
  name: string;
  /** Base cash back rate as a decimal (e.g., 0.015 = 1.5%) */
  baseRate: number;
  /** Higher-tier rate for category-specific purchases (e.g., Amazon, online retail) */
  categoryRate: number | null;
  /** Description of what triggers the category rate */
  categoryLabel: string | null;
  /** Annual fee in USD */
  annualFee: number;
}

export interface CashBackResult {
  cardName: string;
  rate: number;
  cashBackAmount: number;
  annualFee: number;
  isCategoryRate: boolean;
}

const CARDS: CreditCard[] = [
  {
    name: "Amazon Prime Visa",
    baseRate: 0.01,
    categoryRate: 0.05,
    categoryLabel: "Amazon & Whole Foods",
    annualFee: 0,
  },
  {
    name: "Blue Cash Everyday (Amex)",
    baseRate: 0.01,
    categoryRate: 0.03,
    categoryLabel: "Online retail purchases",
    annualFee: 0,
  },
  {
    name: "Chase Freedom Unlimited",
    baseRate: 0.015,
    categoryRate: 0.05,
    categoryLabel: "Rotating quarterly categories",
    annualFee: 0,
  },
  {
    name: "Discover it Cash Back",
    baseRate: 0.01,
    categoryRate: 0.05,
    categoryLabel: "Rotating quarterly categories",
    annualFee: 0,
  },
  {
    name: "Citi Double Cash",
    baseRate: 0.02,
    categoryRate: null,
    categoryLabel: null,
    annualFee: 0,
  },
  {
    name: "Wells Fargo Active Cash",
    baseRate: 0.02,
    categoryRate: null,
    categoryLabel: null,
    annualFee: 0,
  },
  {
    name: "Apple Card",
    baseRate: 0.01,
    categoryRate: 0.02,
    categoryLabel: "Apple Pay purchases",
    annualFee: 0,
  },
  {
    name: "Capital One Quicksilver",
    baseRate: 0.015,
    categoryRate: null,
    categoryLabel: null,
    annualFee: 0,
  },
];

/**
 * Determine whether the retailer qualifies for category-rate benefits.
 * - Amazon Prime Visa: applies on "Amazon" retailer
 * - Blue Cash Everyday: applies on "online retail" (Amazon, eBay, Walmart, Target, Best Buy, etc.)
 * - Other category cards: for simplicity, also treat major online retailers as qualifying
 */
function qualifiesForCategoryRate(
  card: CreditCard,
  retailer: string,
): boolean {
  const retailerLower = retailer.toLowerCase();

  // Amazon Prime Visa: only Amazon
  if (card.name === "Amazon Prime Visa") {
    return retailerLower === "amazon";
  }

  // Blue Cash Everyday: online retail = major online retailers
  if (card.name === "Blue Cash Everyday (Amex)") {
    const onlineRetailers = [
      "amazon",
      "ebay",
      "walmart",
      "target",
      "best buy",
      "etsy",
      "aliexpress",
    ];
    return onlineRetailers.some((r) => retailerLower.includes(r));
  }

  // For rotating category cards (Chase Freedom Unlimited, Discover it),
  // we treat "Amazon" and "Walmart" as common rotating category examples
  // and assume online retail generally qualifies
  if (card.name === "Chase Freedom Unlimited" || card.name === "Discover it Cash Back") {
    const categoryRetailers = ["amazon", "walmart", "target"];
    return categoryRetailers.some((r) => retailerLower.includes(r));
  }

  // Apple Card: assume Apple Pay is usable at most online retailers
  if (card.name === "Apple Card") {
    const onlineRetailers = [
      "amazon",
      "ebay",
      "walmart",
      "target",
      "best buy",
      "etsy",
      "aliexpress",
    ];
    return onlineRetailers.some((r) => retailerLower.includes(r));
  }

  return false;
}

/**
 * Calculate cash back for each card given a product price and retailer.
 * Returns results sorted by cash back amount (highest first).
 */
export function calculateCashBack(
  productPrice: number,
  retailer: string,
): CashBackResult[] {
  const results: CashBackResult[] = CARDS.map((card) => {
    const useCategory =
      card.categoryRate !== null && qualifiesForCategoryRate(card, retailer);
    const rate = useCategory ? card.categoryRate! : card.baseRate;
    const cashBackAmount = Math.round(productPrice * rate * 100) / 100;

    return {
      cardName: card.name,
      rate,
      cashBackAmount,
      annualFee: card.annualFee,
      isCategoryRate: useCategory,
    };
  });

  // Sort by cash back amount descending
  results.sort((a, b) => b.cashBackAmount - a.cashBackAmount);

  return results;
}
