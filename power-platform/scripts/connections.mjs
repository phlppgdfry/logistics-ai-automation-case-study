// Creates (or finds) the connections the flows need, owned by the signed-in maker, and writes their
// ids to ../connections.json. OAuth connectors (Dataverse, Copilot Studio) need a one-time consent:
// the script prints a sign-in link; open it, pick the maker account, then run the script again.
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CONFIG, token } from "./dv.mjs";

const APIS = ["shared_commondataserviceforapps", "shared_approvals", "shared_microsoftcopilotstudio"];
const ENV = CONFIG.environmentId;
const H = () => ({ Authorization: `Bearer ${token("https://service.powerapps.com/")}`, "Content-Type": "application/json" });
const base = (api) => `https://api.powerapps.com/providers/Microsoft.PowerApps/apis/${api}/connections`;
const q = `api-version=2016-11-01&$filter=environment eq '${ENV}'`;
const file = new URL("../connections.json", import.meta.url);
const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

for (const api of APIS) {
  const list = await (await fetch(`${base(api)}?${q}`, { headers: H() })).json();
  let conn = (list.value ?? []).find((c) => c.properties.displayName?.startsWith("Corlaan"));
  if (!conn) {
    const id = randomUUID().replace(/-/g, "");
    const res = await fetch(`${base(api)}/${id}?${q}`, { method: "PUT", headers: H(), body: JSON.stringify({ properties: { displayName: `Corlaan — ${api.replace("shared_", "")}`, environment: { id: `/providers/Microsoft.PowerApps/environments/${ENV}`, name: ENV } } }) });
    conn = await res.json();
    if (!res.ok) { console.log(api, res.status, JSON.stringify(conn).slice(0, 300)); continue; }
  }
  const status = (conn.properties.statuses ?? []).map((s) => s.status).join(",");
  console.log(`${api}: ${conn.name} [${status}]`);
  saved[api] = conn.name;
  if (status !== "Connected") {
    const r = await fetch(`${base(api)}/${conn.name}/getConsentLink?${q}`, { method: "POST", headers: H(), body: JSON.stringify({ redirectUrl: "https://make.powerautomate.com/" }) });
    const j = await r.json();
    console.log(`  consent needed: ${j.value?.[0]?.consentLink ?? JSON.stringify(j).slice(0, 200)}`);
  }
}
writeFileSync(file, `${JSON.stringify({ _note: "Connections in the lab environment, owned by the maker. A connection holds no secret here; the connection references in the solution point to them.", ...Object.fromEntries(Object.entries(saved).filter(([k]) => k !== "_note")) }, null, 2)}\n`);
