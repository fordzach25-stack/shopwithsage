import { createFileRoute, Link } from "@tanstack/react-router";
import { analyzeProduct } from "~/lib/analyzer";
import type { ProductAnalysis, CashBackResult, ComparisonPrice, PricePrediction } from "~/lib/analyzer";

export const Route = createFileRoute("/results")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: (search.url as string) || "",
  }),
  loaderDeps: ({ search }) => ({ url: search.url }),
  loader: async ({ deps }) => {
    if (!deps.url) {
      throw new Error("No product URL provided");
    }
    return analyzeProduct({ data: { url: deps.url } });
  },
  pendingComponent: LoadingResults,
  errorComponent: ErrorResults,
  component: ResultsPage,
});

function LoadingResults() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-teal-600 hover:text-teal-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="font-semibold">DealSage</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-teal-500" />
          <p className="text-lg text-gray-500">Analyzing product...</p>
          <p className="text-sm text-gray-400">Fetching price data and reviews</p>
        </div>
      </main>
    </div>
  );
}

function ErrorResults({ error }: { error: Error }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-teal-600 hover:text-teal-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="font-semibold">DealSage</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Analysis failed</h2>
          <p className="mt-2 text-gray-500">{error.message || "Could not analyze this product. Please try another URL."}</p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-600"
          >
            Try another product
          </Link>
        </div>
      </main>
    </div>
  );
}

