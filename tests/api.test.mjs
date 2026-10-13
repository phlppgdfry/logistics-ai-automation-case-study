// The API contract, the mock server and the data agree.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createMockServer } from "../api/mock-server.mjs";
import { readJson } from "./helpers.mjs";

const spec = readJson("api/tms-shipments.swagger.json");
const tms = readJson("data/tms.json");
let server;
let base;

before(async () => {
  server = createMockServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}/v1`;
});
after(() => server.close());

const get = (path) => fetch(`${base}${path}`, { headers: { authorization: "Bearer test" } });

test("every shipment satisfies the contract (required fields, enums, id pattern)", () => {
  const def = spec.definitions.Shipment;
  const idPattern = new RegExp(spec.paths["/shipments/{shipmentId}"].get.parameters[0].pattern);
  for (const s of tms.shipments) {
    for (const field of def.required) assert.ok(s[field] !== undefined, `${s.id} missing ${field}`);
    assert.ok(def.properties.status.enum.includes(s.status), s.id);
    assert.ok(def.properties.carrier.enum.includes(s.carrier), s.id);
    assert.match(s.id, idPattern);
    if (s.status === "EXCEPTION") assert.ok(def.properties.exception.properties.code.enum.includes(s.exception.code));
  }
});

test("the client only has a read scope", () => {
  const scopes = Object.keys(spec.securityDefinitions.oauth2.scopes);
  assert.deepEqual(scopes, ["api://tms-corlaan/shipments.read"]);
  for (const path of Object.values(spec.paths)) assert.deepEqual(Object.keys(path), ["get"]);
});

test("GET /shipments/{id}", async () => {
  const res = await get("/shipments/CL-2026-0412345");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "IN_TRANSIT");
  assert.equal((await get("/shipments/CL-2026-0499999")).status, 404);
});

test("customer reference only within an account", async () => {
  assert.equal((await get("/shipments?customerReference=PO%20778120")).status, 400);
  const ok = await (await get("/shipments?customerReference=PO778120&accountId=A-400")).json();
  assert.equal(ok.items[0].id, "CL-2026-0412377");
  const other = await (await get("/shipments?customerReference=PO778120&accountId=A-100")).json();
  assert.equal(other.items.length, 0);
});

test("errors the flow has to handle: 401, 429 with Retry-After, 503", async () => {
  assert.equal((await fetch(`${base}/shipments/CL-2026-0412345`)).status, 401);
  const limited = await get("/shipments/CL-2026-0412345?simulate=429");
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "30");
  assert.equal((await get("/shipments/CL-2026-0412345?simulate=503")).status, 503);
});

test("sender links: contact, domain colleague, free-mail never matches a domain", async () => {
  const links = async (email) => (await (await get(`/accounts/by-sender?email=${encodeURIComponent(email)}`)).json()).links;
  assert.deepEqual(await links("orders@hortex.example"), [{ accountId: "A-400", level: "contact" }]);
  assert.deepEqual(await links("someone@hortex.example"), [{ accountId: "A-400", level: "domain" }]);
  assert.deepEqual(await links("hortex.orders@gmail.com"), []);
});
