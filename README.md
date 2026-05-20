# Capital Flows Macro Dashboard

**🌐 Live: [capital-flows-primer.netlify.app](https://capital-flows-primer.netlify.app/)**

An interactive, single-file HTML dashboard that synthesizes the **macroeconomic primers published by [Capital Flows Research](https://www.capitalflowsresearch.com/)** into one navigable reference. Designed as a personal study tool for understanding global capital flows, interest rates, FX dynamics, the credit cycle, and how they all interact with equity markets.

> **All concepts, frameworks, and insights in this dashboard are credited to [Capital Flows Research](https://www.capitalflowsresearch.com/). Read the source primers at [capitalflowsresearch.com/p/research-synthesis-direction-of-capital](https://www.capitalflowsresearch.com/p/research-synthesis-direction-of-capital).** This project is a personal synthesis for study purposes only — no affiliation.

---

## What's inside

### 8 primer tabs

| Tab | Coverage |
|---|---|
| **Macro Regime** | 4-quadrant matrix (Goldilocks / Overheat / Stagflation / Recession), regime transition signals, factor rotation |
| **Global Liquidity** | Central bank balance sheets, USD recycling loop, credit & liquidity cycle phases, duration vs credit risk twin pillars, central-bank-loses-control tail scenarios |
| **Interest Rates** | Yield curve regimes, Fed policy cycle stages, duration risk, STIR markets explainer, SOFR–EFFR basis card, deep-link to CME FedWatch |
| **FX & Inflation** | 5-phase inflation cycle, carry trade mechanics, stock-bond correlation regime shift, inflation hedging assets |
| **Equities & Credit** | Sector rotation by regime, factor & style rotation, market breadth & concentration, dealer gamma & vol structure, path-dependent asset-liability framework, reflexivity |
| **Bitcoin** | Real-rates correlation, ETF flows, risk-curve position, cross-asset lead/lag (MSTR/COIN/CME), tactical IF–THEN decision rules |
| **Consumer** | PIH + Life-Cycle Hypothesis, household balance sheet composition, K-shaped consumer divergence, consumption as transmission mechanism, historical case studies (2008 / COVID / 1970s) |
| **Thesis Checklist** | First-principles & Popper-style falsifiable thesis framework, multi-timeframe integration, worked examples (rates / equities / commodities), risk-premium vs knowledge-based investing |

### 2 tool tabs

- **⚡ Regime Check** — 6-question diagnostic that maps current conditions to a macro regime and overlays a plumbing/funding-stress rating with tail-hedge recommendations
- **📋 Cheat Sheet** — Condensed reference: regime→asset map, indicator thresholds, cross-asset rules, duration vs credit twin pillar map, 11-point pre-trade checklist

### Live data strip

Persistent bar at the top showing:

```
10Y · 3M T-bill · 3M10s spread · VIX · DXY · SOFR · SOFR−EFFR basis
```

- **10Y, 3M, VIX, SOFR, EFFR** → [FRED](https://fred.stlouisfed.org) (St. Louis Fed) via the free `api.codetabs.com` CORS proxy
- **DXY** → computed from ECB reference rates via [Frankfurter API](https://api.frankfurter.dev/) using the exact ICE DXY formula (matches TradingView within ~0.06)
- **SOFR−EFFR basis** → derived client-side; color-thresholded as a funding-stress signal

All data updates daily (D-1 lag). The DXY field uses today's ECB fixing. No API keys, no auth.

---

## How to use

### Hosted version

**👉 [capital-flows-primer.netlify.app](https://capital-flows-primer.netlify.app/)** — works on any device with a modern browser. Live data updates daily.

### Local version

The HTML file is fully self-contained. Clone the repo and either:

**Open directly** — works for everything except the live data strip (browsers block `fetch()` from `file://`).

**Run a local HTTP server** for the full live data experience:

```bash
cd Capital-Flows-Dashboard
python -m http.server 8080
# then open http://localhost:8080/capital_flows_dashboard.html
```

That's it. No build step, no dependencies to install.

---

## Project structure

```
Capital-Flows-Dashboard/
├── capital_flows_dashboard.html         # The dashboard (~242KB, single file)
├── capital_flows_dashboard_backup_v1.html  # Pre-enhancement snapshot
├── CLAUDE.md                            # Project docs, data architecture, conventions
├── README.md                            # This file
├── LICENSE                              # Apache 2.0
└── .gitignore                           # Excludes PDFs (copyright), patch artifacts, agent state
```

The primer PDFs themselves are **not** committed — they're copyrighted Capital Flows Research subscription content. The dashboard only contains a personal synthesis of the concepts.

---

## Development

### Validate structural integrity before pushing

A Python script catches the bug classes that have actually hit this project (orphan content, undefined CSS variables, broken JS references, missing data-source URLs, etc.):

```bash
python scripts/validate_dashboard.py
```

Exits 0 on success, 1 on any failure. **No third-party dependencies** — Python 3.x stdlib only.

The same script runs automatically via:
- **GitHub Action** ([`.github/workflows/validate.yml`](.github/workflows/validate.yml)) on every push and PR — failing checks show a red ✗ on the commit in GitHub
- **Netlify build** ([`netlify.toml`](netlify.toml)) on every deploy — failing checks abort the deploy, previous version stays live

If you add a new section, new CSS variable, or new data source, the validator will likely need a small update. See the inline comments in `scripts/validate_dashboard.py`.

## Tech notes

- **Single HTML file** — all CSS, JavaScript, and content inline. No build process, no dependencies, no framework.
- **CORS-friendly data architecture** — works from any HTTP origin without backend
- **Browser support** — requires modern browser (Chrome / Edge / Firefox / Safari recent versions). Uses `fetch`, `Promise.allSettled`, CSS variables, `prefers-color-scheme`.
- **Mobile** — desktop-optimized; tables and grid-4 layouts don't reflow well to phones

---

## Privacy &amp; Data

When you load the dashboard, your browser makes anonymous requests to a few public services to fetch live market data:

- **[FRED](https://fred.stlouisfed.org)** (St. Louis Fed) — via the public CORS proxies **[api.codetabs.com](https://api.codetabs.com)** (primary) and **[api.allorigins.win](https://api.allorigins.win)** (fallback) — for Treasury yields, VIX, and SOFR/EFFR overnight rates
- **[Frankfurter](https://api.frankfurter.dev)** — for ECB reference FX rates used to compute the ICE DXY

The dashboard itself collects no analytics, sets no cookies, and never sends any personal data to anyone. The third-party services above could in principle log your IP plus the public market-data URL requested — same as visiting any site that calls public APIs. No login or registration is involved.

## Disclaimer

This is a personal study tool for understanding macro concepts. **It is not investment advice.** Asset suggestions, regime mappings, and tactical rules are summarized from published research and should not be acted on without independent analysis. All views and frameworks belong to [Capital Flows Research](https://www.capitalflowsresearch.com/); any synthesis errors are mine.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

The dashboard code is freely usable under that license. The underlying intellectual content (frameworks, regime models, analysis) belongs to [Capital Flows Research](https://www.capitalflowsresearch.com/) and is reproduced here for personal educational use only.

---

## Credits

- **All content and frameworks**: [Capital Flows Research](https://www.capitalflowsresearch.com/) — read the source primers at [capitalflowsresearch.com/p/research-synthesis-direction-of-capital](https://www.capitalflowsresearch.com/p/research-synthesis-direction-of-capital)
- **Live data**: [FRED](https://fred.stlouisfed.org) (St. Louis Fed), [Frankfurter](https://www.frankfurter.dev/) (ECB rates), [CME FedWatch](https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html)
- **CORS proxy**: [codetabs.com](https://api.codetabs.com)
