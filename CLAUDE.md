# Capital Flows Research Dashboard — Project Context

## What This Is

An interactive HTML dashboard (`capital_flows_dashboard.html`) synthesizing primers from [capitalflowsresearch.com](https://capitalflowsresearch.com). The goal is to understand global capital flows, interest rates, FX dynamics, and their interaction with equity markets.

**File:** `capital_flows_dashboard.html` (~170KB, ~2,400 lines)
**Backup:** `capital_flows_dashboard_backup_v1.html` (snapshot before enhancement work)

---

## Dashboard Structure

### Primer Tabs (8)
| Tab | Section ID | Key Topics |
|-----|-----------|------------|
| Macro Regime | `regime` | 4-quadrant matrix (Goldilocks/Overheat/Stagflation/Recession), factor rotation, regime transition signals |
| Global Liquidity | `liquidity` | Eurodollar system, reserve currency mechanics, USD recycling loop, petrodollar, QE/QT |
| Interest Rates | `rates` | Yield curve (level/slope/curvature), term premium, carry & roll-down, 3m10s spread, Fed mechanics |
| FX & Inflation | `fx` | Inflation cycle phases, purchasing power parity, carry trades, EM currency dynamics |
| Equities & Credit | `equities` | Dealer gamma, market breadth (SPX vs RSP), vol structure, credit spreads, path-dependent asset-liability framework |
| Bitcoin | `bitcoin` | Bitcoin as macro asset |
| Consumer | `consumer` | Consumer credit cycle, household balance sheet dynamics |
| Thesis Checklist | `thesis` | Falsifiable thesis framework |

### Tool Tabs (2, styled in green)
| Tab | Section ID | What It Does |
|-----|-----------|-------------|
| ⚡ Regime Check | `regimecheck` | 5-question diagnostic → computes macro regime → shows assets to own/avoid, rate/FX/duration strategy |
| 📋 Cheat Sheet | `cheatsheet` | Master regime→asset table, indicator thresholds, cross-asset rules, 9-point pre-trade checklist |

### Live Data Strip
Persistent bar above the nav showing: **10Y yield · 3M T-bill · 3M10s spread · VIX · DXY · SOFR · SOFR−EFFR basis**

⚠️ **Only works when served over HTTP, not from file://.** To enable (Windows PowerShell):
```powershell
cd "<your-folder>/Capital Flows Primers"   # or wherever the file lives
node scripts/serve_dashboard.mjs
# Then open: http://127.0.0.1:8080/
```

#### Data Source Architecture (current)

| Field | Source | Delivery | Notes |
|---|---|---|---|
| 10Y, 3M, VIX, SOFR, EFFR | FRED (`DGS10`, `DGS3MO`, `VIXCLS`, `SOFR`, `DFF`) | Same-origin `/api/market-data` | Latest numeric business-day observation |
| DXY | ECB rates via Frankfurter API, computed using ICE formula | Same-origin `/api/market-data` | Latest ECB fixing, matches TradingView to ~0.06 |
| 3M10s, SOFR−EFFR basis | Derived server-side | Same payload | Displayed with component observation date |

**Do NOT reintroduce browser-side public proxies.** codetabs began returning HTTP 400 and allorigins returned 408/CORS failures in June 2026. Stooq dropped the UST yield tickers, Yahoo's quote API returns 401, and corsproxy.io became paid-only. Production uses `netlify/functions/market-data.mjs`; local development uses `scripts/serve_dashboard.mjs`.

The endpoint reports `ok`, `partial`, `stale`, or `unavailable`, preserves successful fields during partial outages, and includes an observation date for every field. Friday observations remain valid during weekends.

**DXY formula** (ICE DXY, exact): `50.14348112 × EURUSD^(-0.576) × USDJPY^(0.136) × GBPUSD^(-0.119) × USDCAD^(0.091) × USDSEK^(0.042) × USDCHF^(0.036)`. Frankfurter quotes everything as "foreign per 1 USD" so EUR and GBP need inversion before applying the formula.

**FedWatch deep-link** lives in the Interest Rates tab header — opens CME's official tool for futures-implied probabilities (iframing is blocked by CME's CSP). See "STIR Implementation Notes" below.

---

## CRITICAL: File Editing Rule

**NEVER use the Edit tool directly on `capital_flows_dashboard.html`.** It maintains a stale cache and truncates the file.

**Always use Python bash with `content.replace()`:**

```python
with open('/path/to/capital_flows_dashboard.html') as f:
    content = f.read()

content = content.replace('unique_anchor_string', new_content + 'unique_anchor_string')

with open('/path/to/capital_flows_dashboard.html', 'w') as f:
    f.write(content)
```