function ResultsPage() {
  const analysis: ProductAnalysis = Route.useLoaderData();
  const { product, fakeDiscount, reviewSummary, cashback, coupons, stackedSavings, comparisonPrices, pricePrediction, analysisNote } = analysis;
  const bestComparison = comparisonPrices.find((cp) => cp.isBest);

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-teal-600 hover:text-teal-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="font-semibold">DealSage</span>
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← New search
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        {/* Analysis note */}
        {analysisNote && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-medium">Note:</span> {analysisNote}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column: Product info + Price analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product card */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
              <div className="flex flex-col gap-4 sm:flex-row">
                {product.imageUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="h-48 w-48 rounded-lg object-contain bg-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {product.retailer}
                    </span>
                    {product.source === "demo" && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Demo data
                      </span>
                    )}
                  </div>
                  <h1 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
                    {product.title}
                  </h1>

                  {/* Rating */}
                  {product.rating !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <Stars rating={product.rating} />
                      <span className="text-sm font-medium text-gray-700">
                        {product.rating.toFixed(1)}
                      </span>
                      {product.reviewCount !== null && (
                        <span className="text-sm text-gray-400">
                          ({product.reviewCount.toLocaleString()} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Buy Now CTA */}
                  <a
                    href={product.originalUrl}
                    target="_blank"
                    rel="nofollow noopener sponsored"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-600 hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.98] sm:w-auto sm:justify-start"
                  >
                    Buy on {product.originalRetailer}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7" />
                      <path d="M7 7h10v10" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
              <h2 className="text-lg font-semibold text-gray-900">
                Price Breakdown
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                  <p className="text-sm text-teal-600 font-medium">Current Price</p>
                  <p className="mt-1 text-3xl font-bold text-teal-700">
                    {product.currentPrice !== null
                      ? formatPrice(product.currentPrice, product.currency)
                      : "N/A"}
                  </p>
                  <p className="text-xs text-teal-500 mt-0.5">at {product.retailer}</p>
                  <a
                    href={product.originalUrl}
                    target="_blank"
                    rel="nofollow noopener sponsored"
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"
                  >
                    Buy Now
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7" />
                      <path d="M7 7h10v10" />
                    </svg>
                  </a>
                </div>
                {product.wasPrice !== null && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500 font-medium">Was Price</p>
                    <p className="mt-1 text-3xl font-bold text-gray-400 line-through">
                      {formatPrice(product.wasPrice, product.currency)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">reference price</p>
                  </div>
                )}
              </div>

              {/* Savings highlight */}
              {product.currentPrice !== null && product.wasPrice !== null && product.currentPrice < product.wasPrice && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-700">
                    You save {formatPrice(product.wasPrice - product.currentPrice, product.currency)} (
                    {fakeDiscount.discountPercent}% off)
                  </p>
                </div>
              )}
            </div>

            {/* Compare Prices */}
            {comparisonPrices.length > 0 && (
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Compare Prices
                  <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                    {comparisonPrices.length} options
                  </span>
                </h2>

                {/* Desktop table */}
                <div className="mt-4 hidden sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="pb-3 pr-4">Retailer</th>
                        <th className="pb-3 pr-4">Condition</th>
                        <th className="pb-3 pr-4 text-right">Price</th>
                        <th className="pb-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comparisonPrices.map((item) => (
                        <tr
                          key={`${item.retailer}-${item.condition}`}
                          className={`transition ${
                            item.isBest
                              ? "bg-teal-50/60"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {item.retailer}
                              </span>
                              {item.isBest && (
                                <span className="inline-flex items-center rounded-full bg-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700 leading-none">
                                  💰 Best deal
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <ConditionBadge condition={item.condition} />
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span
                              className={`font-semibold ${
                                item.isBest
                                  ? "text-teal-700 text-base"
                                  : "text-gray-900"
                              }`}
                            >
                              {formatPrice(item.price, item.currency)}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="nofollow noopener sponsored"
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                item.isBest
                                  ? "bg-teal-500 text-white shadow-sm shadow-teal-500/25 hover:bg-teal-600"
                                  : "border border-gray-300 bg-white text-gray-700 hover:border-teal-300 hover:text-teal-600"
                              }`}
                            >
                              {item.isBest ? "Buy Now" : "View"}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 17L17 7" />
                                <path d="M7 7h10v10" />
                              </svg>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="mt-4 space-y-3 sm:hidden">
                  {comparisonPrices.map((item) => (
                    <div
                      key={`${item.retailer}-${item.condition}`}
                      className={`rounded-lg border p-4 ${
                        item.isBest
                          ? "border-teal-300 bg-teal-50 ring-1 ring-teal-200"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {item.retailer}
                          </span>
                          {item.isBest && (
                            <span className="inline-flex items-center rounded-full bg-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700 leading-none">
                              💰 Best deal
                            </span>
                          )}
                        </div>
                        <ConditionBadge condition={item.condition} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={`text-xl font-bold ${
                            item.isBest ? "text-teal-700" : "text-gray-900"
                          }`}
                        >
                          {formatPrice(item.price, item.currency)}
                        </span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="nofollow noopener sponsored"
                          className={`inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            item.isBest
                              ? "bg-teal-500 text-white shadow-sm shadow-teal-500/25 hover:bg-teal-600"
                              : "border border-gray-300 bg-white text-gray-700 hover:border-teal-300 hover:text-teal-600"
                          }`}
                        >
                          {item.isBest ? "Buy Now" : "View"}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7" />
                            <path d="M7 7h10v10" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review summary */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
              <h2 className="text-lg font-semibold text-gray-900">
                Review Summary
              </h2>

              {reviewSummary.pros.length > 0 || reviewSummary.cons.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {reviewSummary.pros.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                      <h3 className="font-medium text-emerald-700 flex items-center gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Pros
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {reviewSummary.pros.map((pro, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-1 flex-shrink-0">•</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reviewSummary.cons.length > 0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
                      <h3 className="font-medium text-rose-700 flex items-center gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Cons
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {reviewSummary.cons.map((con, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                            <span className="text-rose-400 mt-1 flex-shrink-0">•</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Not enough review data to summarize themes.
                </p>
              )}

              {/* Overall sentiment */}
              {product.reviewCount !== null && product.reviewCount > 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Overall sentiment:</span>
                  <SentimentBadge sentiment={reviewSummary.overallSentiment} />
                </div>
              )}

              {/* Common complaints */}
              {reviewSummary.commonComplaints.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <h3 className="font-medium text-amber-700 flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Common Complaints
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {reviewSummary.commonComplaints.map((complaint, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                        <span className="text-amber-400 mt-1 flex-shrink-0">•</span>
                        {complaint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sample reviews */}
            {product.reviews.length > 0 && (
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
                <h2 className="text-lg font-semibold text-gray-900">
                  Sample Reviews
                </h2>
                <div className="mt-4 space-y-3">
                  {product.reviews.map((review, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <Stars rating={review.rating} small />
                        <span className="text-sm font-medium text-gray-600">
                          {review.rating}/5
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                        "{review.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Warnings + Quick info */}
          <div className="space-y-6">
            {/* Fake discount warning */}
            {fakeDiscount.detected ? (
              <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-rose-800">
                      Fake Discount Detected
                    </h3>
                    <SeverityBadge severity={fakeDiscount.severity} />
                    <p className="mt-2 text-sm text-rose-700 leading-relaxed">
                      {fakeDiscount.explanation}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-800">
                      Pricing Looks Legit
                    </h3>
                    <p className="mt-1 text-sm text-emerald-700 leading-relaxed">
                      {fakeDiscount.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cash Back Rewards */}
            {cashback.length > 0 && (
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Cash Back Rewards</h3>
                </div>

                <div className="space-y-2">
                  {cashback.map((card, i) => {
                    const isBest = i === 0;
                    return (
                      <div
                        key={card.cardName}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                          isBest
                            ? "border-teal-300 bg-teal-50 ring-1 ring-teal-200"
                            : "border-gray-100 bg-gray-50/50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`font-medium truncate ${
                                isBest ? "text-teal-800" : "text-gray-700"
                              }`}
                            >
                              {card.cardName}
                            </p>
                            {isBest && (
                              <span className="inline-flex items-center rounded-full bg-teal-200 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 leading-none">
                                BEST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-xs ${
                                card.isCategoryRate
                                  ? "text-teal-600 font-medium"
                                  : "text-gray-400"
                              }`}
                            >
                              {(card.rate * 100).toFixed(1)}%
                              {card.isCategoryRate && " (bonus)"}
                            </span>
                            {card.annualFee > 0 && (
                              <span className="text-xs text-amber-600">
                                ${card.annualFee}/yr fee
                              </span>
                            )}
                            {card.annualFee === 0 && (
                              <span className="text-xs text-gray-400">No fee</span>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 flex-shrink-0 text-right">
                          <p
                            className={`font-bold ${
                              isBest ? "text-teal-700 text-base" : "text-gray-800"
                            }`}
                          >
                            ${card.cashBackAmount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-gray-400">cash back</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs text-teal-700">
                  <span className="font-semibold">Best pick:</span>{" "}
                  {cashback[0].cardName} earns you{" "}
                  <span className="font-bold">${cashback[0].cashBackAmount.toFixed(2)}</span>{" "}
                  on this purchase
                  {cashback[0].annualFee === 0 && " with no annual fee"}.
                </div>

                <a
                  href="https://buy.stripe.com/5kQbJ1bMyckkeBi95VbfO00"
                  target="_blank"
                  rel="noopener"
                  className="mt-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-purple-500 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition hover:from-teal-600 hover:to-purple-600 hover:shadow-md"
                >
                  <span className="flex-1">🔒 Track cashback across all your purchases</span>
                  <span className="font-bold whitespace-nowrap">Upgrade to Premium →</span>
                </a>
              </div>
            )}

            {/* Coupons & Savings */}
            {coupons.length > 0 && (
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  💸 Coupons &amp; Savings
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 mb-3">
                  Available codes for {product.retailer}
                </p>

                <div className="space-y-2">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.code}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-teal-100 px-1.5 py-0.5 text-xs font-bold text-teal-700">
                            {coupon.code}
                          </code>
                          <span className="text-gray-600 text-xs">
                            {coupon.description}
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-teal-600">
                          -{formatPrice(coupon.savings, product.currency)}
                        </span>
                        <CopyButton code={coupon.code} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stack Your Savings summary */}
                {stackedSavings && (
                  <>
                  <div className="mt-4 rounded-lg border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
                    <h4 className="text-sm font-bold text-teal-800 flex items-center gap-1.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      Stack Your Savings
                    </h4>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      {stackedSavings.bestCoupon && (
                        <div className="flex justify-between">
                          <dt className="text-teal-700">
                            Best coupon
                          </dt>
                          <dd className="font-semibold text-teal-800">
                            -{formatPrice(stackedSavings.bestCoupon.savings, product.currency)} with{" "}
                            <code className="rounded bg-teal-100 px-1 text-xs font-bold text-teal-700">
                              {stackedSavings.bestCoupon.code}
                            </code>
                          </dd>
                        </div>
                      )}
                      {stackedSavings.bestCashback && (
                        <div className="flex justify-between">
                          <dt className="text-teal-700">
                            Best cashback
                          </dt>
                          <dd className="font-semibold text-teal-800">
                            -{formatPrice(stackedSavings.bestCashback.cashBackAmount, product.currency)} with{" "}
                            {stackedSavings.bestCashback.cardName}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-teal-200 pt-1.5 mt-1.5">
                        <dt className="font-semibold text-teal-800">Total savings</dt>
                        <dd className="font-bold text-teal-800 text-base">
                          -{formatPrice(stackedSavings.totalSavings, product.currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between rounded-md bg-white/70 px-3 py-2 mt-2">
                        <dt className="font-bold text-teal-900">You'd pay just</dt>
                        <dd className="font-extrabold text-teal-700 text-lg">
                          {formatPrice(stackedSavings.finalPrice, product.currency)}
                        </dd>
                      </div>
                    </dl>
                  </div>


                  {bestComparison && (
                    <a
                      href={bestComparison.url}
                      target="_blank"
                      rel="nofollow noopener sponsored"
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-500/25 transition hover:from-teal-600 hover:to-emerald-600 hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.98]"
                    >
                      Get This Deal
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7" />
                        <path d="M7 7h10v10" />
                      </svg>
                    </a>
                  )}
                </>
                )}

                {/* Premium CTA */}
                <a
                  href="https://buy.stripe.com/5kQbJ1bMyckkeBi95VbfO00"
                  target="_blank"
                  rel="noopener"
                  className="mt-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-purple-500 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition hover:from-teal-600 hover:to-purple-600 hover:shadow-md"
                >
                  <span className="flex-1">🔒 Unlock automatic coupon discovery and more</span>
                  <span className="font-bold whitespace-nowrap">Upgrade to Premium →</span>
                </a>
              </div>
            )}

            {/* DealSage Premium Card */}
            <div className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 p-5 text-white shadow-lg shadow-teal-500/25 ring-1 ring-teal-400/30">
              <h3 className="text-lg font-bold">DealSage Premium</h3>
              <p className="mt-1 text-2xl font-extrabold">$7.99<span className="text-sm font-normal text-teal-100">/month</span></p>
              <ul className="mt-4 space-y-2 text-sm text-teal-50">
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  AI Price Predictions
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Price-Drop Alerts
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Unlimited Coupons
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Warranty Tracking
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Purchase History
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Personalized Shopping AI
                </li>
              </ul>
              <a
                href="https://buy.stripe.com/5kQbJ1bMyckkeBi95VbfO00"
                target="_blank"
                rel="noopener"
                className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-teal-600 shadow-sm transition hover:bg-teal-50 hover:shadow-md"
              >
                Upgrade Now
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Premium Feature: Price History */}
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Price History</h3>
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                  Premium
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Available with DealSage Premium — track price trends and get the best time to buy.
              </p>
              <a
                href="https://buy.stripe.com/5kQbJ1bMyckkeBi95VbfO00"
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-600 transition hover:bg-teal-100"
              >
                Upgrade to Premium →
              </a>
            </div>

            {/* AI Price Prediction */}
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200/60 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">AI Price Prediction</h3>
                  <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                    AI Analysis
                  </span>
                </div>

                {/* Direction icon + headline */}
                <div className="mt-4 flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${
                      pricePrediction.direction === "up"
                        ? "bg-green-100"
                        : pricePrediction.direction === "down"
                          ? "bg-red-100"
                          : "bg-amber-100"
                    }`}
                  >
                    <PredictionArrow direction={pricePrediction.direction} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 leading-tight">
                      AI predicts prices will{" "}
                      <span
                        className={
                          pricePrediction.direction === "up"
                            ? "text-green-600"
                            : pricePrediction.direction === "down"
                              ? "text-red-600"
                              : "text-amber-600"
                        }
                      >
                        {pricePrediction.direction === "up"
                          ? "rise"
                          : pricePrediction.direction === "down"
                            ? "fall"
                            : "hold steady"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Expected change:{" "}
                      <span className="font-semibold text-gray-700">
                        {formatPredictedChange(pricePrediction.predictedChange, product.currency)}
                      </span>{" "}
                      over the next 30 days
                    </p>
                  </div>
                </div>

                {/* Confidence meter */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Confidence</span>
                    <span className="font-medium">{pricePrediction.confidence}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pricePrediction.direction === "up"
                          ? "bg-green-500"
                          : pricePrediction.direction === "down"
                            ? "bg-red-500"
                            : "bg-amber-500"
                      }`}
                      style={{ width: `${pricePrediction.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Recommendation badge */}
                <div className="mt-4">
                  <RecommendationBadge recommendation={pricePrediction.recommendation} />
                </div>

                {/* Reasoning (partially gated by premium blur) */}
                <div className="mt-4 relative">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {pricePrediction.reasoning}
                    </p>

                    {/* Factors pills */}
                    {pricePrediction.factors.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {pricePrediction.factors.map((factor, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Premium blur overlay on detailed breakdown */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/60 backdrop-blur-[3px]">
                    <div className="text-center px-4">
                      <span className="text-2xl">🔒</span>
                      <p className="mt-1 text-sm font-semibold text-gray-700">
                        Full analysis is a Premium feature
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 max-w-[220px]">
                        Upgrade to see detailed predictions, price history, and personalized alerts
                      </p>
                      <a
                        href="https://buy.stripe.com/5kQbJ1bMyckkeBi95VbfO00"
                        target="_blank"
                        rel="noopener"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-purple-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-purple-600 hover:shadow-md"
                      >
                        Upgrade to Premium
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom CTA bar */}
              <div className="border-t border-gray-100 bg-gradient-to-r from-teal-50 to-purple-50 px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-teal-700">Premium:</span> price-drop alerts, history charts, coupon stacking &amp; more
                  </p>
                  <a
                    href="https://buy.stripe.com/5kQbJ1bMyckkeBi95VbfO00"
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-teal-600 transition hover:text-teal-700"
                  >
                    $7.99/mo →
                  </a>
                </div>
              </div>
            </div>

            {/* Premium Feature: Warranty */}
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Warranty Tracking</h3>
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                  Premium
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Available with DealSage Premium — never miss a warranty deadline with automatic reminders and claim assistance.
              </p>
              <a
                href="https://buy.stripe.com/5kQbJ1bMyckkeBi95VbfO00"
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-600 transition hover:bg-teal-100"
              >
                Upgrade to Premium →
              </a>
            </div>

            {/* Quick info */}
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60">
              <h3 className="font-semibold text-gray-900">Product Info</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Retailer</dt>
                  <dd className="font-medium text-gray-900">{product.retailer}</dd>
                </div>
                {product.rating !== null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Rating</dt>
                    <dd className="font-medium text-gray-900">{product.rating}/5</dd>
                  </div>
                )}
                {product.reviewCount !== null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Reviews</dt>
                    <dd className="font-medium text-gray-900">{product.reviewCount.toLocaleString()}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Data source</dt>
                  <dd className="font-medium text-gray-900 capitalize">{product.source}</dd>
                </div>
              </dl>
            </div>

            {/* CTA */}
            <div className="rounded-xl bg-teal-500 p-5 text-center shadow-lg shadow-teal-500/25">
              <p className="text-sm font-medium text-teal-100">Want more?</p>
              <p className="mt-1 text-white font-semibold">
                Paste another link to compare prices
              </p>
              <Link
                to="/"
                className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-teal-600 transition hover:bg-teal-50"
              >
                Analyze another product
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white px-6 py-6 text-center">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} DealSage. Built with{" "}
          <a href="https://cto.new" className="underline hover:text-gray-600">
            cto.new
          </a>
        </p>
        <p className="mt-2 text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
          DealSage may earn a commission on purchases made through these links.
          This does not affect the price you pay.
        </p>
      </footer>
    </div>
  );
}

// --- Helper components ---

function Stars({ rating, small }: { rating: number; small?: boolean }) {
  const size = small ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${size} ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "mixed" | "negative" }) {
  const colors = {
    positive: "bg-emerald-100 text-emerald-700",
    mixed: "bg-amber-100 text-amber-700",
    negative: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[sentiment]}`}>
      {sentiment}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: "none" | "low" | "medium" | "high" }) {
  if (severity === "none") return null;
  const colors = {
    low: "bg-amber-100 text-amber-700",
    medium: "bg-orange-100 text-orange-700",
    high: "bg-red-100 text-red-700",
  };
  return (
    <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[severity]}`}>
      {severity} risk
    </span>
  );
}

function CopyButton({ code }: { code: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(code).catch(() => {});
        const btn = e.currentTarget;
        const origHTML = btn.innerHTML;
        btn.innerHTML = "✓";
        btn.classList.add("!bg-emerald-100", "!text-emerald-700");
        setTimeout(() => {
          btn.innerHTML = origHTML;
          btn.classList.remove("!bg-emerald-100", "!text-emerald-700");
        }, 1500);
      }}
      className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 transition hover:border-teal-300 hover:text-teal-600 active:scale-95"
      title="Copy coupon code"
    >
      📋 Copy
    </button>
  );
}

function ConditionBadge({ condition }: { condition: ComparisonPrice["condition"] }) {
  const colors: Record<string, string> = {
    New: "bg-emerald-100 text-emerald-700",
    Refurbished: "bg-sky-100 text-sky-700",
    Used: "bg-amber-100 text-amber-700",
    "Open Box": "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[condition] || "bg-gray-100 text-gray-600"}`}>
      {condition}
    </span>
  );
}

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    JPY: "¥",
  };
  const symbol = symbols[currency] || "$";
  return `${symbol}${price.toFixed(2)}`;
}

function formatPredictedChange(change: string, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    JPY: "¥",
  };
  const symbol = symbols[currency] || "$";
  // change is like "+8-16", "-8-16", or "±2"
  if (change.startsWith("+")) {
    return `${symbol}${change.slice(1)}`;
  } else if (change.startsWith("-")) {
    return `-${symbol}${change.slice(1)}`;
  }
  // "±X"
  return `${symbol}${change}`;
}

function PredictionArrow({ direction }: { direction: PricePrediction["direction"] }) {
  if (direction === "up") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    );
  }
  if (direction === "down") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function RecommendationBadge({ recommendation }: { recommendation: PricePrediction["recommendation"] }) {
  if (recommendation === "buy_now") {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm">🟢</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Buy now</p>
          <p className="text-xs text-emerald-600">Unlikely to drop further</p>
        </div>
      </div>
    );
  }
  if (recommendation === "wait") {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm">🔴</span>
        <div>
          <p className="text-sm font-semibold text-red-800">Wait</p>
          <p className="text-xs text-red-600">Expect lower prices</p>
        </div>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm">🟡</span>
      <div>
        <p className="text-sm font-semibold text-amber-800">Monitor</p>
        <p className="text-xs text-amber-600">May drop soon</p>
      </div>
    </div>
  );
}
