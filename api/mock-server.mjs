#!/usr/bin/env node
// Mock of the TMS shipment-status API (api/tms-shipments.swagger.json), serving data/tms.json.
//   node api/mock-server.mjs            → http://localhost:4010/v1/shipments/CL-2026-0412345
//   curl -H "Authorization: Bearer demo" "http://localhost:4010/v1/shipments?cmr=5520113"
// Add ?simulate=429 or ?simulate=503 to any request to exercise the flow's retry and fallback.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "data/tms.json"), "utf8"));

const problem = (res, status, title, extraHeaders = {}) => {
  res.writeHead(status, { "content-type": "application/problem+json", ...extraHeaders });
  res.end(JSON.stringify({ status, title }));
};
const json = (res, body) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const norm = (v) => v.replace(/[\s:#-]/g, "").toUpperCase();

export function createMockServer() {
  return createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const simulate = url.searchParams.get("simulate");
    if (simulate === "429") return problem(res, 429, "Too many requests", { "retry-after": "30" });
    if (simulate === "503") return problem(res, 503, "TMS unavailable");
    if (!/^Bearer \S+/.test(req.headers.authorization || "")) return problem(res, 401, "Missing or invalid token");
    if (req.method !== "GET") return problem(res, 405, "Read-only API");

    const one = url.pathname.match(/^\/v1\/shipments\/(CL-20\d{2}-\d{7})$/);
    if (one) {
      const s = data.shipments.find((x) => x.id === one[1]);
      return s ? json(res, s) : problem(res, 404, "No shipment with this number");
    }
    if (url.pathname === "/v1/shipments") {
      const cmr = url.searchParams.get("cmr");
      const ref = url.searchParams.get("customerReference");
      const account = url.searchParams.get("accountId");
      if ((cmr ? 1 : 0) + (ref ? 1 : 0) !== 1 || (ref && !account)) return problem(res, 400, "Use cmr, or customerReference with accountId");
      const items = data.shipments.filter((s) => (cmr ? s.cmr === cmr : s.accountId === account && s.customerReference && norm(s.customerReference) === norm(ref)));
      return json(res, { items: items.slice(0, 1) });
    }
    if (url.pathname === "/v1/accounts/by-sender") {
      const email = (url.searchParams.get("email") || "").toLowerCase();
      const domain = email.split("@")[1];
      const links = data.accounts.flatMap((a) => (a.contacts.includes(email) ? [{ accountId: a.id, level: "contact" }]
        : !data.freemailDomains.includes(domain) && a.domains.includes(domain) ? [{ accountId: a.id, level: "domain" }] : []));
      return json(res, { links });
    }
    return problem(res, 404, "Not found");
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4010);
  createMockServer().listen(port, () => console.log(`TMS mock on http://localhost:${port}/v1 (any Bearer token)`));
}
