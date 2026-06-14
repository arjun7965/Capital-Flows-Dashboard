const FRED_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv";
const FRANKFURTER_URL =
  "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,JPY,GBP,CAD,SEK,CHF";

export const FRED_SERIES = {
  tny: "DGS10",
  irx: "DGS3MO",
  vix: "VIXCLS",
  sofr: "SOFR",
  effr: "DFF",
};

const DISPLAY_FIELD_COUNT = 7;
const MAX_OBSERVATION_AGE_DAYS = 5;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(now, days) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return isoDate(date);
}

function observationAgeDays(observedAt, now) {
  const observed = new Date(`${observedAt}T00:00:00Z`);
  const current = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return Math.max(0, Math.floor((current - observed) / 86_400_000));
}

function fieldRecord(value, observedAt, source, now) {
  const ageDays = observationAgeDays(observedAt, now);
  return {
    value,
    observedAt,
    source,
    ageDays,
    status: ageDays > MAX_OBSERVATION_AGE_DAYS ? "stale" : "ok",
  };
}

function derivedField(left, right, value, source, now) {
  if (!left || !right) return null;
  const observedAt =
    left.observedAt < right.observedAt ? left.observedAt : right.observedAt;
  const record = fieldRecord(value, observedAt, source, now);
  if (left.status === "stale" || right.status === "stale") {
    record.status = "stale";
  }
  return record;
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function parseFredCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  for (let index = lines.length - 1; index > 0; index -= 1) {
    const [date, rawValue] = lines[index].split(",");
    const value = Number.parseFloat(rawValue);
    if (date && rawValue && rawValue !== "." && Number.isFinite(value)) {
      return { value, observedAt: date };
    }
  }
  throw new Error("FRED response contained no numeric observations");
}

export function calculateDxy(rates) {
  const required = ["EUR", "JPY", "GBP", "CAD", "SEK", "CHF"];
  if (!rates || required.some(code => !Number.isFinite(rates[code]))) {
    throw new Error("Frankfurter response is missing required exchange rates");
  }

  const eurusd = 1 / rates.EUR;
  const gbpusd = 1 / rates.GBP;

  return (
    50.14348112 *
    Math.pow(eurusd, -0.576) *
    Math.pow(rates.JPY, 0.136) *
    Math.pow(gbpusd, -0.119) *
    Math.pow(rates.CAD, 0.091) *
    Math.pow(rates.SEK, 0.042) *
    Math.pow(rates.CHF, 0.036)
  );
}

async function fetchFredObservation(fetchImpl, seriesId, now) {
  const query = new URLSearchParams({
    id: seriesId,
    cosd: dateDaysAgo(now, 45),
  });
  const response = await fetchWithTimeout(
    fetchImpl,
    `${FRED_BASE}?${query}`,
    {
      headers: {
        Accept: "text/csv",
        "User-Agent": "capital-flows-dashboard/1.0",
      },
    },
    12_000,
  );
  if (!response.ok) {
    throw new Error(`FRED ${seriesId} returned HTTP ${response.status}`);
  }
  return parseFredCsv(await response.text());
}

async function fetchDxyObservation(fetchImpl) {
  const response = await fetchWithTimeout(
    fetchImpl,
    FRANKFURTER_URL,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "capital-flows-dashboard/1.0",
      },
    },
    8_000,
  );
  if (!response.ok) {
    throw new Error(`Frankfurter returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload.date) throw new Error("Frankfurter response is missing a date");
  return {
    value: calculateDxy(payload.rates),
    observedAt: payload.date,
  };
}

function summarizeStatus(fields) {
  const loadedFields = Object.values(fields).filter(Boolean);
  if (loadedFields.length === 0) return "unavailable";
  if (loadedFields.length < DISPLAY_FIELD_COUNT) return "partial";
  if (loadedFields.some(field => field.status === "stale")) return "stale";
  return "ok";
}

export async function buildMarketPayload({
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  const upstreamKeys = [...Object.keys(FRED_SERIES), "dxy"];
  const requests = [
    ...Object.entries(FRED_SERIES).map(async ([key, seriesId]) => [
      key,
      await fetchFredObservation(fetchImpl, seriesId, now),
    ]),
    (async () => ["dxy", await fetchDxyObservation(fetchImpl)])(),
  ];

  const settled = await Promise.allSettled(requests);
  const raw = {};
  const errors = {};

  settled.forEach((result, index) => {
    const key = upstreamKeys[index];
    if (result.status === "fulfilled") {
      raw[result.value[0]] = result.value[1];
    } else {
      errors[key] = result.reason?.message || "Unknown upstream error";
    }
  });

  const fields = {
    tny: raw.tny
      ? fieldRecord(raw.tny.value, raw.tny.observedAt, "FRED DGS10", now)
      : null,
    irx: raw.irx
      ? fieldRecord(raw.irx.value, raw.irx.observedAt, "FRED DGS3MO", now)
      : null,
    spread: derivedField(
      raw.tny,
      raw.irx,
      raw.tny && raw.irx ? raw.tny.value - raw.irx.value : null,
      "10Y minus 3M",
      now,
    ),
    vix: raw.vix
      ? fieldRecord(raw.vix.value, raw.vix.observedAt, "FRED VIXCLS", now)
      : null,
    dxy: raw.dxy
      ? fieldRecord(raw.dxy.value, raw.dxy.observedAt, "ECB via Frankfurter", now)
      : null,
    sofr: raw.sofr
      ? fieldRecord(raw.sofr.value, raw.sofr.observedAt, "FRED SOFR", now)
      : null,
    basis: derivedField(
      raw.sofr,
      raw.effr,
      raw.sofr && raw.effr ? (raw.sofr.value - raw.effr.value) * 100 : null,
      "SOFR minus EFFR",
      now,
    ),
  };

  if (!fields.spread) errors.spread = "10Y or 3M observation unavailable";
  if (!fields.basis) errors.basis = "SOFR or EFFR observation unavailable";

  const loadedFields = Object.values(fields).filter(Boolean);
  const observationDates = loadedFields.map(field => field.observedAt).sort();

  return {
    status: summarizeStatus(fields),
    generatedAt: now.toISOString(),
    loadedCount: loadedFields.length,
    totalCount: DISPLAY_FIELD_COUNT,
    oldestObservation: observationDates[0] || null,
    latestObservation: observationDates.at(-1) || null,
    fields,
    errors,
  };
}