**File path:** Use the absolute path to `capital_flows_dashboard.html` in your local checkout (e.g. `<your-folder>/capital_flows_dashboard.html` on macOS/Linux or `<your-folder>\capital_flows_dashboard.html` on Windows). In Cowork sessions the path is typically `/sessions/<session-id>/mnt/<repo-name>/capital_flows_dashboard.html` — use `ls /sessions/` to find the current session ID.

**Pattern: write a small Python patch script, run it, delete it, then run the validator.** Anchor on a unique substring with `assert anchor in content` and `assert content.count(anchor) == 1` so the script fails loudly if the file shape has drifted. **After every edit, run `python scripts/validate_dashboard.py`** (see next section).

**Key insertion anchors:**
- CSS additions → before `</style>`
- HTML before nav → before `<nav id="nav">`
- New nav buttons → before `</nav>`
- New sections → before `\n</main>`
- JavaScript → before `function showSection`

---

## CRITICAL: Validate After Every Edit

**Run `python scripts/validate_dashboard.py` after every change to `capital_flows_dashboard.html`.** Exits 0 on success, 1 on any failure. No third-party dependencies (stdlib only).

The same script runs automatically as a guard rail, but you should still run it locally so you catch issues during the edit session instead of after pushing:

- **GitHub Action** (`.github/workflows/validate.yml`) — runs on every push and PR; failing checks show a red ✗ on the commit
- **Netlify build gate** (`netlify.toml` `[build] command`) — runs during deploy; failing checks abort the deploy so the previous good version stays live

### What the validator catches (the bug classes we've actually hit)

| Check | Caught real bug |
|---|---|
| Per-section `<div>` balance | The "Regime Transition card visible on every tab" orphan-card bug (May 2026) |
| All `var(--X)` references resolve | The `-700` color bug — 53 unreadable elements |
| Color palette completeness in both themes | Prevents future `-700`-style regressions |
| JS `getElementById` references match HTML ids | Caught a stray `var(--color-orange-50, fallback)` undefined ref |
| Nav buttons ↔ sections wired correctly | Catches unreachable tabs or orphan sections |
| Critical data-source wiring present | Prevents accidental removal of the same-origin endpoint, Netlify redirect, FRED/Frankfurter sources, or CME wiring |

### Extending the validator

If you ever hit a new bug class not covered above, add a check to `scripts/validate_dashboard.py`. Each check is ~10 lines following the same pattern: regex match → assert condition → call `ok()` or `fail()`. The existing 6 checks are good templates.

---

## CRITICAL: CSS Color Variant Rule

The dashboard's color palette defines `-50, -200, -600, -700, -800` for each color family (purple, teal, coral, blue, amber, red, green). **Gray is the exception — it uses `-100` instead of `-200`** (see `--color-gray-100` definitions in the light and dark theme blocks). The validator knows about this deviation.

**The `-700` variants are aliased to `-800`** because the HTML references `-700` in ~53 places but the original CSS only defined `-50/-200/-600/-800`. Without `-700` definitions, CSS variables fall back to inherited color, causing unreadable dark-on-dark text (USD Recycling Loop, Trading Implication boxes, etc.).

**If you ever rebuild the color palette, you MUST include `-700` definitions for every color family in both light and dark theme blocks.** See [capital_flows_dashboard.html:16-23](capital_flows_dashboard.html:16) (light) and [:36-43](capital_flows_dashboard.html:36) (dark). The validator will refuse to pass if any required shade is missing from either theme.

---

## PDFs in This Folder

All primers are PDFs. Read with `pdfplumber` in bash. For large PDFs (>20 pages) read in chunks of 12–15 pages to avoid token limits.

```python
import pdfplumber
with pdfplumber.open('file.pdf') as pdf:
    text = '\n'.join(p.extract_text() or '' for p in pdf.pages[0:15])
```

