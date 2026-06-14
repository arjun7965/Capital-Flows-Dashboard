import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { handler as marketDataHandler } from "../netlify/functions/market-data.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number.parseInt(process.env.PORT || "8080", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function send(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

async function serveMarketData(request, response) {
  const result = await marketDataHandler({
    httpMethod: request.method,
    headers: request.headers,
  });
  send(response, result.statusCode, result.headers || {}, result.body || "");
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname =
    requestUrl.pathname === "/" ? "/capital_flows_dashboard.html" : requestUrl.pathname;
  const decodedPath = decodeURIComponent(pathname);
  const filePath = resolve(root, `.${decodedPath}`);

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    send(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    send(
      response,
      200,
      {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes[extname(filePath).toLowerCase()] ||
          "application/octet-stream",
      },
      body,
    );
  } catch (error) {
    const statusCode = error.code === "ENOENT" ? 404 : 500;
    send(
      response,
      statusCode,
      { "Content-Type": "text/plain; charset=utf-8" },
      statusCode === 404 ? "Not found" : "Internal server error",
    );
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/market-data")) {
      await serveMarketData(request, response);
    } else {
      await serveStatic(request, response);
    }
  } catch (error) {
    console.error(error);
    send(
      response,
      500,
      { "Content-Type": "text/plain; charset=utf-8" },
      "Internal server error",
    );
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Dashboard: http://127.0.0.1:${port}/`);
});
