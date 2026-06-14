import { buildMarketPayload } from "./lib/market-data-core.mjs";

let lastUsablePayload = null;

function staleCachePayload(payload, errors, now) {
  const fields = Object.fromEntries(
    Object.entries(payload.fields).map(([key, field]) => [
      key,
      field ? { ...field, status: "stale" } : null,
    ]),
  );

  return {
    ...payload,
    status: "stale",
    generatedAt: now.toISOString(),
    cacheFallback: true,
    fields,
    errors,
  };
}

export const handler = async event => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { Allow: "GET, OPTIONS" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const now = new Date();
  let payload;
  try {
    payload = await buildMarketPayload({ now });
    if (payload.loadedCount > 0) {
      lastUsablePayload = payload;
    } else if (lastUsablePayload) {
      payload = staleCachePayload(lastUsablePayload, payload.errors, now);
    }
  } catch (error) {
    if (lastUsablePayload) {
      payload = staleCachePayload(
        lastUsablePayload,
        { endpoint: error.message },
        now,
      );
    } else {
      payload = {
        status: "unavailable",
        generatedAt: now.toISOString(),
        loadedCount: 0,
        totalCount: 7,
        oldestObservation: null,
        latestObservation: null,
        fields: {},
        errors: { endpoint: error.message },
      };
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
    body: JSON.stringify(payload),
  };
};