### Validation Status
| Primer | Validated & Patched |
|--------|-------------------|
| Inflationary Cycle Playbook | ✅ |
| Beyond the Credit Cycle | ✅ |
| US Interest Rates Trading Tactical Playbook | ✅ |
| The S&P 500 Macro Regime Playbook | ✅ |
| STIR Replication Playbook | ✅ (educational scaffolding: SOFR field + FedWatch deep-link + "STIR Markets & Reading the Fed Path" card explaining SR3/ZQ contracts, implied-rate conversion, FedWatch probability mechanics, day-weighting concept; full quantitative build deferred — needs paid futures feed) |
| Bitcoin As A Macro Liquidity Release Valve | ✅ (added Risk Curve & Lead/Lag card, Tactical IF–THEN Rules card, inflation regime nuance) |
| Consumer Macroeconomic Playbook | ✅ (added Life-Cycle Hypothesis, expanded indicator panel to 12 metrics, added Balance Sheet/K-Shaped card, Transmission Mechanism card, Historical Case Studies card) |
| The Macroeconomic Framework Of Capital Flows | ✅ (added Duration vs Credit Risk twin pillars card, Credit & Liquidity Cycle Phases card, When Central Banks Lose Control tail scenarios card, extended metric panel with HY OAS / MOVE / CDX / issuance / x-ccy basis, fixed-income-leads-equity rationale) |
| Building A Falsifiable Investment Thesis | ✅ (added First-Principles & Conjecture-Refutation card, Multi-Timeframe & Cone of Uncertainty card, Worked Examples across rates/equities/commodities card, Risk-Premium vs Knowledge-Based Investing meta-distinction) |

**Next step:** Read remaining PDFs sequentially, check each against the dashboard section it belongs to, and patch any gaps.

---

## Key Concepts Already in the Dashboard

These are confirmed present — don't duplicate. Organized roughly by primer/tab.

