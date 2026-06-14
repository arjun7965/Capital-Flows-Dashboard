import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(
  new URL("../capital_flows_dashboard.html", import.meta.url),
  "utf8",
);
const engineMatch = html.match(
  /\/\/ REGIME ENGINE START[\s\S]*?\/\/ REGIME ENGINE END/,
);

assert.ok(engineMatch, "Regime engine test markers must remain in the dashboard");

const context = vm.createContext({});
vm.runInContext(
  `${engineMatch[0]}
  globalThis.regimeEngine = {
    REGIME_INPUTS,
    REGIME_ORDER,
    diagnoseRegime,
    scoreRegime
  };`,
  context,
);

const {
  REGIME_INPUTS,
  REGIME_ORDER,
  diagnoseRegime,
  scoreRegime,
} = context.regimeEngine;
const regimeOrder = plain(REGIME_ORDER);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("all 1,280 valid signal combinations are deterministic", () => {
  const outcomeCounts = { unique: 0, two: 0, three: 0, four: 0 };
  let combinations = 0;

  for (const growth of REGIME_INPUTS.growth) {
    for (const inflation of REGIME_INPUTS.inflation) {
      for (const fed of REGIME_INPUTS.fed) {
        for (const curve of REGIME_INPUTS.curve) {
          for (const credit of REGIME_INPUTS.credit) {
            const inputs = { growth, inflation, fed, curve, credit };
            const first = plain(diagnoseRegime(inputs));
            const second = plain(diagnoseRegime({
              credit,
              curve,
              fed,
              inflation,
              growth,
            }));
            const scores = plain(scoreRegime(inputs));
            const expectedMax = Math.max(...Object.values(scores));
            const expectedLeaders = regimeOrder.filter(
              regime => scores[regime] === expectedMax,
            );

            combinations += 1;
            assert.deepEqual(first, second);
            assert.deepEqual(first.scores, scores);
            assert.deepEqual(first.leaders, expectedLeaders);
            assert.equal(first.maxScore, expectedMax);
            assert.ok(first.totalScore > 0);

            if (first.isTie) {
              assert.equal(first.confidence, 0);
              assert.equal(first.lead, 0);
            } else {
              assert.equal(first.leaders.length, 1);
              assert.ok(first.confidence > 0);
              assert.ok(first.lead > 0);
            }

            const countKey = ["unique", "two", "three", "four"][
              first.leaders.length - 1
            ];
            outcomeCounts[countKey] += 1;
          }
        }
      }
    }
  }

  assert.equal(combinations, 1_280);
  assert.deepEqual(outcomeCounts, {
    unique: 1_110,
    two: 148,
    three: 19,
    four: 3,
  });
});

test("two-way ties preserve both leaders", () => {
  const diagnosis = plain(diagnoseRegime({
    growth: "up",
    inflation: "high",
    fed: "hold-high",
    curve: "flat",
    credit: "widening",
  }));

  assert.deepEqual(diagnosis.leaders, ["overheat", "stagflation"]);
  assert.equal(diagnosis.confidence, 0);
});

test("three-way ties preserve every leader", () => {
  const diagnosis = plain(diagnoseRegime({
    growth: "up",
    inflation: "high",
    fed: "hold-high",
    curve: "disinverting",
    credit: "widening",
  }));

  assert.deepEqual(diagnosis.leaders, [
    "overheat",
    "stagflation",
    "recession",
  ]);
  assert.equal(diagnosis.confidence, 0);
});

test("four-way ties remain explicitly ambiguous", () => {
  const diagnosis = plain(diagnoseRegime({
    growth: "up",
    inflation: "target",
    fed: "hold-high",
    curve: "flat",
    credit: "widening",
  }));

  assert.deepEqual(diagnosis.leaders, [
    "goldilocks",
    "overheat",
    "stagflation",
    "recession",
  ]);
  assert.equal(diagnosis.confidence, 0);
});

test("unique regimes report score-separation confidence", () => {
  const diagnosis = plain(diagnoseRegime({
    growth: "up",
    inflation: "falling",
    fed: "pivoting",
    curve: "steep",
    credit: "tight",
  }));

  assert.deepEqual(diagnosis.leaders, ["goldilocks"]);
  assert.equal(diagnosis.isTie, false);
  assert.ok(diagnosis.lead > 0);
  assert.ok(diagnosis.confidence > 0);
});

test("invalid inputs fail explicitly", () => {
  assert.throws(
    () => diagnoseRegime({
      growth: "unknown",
      inflation: "target",
      fed: "cutting",
      curve: "steep",
      credit: "tight",
    }),
    /Invalid growth value/,
  );
});
