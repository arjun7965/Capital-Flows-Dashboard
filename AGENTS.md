# Repository Guidelines

## Project Structure & Module Organization

`capital_flows_dashboard.html` is the primary application: markup, styles, content, and browser JavaScript are kept in one self-contained file. `netlify/functions/` contains the production market-data endpoint, with reusable calculations in `netlify/functions/lib/market-data-core.mjs`. Local tooling lives in `scripts/`, including the HTTP server, structural validator, and Node test suites. Playwright specifications and source-text fixtures are under `tests/`. Primer PDFs are local research inputs and should not be committed. Treat `bkup/` and `capital_flows_dashboard_backup_v1.html` as reference snapshots, not active source.

## Build, Test, and Development Commands

- `npm ci` installs the pinned Playwright dependency.
- `node scripts/serve_dashboard.mjs` serves the dashboard and `/api/market-data` at `http://127.0.0.1:8080/`.
- `python scripts/validate_dashboard.py` checks HTML structure, CSS variables, element references, navigation wiring, data sources, and file-size sanity.
- `npm test` runs the dependency-free Node tests for market data, regime scoring, and dashboard data integrity.
- `npm run test:browser` runs Playwright across the configured desktop and responsive scenarios.

There is no compilation step. Netlify’s build gate runs the validator followed by `npm test`.

## Coding Style & Naming Conventions

Use ES modules, two-space indentation, semicolons, `camelCase` for JavaScript identifiers, and descriptive kebab-case HTML IDs. Python tooling follows four-space indentation and `snake_case`. Keep external data access server-side through the same-origin endpoint; do not add browser-side public CORS proxies.

Follow the guarded editing procedure documented in `CLAUDE.md` for the large dashboard file: use unique anchors, assert a single match, and run the validator after every edit. Preserve the complete light/dark CSS color palette, including required `-700` aliases.

## Testing Guidelines

Name Node suites `scripts/test_*.mjs` and Playwright suites `tests/*.spec.mjs`. Add regression coverage for every bug class or interaction changed. Browser tests should capture console errors, failed requests, tab reachability, and mobile overflow where relevant. Keep fixtures deterministic; avoid tests that depend on the current date or live upstream services.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Fix mobile overflow and add browser tests`. Keep each commit focused. Pull requests should explain the user-visible change, list validation commands run, link relevant issues, and include screenshots for visual or responsive changes. Never commit API keys, copyrighted primer PDFs, temporary patch scripts, Playwright traces, or generated screenshots unless they are intentional review artifacts.