### Original concepts (validated pre-2026-05-15)
- **3m10s spread** (Fed's preferred recession predictor, more reliable than 2s10s)
- **USD Recycling Loop** (US deficit → world earns USD → buys UST → suppresses long rates)
- **Regime Transition Signals** (early warning data for each quadrant rotation)
- **Yield Curve Twist** (short and long ends move in opposite directions — curvature not slope)
- **Dealer Gamma** (long gamma = mean-reverting market; short gamma = amplified moves)
- **Path-dependent asset-liability framework** (duration mismatch, refinancing risk, reflexivity) — equities tab
- **Market breadth** (SPX cap-weighted vs RSP equal-weighted as fragility signal)
- **Term Premium** (long yield = expected short rates + TP; compressed by QE, explodes in stagflation)

### Live data architecture (added 2026-05-15)
- **SOFR–EFFR basis** (overnight repo vs admin fed funds — funding-stress signal; quarter-end widening from G-SIB balance-sheet shrinkage; ~0bp normal, >5bp warn, >10bp red) — has dedicated explainer card in rates tab
- **ICE DXY (computed)** — genuine ICE formula via ECB Frankfurter rates, not FRED's TWI; matches TradingView to ~0.06

### Macro Framework / Liquidity additions (added 2026-05-15/16)
- **Duration Risk vs Credit Risk twin pillars** — inflation amplifies duration risk, growth amplifies credit risk; map all regimes to combinations of the two (Liquidity tab)
- **Credit & Liquidity Cycle phases** — Expansion → Euphoria → Contraction → Recovery with Soros-style reflexivity (Liquidity tab)
- **Reflexivity** — investor beliefs alter credit conditions alter fundamentals alter beliefs (self-reinforcing in both directions)
- **Central banks losing control / tail scenarios** — 6 loss-of-control signals (yields spike despite intervention, FX free-fall, breakeven un-anchoring, MOVE >150, weak auctions, x-currency basis blowout) + trade playbook (gold, OTM puts, long vol, CDS, foreign FX, cash) (Liquidity tab)
- **Fixed income leads equity** — bond/FX react first; credit spreads as early warning (Liquidity tab Capital Flow Hierarchy)
- **Extended liquidity metric panel** — HY OAS, MOVE Index, CDX HY/IG, primary market issuance, cross-currency basis (Liquidity tab)

### Bitcoin tab additions (added 2026-05-16)
- **Inflation regime nuance for BTC** — unexpected inflation with lagging policy = bullish; inflation fought aggressively = bearish (because Fed reaction tightens liquidity)
- **Risk Curve Position & Cross-Asset Lead/Lag** — equity internals (ARKK, biotech, small caps, credit spreads, VIX term structure) as BTC leading indicators; intraday lead/lag map (MSTR pre-market, COIN, CME weekend gap, NDX, miners); ETF institutionalization contagion (~3.2x amplification)
- **Tactical IF–THEN Decision Rules for BTC** — 7 conditional rules linking macro state + positioning extremes to actions

### Consumer tab additions (added 2026-05-16)
- **Life-Cycle Hypothesis** (Modigliani) alongside PIH — explains why stimulus checks get saved vs raises get spent
- **Expanded indicator panel** — PCE, retail sales, personal income, U-Mich/Conference Board, G.19 credit growth, Case-Shiller, household net worth, SLOOS (12 metrics total)
- **Household Balance Sheet composition** — housing = biggest asset, mortgages = biggest liability; housing wealth effect > stock wealth effect (~$0.05–0.08 per $1 vs $0.03–0.05)
- **K-Shaped Consumer / Wealth Distribution** — top 10% drives marginal discretionary; aggregates can mask bottom-half stress (luxury vs dollar store divergence, excess savings depletion asymmetry)
- **Consumption as Transmission Mechanism** — ~40% of US business cycle fluctuations from consumer shocks since 1970s; 4-channel monetary transmission (intertemporal + cash-flow + wealth + big-ticket); fiscal transmission distinctions
- **Historical case studies** — 2008 deleveraging, 2020–22 COVID stimulus, 1970s stagflation

### Rates tab additions (added 2026-05-15/16)
- **CME FedWatch deep-link** — opens authoritative futures-implied probabilities (iframing blocked by CME CSP)
- **STIR Markets explainer** — SR3 (3M SOFR) and ZQ (30-day Fed Funds) contracts, `implied_rate = 100 − settle`, day-weighting math for FOMC dates, FedWatch probability mechanics

### Thesis tab additions (added 2026-05-16)
- **First-Principles & Conjecture-Refutation cycle** — Deutsch's "deep, causal, falsifiable" frame; identify drivers → causal chain → attack the weakest link
- **Multi-timeframe integration / Cone of Uncertainty** — short/medium/long checkpoints; sizing varies with timeframe confidence; "strong opinions, weakly held"
- **Worked examples across asset classes** — rates (Japanese widowmaker), equities (next-Amazon trap), commodities (oil supply/demand)
- **Risk-Premium vs Knowledge-Based Investing** — when this whole methodology applies vs simple buy-and-hold

### Plumbing concepts established via Q&A (not yet cards, in conversation memory only)
- **IORB** (Interest on Reserve Balances) — admin ceiling, ~10bp below upper bound; primary Fed policy tool in ample-reserves framework
- **ON RRP** — admin floor at lower bound; available to MMFs/GSEs (non-banks)
- **Why banks don't arbitrage SOFR–IORB** — SLR + G-SIB surcharge make balance-sheet expansion uneconomic for small spreads
- **Sponsored repo** — FICC-netting workaround that lets banks lend at SOFR without expanding SLR-relevant balance sheet (~$1T/day by 2024)
- **G-SIBs** (Global Systemically Important Banks) — 8 US designees; Fed's Method 2 typically harsher than FSB Method 1; quarter-end balance sheet shrinkage drives SOFR seasonality
- **Standing Repo Facility (SRF)** — Fed as arbitrageur of last resort, caps SOFR at upper bound when private balance sheets fail (created 2021 post-Sept 2019)

---

## STIR Implementation Notes

The STIR Replication Playbook (`Cfr_Stir_Replication_Playbook.pdf`) describes a full CME-FedWatch-style dashboard but **requires paid CME futures settlement data** (Polygon ~$30/mo, IBKR account, or CME DataMine). CME's own settlement JSON endpoint returns 403 ("scraping blocked per Data Terms of Use") and their FedWatch page can't be iframed (CSP `frame-ancestors` allowlist doesn't include localhost).

**Current implementation (Option 4 from session 2026-05-15/16):**
- SOFR + SOFR−EFFR basis on the live strip (FRED-fed, free)
- FedWatch deep-link button at top of Interest Rates tab (opens CME's official tool in new tab)
- Full Python build per playbook appendix is deferred until the user opts into a paid futures feed

If the user later wants the full STIR build, the playbook's appendix code (A1–A6 in the PDF) is a self-contained Python+Plotly notebook. Replace the three `make_mock_*` loaders with real provider calls and the rest runs as-is.

---

## JavaScript Tab Switcher (Fixed Version)

```javascript
function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}
```

The selector must be `#nav button` not `.tab-bar button` — the nav element has `id="nav"`.

---

## Stats
- **Total cards:** ~69 (2026-05-31 primer cross-check — Regime +1, Liquidity +2, FX +1; prior session 65; original 51)
- **Total sections:** 9 (8 primer + 1 regime check + 1 cheat sheet = displayed as 10 tabs)
- **File size:** ~251KB
- **Live strip fields:** 7 (10Y, 3M, 3M10s, VIX, DXY, SOFR, SOFR−EFFR)

## Project Goal
A personal reference tool synthesizing all the Capital Flows Research primers into one interactive HTML dashboard. The goal is to better understand global flows of money, interest rates, FX, and how they interact with the stock market — by having all the key concepts, regimes, signals, and tactical playbooks in one navigable place.
