// --- Coupon & Cashback Stacking ---

export interface CouponResult {
  code: string;
  description: string;
  discountType: "percentage" | "flat" | "free-shipping";
  /** For percentage: e.g. 10 means 10%. For flat: dollar amount. For free-shipping: estimated shipping value. */
  value: number;
  /** Actual dollar savings for the given product price */
  savings: number;
}

interface CouponDef {
  code: string;
  description: string;
  discountType: "percentage" | "flat" | "free-shipping";
  value: number;
  /** Retailers this coupon applies to. Empty array = generic (all retailers). */
  retailers: string[];
  /** Minimum order amount for the coupon to apply (0 = no minimum) */
  minOrder: number;
}

const COUPON_DATASET: CouponDef[] = [
  // --- Amazon ---
  {
    code: "SAVE10NOW",
    description: "10% off your order",
    discountType: "percentage",
    value: 10,
    retailers: ["Amazon"],
    minOrder: 0,
  },
  {
    code: "FREESHIP",
    description: "Free shipping",
    discountType: "free-shipping",
    value: 5.99,
    retailers: ["Amazon"],
    minOrder: 0,
  },
  // --- Walmart ---
  {
    code: "WOWFRESH",
    description: "10% off eligible items",
    discountType: "percentage",
    value: 10,
    retailers: ["Walmart"],
    minOrder: 0,
  },
  {
    code: "SHIPFREE",
    description: "Free shipping on your order",
    discountType: "free-shipping",
    value: 5.99,
    retailers: ["Walmart"],
    minOrder: 0,
  },
  // --- Best Buy ---
  {
    code: "SAVE5",
    description: "$5 off orders $50+",
    discountType: "flat",
    value: 5,
    retailers: ["Best Buy"],
    minOrder: 50,
  },
  {
    code: "TECHTEN",
    description: "10% off tech & electronics",
    discountType: "percentage",
    value: 10,
    retailers: ["Best Buy"],
    minOrder: 0,
  },
  // --- eBay ---
  {
    code: "PERFECT5",
    description: "5% off your purchase",
    discountType: "percentage",
    value: 5,
    retailers: ["eBay"],
    minOrder: 0,
  },
  {
    code: "SHIPFREE",
    description: "Free shipping",
    discountType: "free-shipping",
    value: 5.99,
    retailers: ["eBay"],
    minOrder: 0,
  },
  // --- Generic (all retailers) ---
  {
    code: "WELCOME10",
    description: "10% off — first-time customers",
    discountType: "percentage",
    value: 10,
    retailers: [],
    minOrder: 0,
  },
];

/**
 * Find applicable coupon codes for a given retailer and product price.
 * Returns coupons sorted by savings (highest first).
 */
export function findCoupons(
  retailer: string,
  productPrice: number,
): CouponResult[] {
  const retailerLower = retailer.toLowerCase();

  const applicable = COUPON_DATASET.filter((c) => {
    // Check retailer match
    const retailerOk =
      c.retailers.length === 0 ||
      c.retailers.some((r) => r.toLowerCase() === retailerLower);
    if (!retailerOk) return false;

    // Check minimum order
    if (c.minOrder > 0 && productPrice < c.minOrder) return false;

    return true;
  });

  const results: CouponResult[] = applicable.map((c) => {
    let savings: number;
    switch (c.discountType) {
      case "percentage":
        savings = Math.round(productPrice * (c.value / 100) * 100) / 100;
        break;
      case "flat":
        savings = Math.min(c.value, productPrice); // Can't save more than price
        break;
      case "free-shipping":
        savings = Math.min(c.value, productPrice);
        break;
      default:
        savings = 0;
    }
    return {
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      value: c.value,
      savings,
    };
  });

  // Sort by savings descending
  results.sort((a, b) => b.savings - a.savings);

  return results;
}
