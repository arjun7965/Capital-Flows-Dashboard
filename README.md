# Capital Flows Macro Dashboard

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

(If deployed) Open the Netlify URL — works on any device with a modern browser.

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

## Tech notes

- **Single HTML file** — all CSS, JavaScript, and content inline. No build process, no dependencies, no framework.
- **CORS-friendly data architecture** — works from any HTTP origin without backend
- **Browser support** — requires modern browser (Chrome / Edge / Firefox / Safari recent versions). Uses `fetch`, `Promise.allSettled`, CSS variables, `prefers-color-scheme`.
- **Mobile** — desktop-optimized; tables and grid-4 layouts don't reflow well to phones

---

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
