# Capital Flows Macro Dashboard

[![Validate Dashboard](https://github.com/arjun7965/Capital-Flows-Dashboard/actions/workflows/validate.yml/badge.svg?branch=dev)](https://github.com/arjun7965/Capital-Flows-Dashboard/actions/workflows/validate.yml?query=branch%3Adev)

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

- **⚡ Regime Check** — 6-question diagnostic that maps current conditions to a macro regime, shows tied leaders as a mixed/transition state, and overlays a plumbing/funding-stress rating with tail-hedge recommendations
- **📋 Cheat Sheet** — Condensed reference: regime→asset map, indicator thresholds, cross-asset rules, duration vs credit twin pillar map, 11-point pre-trade checklist

### Live data strip

Persistent bar at the top showing:

```
10Y · 3M T-bill · 3M10s spread · VIX · DXY · SOFR · SOFR−EFFR basis
```

- **10Y, 3M, VIX, SOFR, EFFR** → [FRED](https://fred.stlouisfed.org) (St. Louis Fed), fetched server-side through the same-origin market-data endpoint
- **DXY** → computed server-side from ECB reference rates via [Frankfurter API](https://api.frankfurter.dev/) using the exact ICE DXY formula (matches TradingView within ~0.06)
- **3M10s and SOFR−EFFR basis** → derived by the market-data endpoint and color-thresholded in the browser

All data updates daily (D-1 lag). Each field displays its observation date, so weekend values are clearly identified as the latest business-day data. No API keys or auth are required.

---

## How to use

### Hosted version

**👉 [capital-flows-primer.netlify.app](https://capital-flows-primer.netlify.app/)** — works on any device with a modern browser. Live data updates daily.

### Local version

The HTML file is fully self-contained. Clone the repo and either:

**Open directly** — works for everything except the live data strip (browsers block `fetch()` from `file://`).

**Run the dependency-free local server** for the full live data experience:

```bash
cd Capital-Flows-Dashboard
node scripts/serve_dashboard.mjs
# then open http://127.0.0.1:8080/
```

The local server exposes the same `/api/market-data` contract used by Netlify. A basic `python -m http.server 8080` still serves the dashboard, but live data then falls back to the deployed Netlify endpoint.

---

## Project structure

```
Capital-Flows-Dashboard/
├── capital_flows_dashboard.html         # The dashboard (~242KB, single file)
├── capital_flows_dashboard_backup_v1.html  # Pre-enhancement snapshot
├── netlify/functions/                   # Same-origin FRED/Frankfurter adapter
├── scripts/                             # Validator, local server, and data tests
├── tests/                               # Playwright browser smoke tests
├── playwright.config.mjs                # Desktop/mobile browser test configuration
├── CLAUDE.md                            # Project docs, data architecture, conventions
├── TODO.md                              # Prioritized implementation backlog
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

Exits 0 on success, 1 on any failure. The market-data adapter and Regime Check engine also have dependency-free Node tests:

```bash
npm test
```

The Regime Check suite exhaustively covers all 1,280 scoring-input combinations. Tied leaders receive 0% separation confidence and render a conditional mixed/transition playbook instead of resolving by object order.

The same script runs automatically via:
- **GitHub Action** ([`.github/workflows/validate.yml`](.github/workflows/validate.yml)) on every push and PR — failing checks show a red ✗ on the commit in GitHub
- **Netlify build** ([`netlify.toml`](netlify.toml)) on every deploy — failing checks abort the deploy, previous version stays live

Install the browser-test dependency and run the responsive smoke suite:

```bash
npm install
npm run test:browser
```

The Playwright suite checks all ten tabs at 320px, 390px, 768px, and desktop widths, submits the Regime Check, and fails on page errors, failed requests, non-2xx responses, or page-level horizontal overflow.

If you add a new section, new CSS variable, or new data source, the validator will likely need a small update. See the inline comments in `scripts/validate_dashboard.py`.

## Tech notes

- **Single dashboard HTML file** — all dashboard CSS, JavaScript, and content remain inline.
- **Same-origin data architecture** — Netlify Function in production; dependency-free Node server locally.
- **Browser support** — requires modern browser (Chrome / Edge / Firefox / Safari recent versions). Uses `fetch`, `Promise.allSettled`, CSS variables, `prefers-color-scheme`.
- **Mobile** — responsive from 320px; wide tables scroll locally with a touch affordance, while grids and tactical rules stack on narrow screens.

---

## Privacy &amp; Data

When you load the hosted dashboard, your browser requests `/api/market-data` from the same Netlify origin. The serverless function then fetches public observations from **[FRED](https://fred.stlouisfed.org)** and **[Frankfurter](https://api.frankfurter.dev)**. The browser no longer calls anonymous CORS proxies.

The dashboard collects no analytics, sets no cookies, and sends no personal data to the market-data providers. No login or registration is involved.

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
