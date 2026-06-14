#!/usr/bin/env python3
"""
Dashboard structural validator.

Catches the classes of bug we've actually hit in this project:

  1. Orphan content (cards/divs outside section wrappers) — caused the
     "Regime Transition card visible on every tab" bug
  2. Missing CSS variable definitions — caused the -700 color bug
     (53 unreadable elements until we aliased -700 -> -800)
  3. Broken JS -> HTML element references (getElementById of an ID
     that does not exist in the markup)
  4. Nav buttons pointing to non-existent sections, or sections that
     have no nav button
  5. Missing critical data-source URLs (accidental removal of live-
     data wiring during edits)
  6. File size catastrophes (truncation, runaway duplication)

Run before committing:    python scripts/validate_dashboard.py
GitHub Action runs this on every push (.github/workflows/validate.yml).
Netlify runs this as the build command (netlify.toml) so a failing
check blocks the deploy.

Exits 0 on success, 1 on any failure.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "capital_flows_dashboard.html"
MARKET_FUNCTION = ROOT / "netlify" / "functions" / "market-data.mjs"
MARKET_CORE = ROOT / "netlify" / "functions" / "lib" / "market-data-core.mjs"
NETLIFY_CONFIG = ROOT / "netlify.toml"

# ─── Tracking ─────────────────────────────────────────────────────
ISSUES: list[str] = []

def fail(msg: str) -> None:
    ISSUES.append(msg)
    print(f"  [FAIL]  {msg}")

def ok(msg: str) -> None:
    print(f"  [ OK ]  {msg}")

# ─── Load file ────────────────────────────────────────────────────
if not HTML.exists():
    print(f"ERROR: {HTML} not found")
    sys.exit(1)

content = HTML.read_text(encoding="utf-8")
print(f"\nValidating {HTML.name} ({len(content):,} bytes)\n")

# ─── CHECK 1: Per-section <div> balance ───────────────────────────
# Catches today's bug: a stray </div> prematurely closing a section
# leaves following cards as siblings of all sections, making them
# visible on every tab.

print("[1/7] Per-section <div> balance")
section_re = re.compile(r'<div id="([^"]+)" class="section(?:\s+active)?">')
sections = [(m.start(), m.group(1)) for m in section_re.finditer(content)]
main_close = content.find("</main>")

if not sections:
    fail("no <div ... class='section'> elements found")
elif main_close == -1:
    fail("no </main> closing tag found")
else:
    for i, (start, name) in enumerate(sections):
        end = sections[i+1][0] if i+1 < len(sections) else main_close
        block = content[start:end]
        opens = block.count("<div")
        closes = block.count("</div>")
        if opens == closes:
            ok(f"section '{name}': {opens} opens = {closes} closes")
        else:
            diff = closes - opens
            fail(f"section '{name}': opens={opens} closes={closes} (diff {diff:+d})")

# ─── CHECK 2: All var(--X) refs have a definition ─────────────────
# Catches the -700 bug: 53 references to --color-*-700 with no
# matching definition, causing CSS fallback to inherited color.

print("\n[2/7] CSS variable references resolve")
all_refs = set(re.findall(r"var\(--([a-z][a-z0-9-]*)", content))
all_defs = set(re.findall(r"--([a-z][a-z0-9-]*)\s*:", content))
undefined = all_refs - all_defs
if undefined:
    for v in sorted(undefined):
        fail(f"var(--{v}) referenced but never defined")
else:
    ok(f"all {len(all_refs)} CSS variable references resolve")

# ─── CHECK 3: Color palette completeness in both themes ───────────
# Every family must define -50, -200, -600, -700, -800 in BOTH
# light and dark theme blocks (count >= 2 for each shade).
# Prevents future -700-style regressions.

print("\n[3/7] Color palette completeness (light + dark themes)")
# Most color families use shades -50, -200, -600, -700, -800.
# The gray family is an intentional exception: it uses -100 instead of
# -200 (see lines 23 and 43 in the dashboard).
family_shades = {
    "purple": ["50", "200", "600", "700", "800"],
    "teal":   ["50", "200", "600", "700", "800"],
    "coral":  ["50", "200", "600", "700", "800"],
    "blue":   ["50", "200", "600", "700", "800"],
    "amber":  ["50", "200", "600", "700", "800"],
    "red":    ["50", "200", "600", "700", "800"],
    "green":  ["50", "200", "600", "700", "800"],
    "gray":   ["50", "100", "600", "700", "800"],
}
for fam, required_shades in family_shades.items():
    family_ok = True
    for shade in required_shades:
        token = f"--color-{fam}-{shade}:"
        n = content.count(token)
        if n < 2:
            fail(f"--color-{fam}-{shade} missing from both themes (found in {n} places, need 2)")
            family_ok = False
    if family_ok:
        ok(f"family '{fam}': all {len(required_shades)} shades defined in both themes")

# ─── CHECK 4: JS getElementById refs match HTML id attributes ─────
# Catches broken event handlers when an HTML id is renamed but the
# JS still calls getElementById on the old name.

print("\n[4/7] JS getElementById references resolve")
js_ids = set(re.findall(r"getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)", content))
html_ids = set(re.findall(r'\sid="([^"]+)"', content))
missing = js_ids - html_ids
if missing:
    for mid in sorted(missing):
        fail(f"getElementById('{mid}') has no matching id='{mid}' in HTML")
else:
    ok(f"all {len(js_ids)} JS element IDs resolve to HTML elements")

# ─── CHECK 5: Nav buttons <-> sections wired correctly ────────────

print("\n[5/7] Nav buttons <-> sections")
nav_targets = set(re.findall(r"showSection\(\s*['\"]([^'\"]+)['\"]", content))
section_ids = {name for _, name in sections}
nav_to_missing = nav_targets - section_ids
section_no_nav = section_ids - nav_targets
if nav_to_missing:
    for t in sorted(nav_to_missing):
        fail(f"nav calls showSection('{t}') but no section with id='{t}' exists")
if section_no_nav:
    for s in sorted(section_no_nav):
        fail(f"section '{s}' has no nav button (unreachable via tabs)")
if not nav_to_missing and not section_no_nav:
    ok(f"all {len(nav_targets)} nav buttons map cleanly to all {len(section_ids)} sections")

# ─── CHECK 6: Critical data-source URLs present ───────────────────
# Prevents accidentally removing the live data wiring during edits.

print("\n[6/7] Critical data-source wiring present")
market_function_content = (
    MARKET_FUNCTION.read_text(encoding="utf-8") if MARKET_FUNCTION.exists() else ""
)
market_core_content = (
    MARKET_CORE.read_text(encoding="utf-8") if MARKET_CORE.exists() else ""
)
netlify_content = (
    NETLIFY_CONFIG.read_text(encoding="utf-8") if NETLIFY_CONFIG.exists() else ""
)

critical_wiring = [
    ("same-origin market-data request", "/api/market-data", content),
    ("Netlify market-data redirect", "/.netlify/functions/market-data", netlify_content),
    ("FRED CSV endpoint", "fred.stlouisfed.org", market_core_content),
    ("Frankfurter DXY endpoint", "api.frankfurter.dev", market_core_content),
    ("market-data function handler", "export const handler", market_function_content),
    ("CME FedWatch deep-link", "cmegroup.com", content),
    ("Capital Flows credit", "capitalflowsresearch.com", content),
]
for label, needle, haystack in critical_wiring:
    if needle in haystack:
        ok(f"present: {label}")
    else:
        fail(f"missing: {label} ({needle})")

deprecated_proxies = ["api.codetabs.com", "api.allorigins.win", "corsproxy.io"]
combined_runtime = "\n".join([content, market_function_content, market_core_content])
for proxy in deprecated_proxies:
    if proxy in combined_runtime:
        fail(f"deprecated browser proxy still referenced: {proxy}")
    else:
        ok(f"deprecated browser proxy absent: {proxy}")

print("\n[7/7] Live-data failure states present")
required_live_states = [
    "payload.status === 'partial'",
    "payload.status === 'stale'",
    "Market data unavailable",
    "oldestObservation",
    "loadedCount",
]
for marker in required_live_states:
    if marker in content:
        ok(f"present: {marker}")
    else:
        fail(f"missing live-data state marker: {marker}")

# ─── Final report ─────────────────────────────────────────────────
print()
size = len(content)
MIN_SIZE = 50_000
MAX_SIZE = 500_000
if not (MIN_SIZE <= size <= MAX_SIZE):
    fail(f"file size {size:,} bytes outside expected range {MIN_SIZE:,}-{MAX_SIZE:,}")
    print()

if ISSUES:
    print(f"FAILED: {len(ISSUES)} issue(s)")
    sys.exit(1)
else:
    print("All checks passed.")
    sys.exit(0)
