# Dashboard TODO

## P0 - Restore Live Market Data

- [x] Replace the unreliable public CORS proxy chain used for FRED data.
  - Current failures: codetabs returns HTTP 400; allorigins returns HTTP 408/500 or fails CORS.
  - Keep the existing FRED series: `DGS10`, `DGS3MO`, `VIXCLS`, `SOFR`, and `DFF`.
  - Prefer a stable same-origin serverless endpoint or build-time/data-cache approach over another anonymous public proxy.
- [x] Preserve the last valid business-day observation on weekends and holidays.
  - Confirm Friday values remain visible on Saturday and Sunday.
  - Display the observation date so users can distinguish stale-but-valid data from a failed request.
- [x] Report partial live-data failures accurately.
  - Do not label the strip simply `Live` when only DXY succeeds.
  - Show which fields failed and how many sources loaded.
  - Keep successful fields visible when another source fails.
- [x] Add loading, stale, partial, and unavailable states to each live field.
- [x] Add automated tests for:
  - All sources succeeding.
  - FRED failing while DXY succeeds.
  - DXY failing while FRED succeeds.
  - Weekend/holiday data with no same-day observation.
  - All sources failing.
- [x] Extend `scripts/validate_dashboard.py` to detect accidental removal of the replacement data endpoint and partial-status handling.

### Acceptance Criteria

- [x] 10Y, 3M, 3M10s, VIX, DXY, SOFR, and SOFR-EFFR render over HTTP.
- [x] Weekend loads show the latest valid business-day values and dates.
- [x] The status text never claims full success when fields are blank.
- [x] No CORS, HTTP 4xx/5xx, or uncaught JavaScript errors appear during a normal load.

## P1 - Fix Mobile Horizontal Overflow

- [ ] Add a reusable responsive wrapper for wide tables.
  - Allow table-local horizontal scrolling instead of widening the entire page.
  - Preserve visible scroll affordance on touch devices.
- [ ] Fix overflow in the Macro Regime transition table.
- [ ] Fix overflow in the Equities factor/style table.
- [ ] Stack Bitcoin tactical IF-THEN rules below 700px.
  - Remove or override the fixed `290px` IF-column width on mobile.
- [ ] Fix overflow in the Consumer regime table.
- [ ] Fix overflow in the Cheat Sheet master regime table.
- [ ] Audit every tab at 320px, 390px, 768px, and desktop widths.
- [ ] Add a browser smoke test asserting:
  - `document.documentElement.scrollWidth <= clientWidth`
  - All ten tabs remain reachable.
  - Tables can scroll locally where required.

### Acceptance Criteria

- [ ] No page-level horizontal scrolling at 320px or wider.
- [ ] Table content remains readable without shrinking text below the current mobile size.
- [ ] Navigation remains horizontally scrollable and does not affect page width.

## P1 - Handle Regime-Score Ties

- [ ] Replace first-match tie resolution in `runRegimeCheck()`.
- [ ] Define an explicit tie policy.
  - Preferred: show a mixed/transition regime with all tied leaders.
  - Alternative: apply documented tie-breakers based on growth, inflation, credit, and curve signals.
- [ ] Rework confidence so tied outcomes are not presented as definitive.
- [ ] Add explanatory copy for ambiguous and transition states.
- [ ] Add exhaustive unit coverage for all 1,280 valid input combinations.
- [ ] Add focused tests for two-way and three-way ties.

### Acceptance Criteria

- [ ] No tied score silently resolves according to JavaScript object order.
- [ ] The displayed confidence reflects ambiguity.
- [ ] Every valid input combination produces a deterministic, documented result.

## P2 - Runtime Test Coverage

- [ ] Add Playwright smoke tests to the repository.
- [ ] Test all ten tab switches and assert exactly one active section.
- [ ] Test a complete Regime Check submission and its rendered playbook.
- [ ] Capture page errors, failed requests, and non-2xx responses.
- [ ] Run desktop and mobile viewport checks in GitHub Actions.
- [ ] Keep the existing structural validator as a fast prerequisite.

## Deferred Product Work

- [ ] Decide whether to build the full STIR futures dashboard.
  - Requires a paid CME-compatible settlement-data provider such as Polygon, IBKR, or CME DataMine.
- [ ] Decide whether the plumbing concepts documented in `CLAUDE.md` should become dashboard cards:
  - IORB
  - ON RRP
  - SOFR-IORB arbitrage constraints
  - Sponsored repo
  - G-SIB balance-sheet effects
  - Standing Repo Facility
