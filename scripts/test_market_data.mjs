import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarketPayload,
  calculateDxy,
  parseFredCsv,
} from "../netlify/functions/lib/market-data-core.mjs";
import { createHandler } from "../netlify/functions/market-data.mjs";

const FRIDAY = "2026-06-12";
const SATURDAY = new Date("2026-06-13T17:00:00Z");

const fredValues = {
  DGS10: 4.25,
  DGS3MO: 4.05,
  VIXCLS: 18.2,
  SOFR: 4.31,
  DFF: 4.29,
};

function mockFetch({
  failedFred = [],
  failDxy = false,
  observedAt = FRIDAY,
} = {}) {
  return async url => {
    const parsed = new URL(url);
    if (parsed.hostname === "fred.stlouisfed.org") {
      const seriesId = parsed.searchParams.get("id");
      if (failedFred.includes(seriesId)) {
        return new Response("upstream failure", { status: 503 });
      }
      const value = fredValues[seriesId];
      return new Response(`DATE,${seriesId}\n${observedAt},${value}\n`, {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      });
    }

    if (parsed.hostname === "api.frankfurter.dev") {
      if (failDxy) return new Response("upstream failure", { status: 503 });
      return Response.json({
        date: observedAt,
        rates: {
          EUR: 0.866,
          JPY: 144.3,
          GBP: 0.738,
          CAD: 1.359,
          SEK: 9.52,
          CHF: 0.817,
        },
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };
}

test("parseFredCsv returns the latest numeric observation", () => {
  const result = parseFredCsv(
    "DATE,DGS10\n2026-06-11,4.20\n2026-06-12,.\n2026-06-13,4.25\n",
  );
  assert.deepEqual(result, { value: 4.25, observedAt: "2026-06-13" });
});

test("calculateDxy returns a finite index value", () => {
  const value = calculateDxy({
    EUR: 0.866,
    JPY: 144.3,
    GBP: 0.738,
    CAD: 1.359,
    SEK: 9.52,
    CHF: 0.817,
  });
  assert.equal(Number.isFinite(value), true);
  assert.equal(value > 80 && value < 120, true);
});

test("all seven display fields load successfully", async () => {
  const payload = await buildMarketPayload({
    fetchImpl: mockFetch(),
    now: SATURDAY,
  });

  assert.equal(payload.status, "ok");
  assert.equal(payload.loadedCount, 7);
  assert.ok(Math.abs(payload.fields.spread.value - 0.2) < 1e-9);
  assert.ok(Math.abs(payload.fields.basis.value - 2) < 1e-9);
  assert.equal(payload.fields.tny.observedAt, FRIDAY);
  assert.equal(payload.fields.tny.status, "ok");
});

test("Friday observations remain valid on a weekend", async () => {
  const payload = await buildMarketPayload({
    fetchImpl: mockFetch(),
    now: new Date("2026-06-14T12:00:00Z"),
  });

  assert.equal(payload.status, "ok");
  assert.equal(payload.fields.tny.ageDays, 2);
  assert.equal(payload.fields.tny.status, "ok");
});

test("FRED outage returns a partial DXY-only payload", async () => {
  const payload = await buildMarketPayload({
    fetchImpl: mockFetch({ failedFred: Object.keys(fredValues) }),
    now: SATURDAY,
  });

  assert.equal(payload.status, "partial");
  assert.equal(payload.loadedCount, 1);
  assert.equal(payload.fields.dxy.status, "ok");
  assert.equal(payload.fields.tny, null);
  assert.match(payload.errors.tny, /HTTP 503/);
});

test("DXY outage preserves all six FRED-derived display fields", async () => {
  const payload = await buildMarketPayload({
    fetchImpl: mockFetch({ failDxy: true }),
    now: SATURDAY,
  });

  assert.equal(payload.status, "partial");
  assert.equal(payload.loadedCount, 6);
  assert.equal(payload.fields.dxy, null);
  assert.equal(payload.fields.spread.status, "ok");
  assert.equal(payload.fields.basis.status, "ok");
});

test("old observations are marked stale", async () => {
  const payload = await buildMarketPayload({
    fetchImpl: mockFetch({ observedAt: "2026-06-01" }),
    now: SATURDAY,
  });

  assert.equal(payload.status, "stale");
  assert.equal(payload.fields.tny.status, "stale");
});

test("total upstream outage is reported as unavailable", async () => {
  const payload = await buildMarketPayload({
    fetchImpl: mockFetch({
      failedFred: Object.keys(fredValues),
      failDxy: true,
    }),
    now: SATURDAY,
  });

  assert.equal(payload.status, "unavailable");
  assert.equal(payload.loadedCount, 0);
  assert.equal(Object.values(payload.fields).every(field => field === null), true);
});

test("the function serves stale warm-cache data during a later total outage", async () => {
  const originalFetch = globalThis.fetch;
  const handler = createHandler({ getNow: () => SATURDAY });
  try {
    globalThis.fetch = mockFetch();
    const successfulResponse = await handler({ httpMethod: "GET" });
    const successfulPayload = JSON.parse(successfulResponse.body);
    assert.equal(successfulPayload.status, "ok");

    globalThis.fetch = mockFetch({
      failedFred: Object.keys(fredValues),
      failDxy: true,
    });
    const cachedResponse = await handler({ httpMethod: "GET" });
    const cachedPayload = JSON.parse(cachedResponse.body);

    assert.equal(cachedPayload.status, "stale");
    assert.equal(cachedPayload.cacheFallback, true);
    assert.equal(cachedPayload.loadedCount, 7);
    assert.equal(cachedPayload.fields.tny.status, "stale");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
