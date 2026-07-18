import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useState } from "react";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const handleAnalyze = (inputUrl: string) => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    navigate({ to: "/results", search: { url: trimmed } });
  };

  const handleKeyDown = (e: React.KeyboardEvent, inputUrl: string) => {
    if (e.key === "Enter") {
      handleAnalyze(inputUrl);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Hero */}
      <header className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        {/* Logo / Wordmark */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/25">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            {businessName || "DealSage"}
          </span>
        </div>

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Paste any product link.{" "}
          <span className="text-teal-500">Save money instantly.</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-gray-500">
          DealSage finds better prices, surfaces refurbished alternatives,
          summarizes reviews, and spots fake discounts — all from a single link.
        </p>

        {/* Input + Button */}
        <div className="mt-8 flex w-full max-w-md gap-2">
          <input
            type="url"
            placeholder="Paste a product link…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, url)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
          <button
            onClick={() => handleAnalyze(url)}
            className="rounded-lg bg-teal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-600 active:scale-95"
          >
            Analyze
          </button>
        </div>
      </header>

      {/* How It Works */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Paste",
                desc: "Drop in any product link from Amazon, eBay, Walmart, or your favorite store.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" />
                  </svg>
                ),
              },
              {
                step: "2",
                title: "Analyze",
                desc: "We scan prices across retailers, distill review themes, and flag suspicious discounts.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                ),
              },
              {
                step: "3",
                title: "Save",
                desc: "Buy at the best price, grab a refurbished deal, or dodge a bad product.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200/60"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  {item.icon}
                </div>
                <span className="mt-4 text-sm font-semibold uppercase tracking-wider text-teal-500">
                  Step {item.step}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Everything you need to shop smarter
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Better prices across retailers",
                desc: "See every price for the same product across Amazon, Walmart, eBay, and more — instantly.",
                color: "text-emerald-500",
                bg: "bg-emerald-50",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
              },
              {
                title: "Refurbished & used alternatives",
                desc: "Get the same product for less with trusted refurbished and open-box listings you might have missed.",
                color: "text-sky-500",
                bg: "bg-sky-50",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 3l-4 4" />
                  </svg>
                ),
              },
              {
                title: "Review theme summaries",
                desc: "We read the reviews so you don't have to. Get a quick rundown of pros, cons, and common complaints.",
                color: "text-amber-500",
                bg: "bg-amber-50",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                ),
              },
              {
                title: "Fake discount detection",
                desc: "We flag inflated 'was' prices and other pricing tricks so you never fall for a fake sale again.",
                color: "text-rose-500",
                bg: "bg-rose-50",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ),
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 rounded-xl border border-gray-200 p-6 transition hover:border-teal-200 hover:shadow-md"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${feature.bg} ${feature.color}`}
                >
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-teal-500 px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Ready to stop overpaying?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-teal-100">
          Paste a link and see how much you could save. No account required.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <input
            type="url"
            placeholder="Paste a product link…"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, ctaUrl)}
            className="w-full max-w-sm rounded-lg border border-teal-400 bg-teal-600 px-4 py-3 text-white placeholder-teal-300 shadow-sm transition focus:border-white focus:ring-2 focus:ring-white/30 focus:outline-none"
          />
          <button
            onClick={() => handleAnalyze(ctaUrl)}
            className="rounded-lg bg-white px-6 py-3 font-semibold text-teal-600 shadow-lg transition hover:bg-teal-50 active:scale-95"
          >
            Analyze
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white px-6 py-8 text-center">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} {businessName || "DealSage"}. Built with{" "}
          <a
            href="https://cto.new"
            className="underline hover:text-gray-600"
          >
            cto.new
          </a>
        </p>
      </footer>
    </div>
  );
}
