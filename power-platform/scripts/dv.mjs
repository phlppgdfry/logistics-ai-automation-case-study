// Minimal Dataverse Web API client for the provisioning scripts.
// Token: Azure CLI, signed in as a maker of the environment (az login --tenant <tenant>).
// Environment URL and tenant id come from ../environment.local.json (not committed) or CRL_URL / CRL_TENANT_ID.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

export const CONFIG = JSON.parse(readFileSync(new URL("../environment.json", import.meta.url)));
try { Object.assign(CONFIG, JSON.parse(readFileSync(new URL("../environment.local.json", import.meta.url)))); } catch { /* optional */ }
if (process.env.CRL_URL) CONFIG.url = process.env.CRL_URL;
if (process.env.CRL_TENANT_ID) CONFIG.tenantId = process.env.CRL_TENANT_ID;
if (!CONFIG.url || !CONFIG.tenantId) throw new Error("Set url and tenantId in power-platform/environment.local.json");
export const ORG = CONFIG.url.replace(/\/$/, "");
const BASE = `${ORG}/api/data/v9.2`;
const tokens = new Map();

export function token(resource = ORG) {
  const t = tokens.get(resource);
  if (t && Date.now() - t.at < 40 * 60_000) return t.value;
  // Own Azure CLI profile (~/.azure-corlaan, default account = the maker), so another session that
  // switches the global az account cannot break a running build.
  const env = { ...process.env, AZURE_CONFIG_DIR: process.env.CRL_AZURE_CONFIG_DIR ?? `${homedir()}/.azure-corlaan` };
  const value = execSync(`az account get-access-token --tenant ${CONFIG.tenantId} --resource ${resource} --query accessToken -o tsv`, { encoding: "utf8", env }).trim();
  tokens.set(resource, { value, at: Date.now() });
  return value;
}

export const label = (text) => ({ "@odata.type": "Microsoft.Dynamics.CRM.Label", LocalizedLabels: [{ "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: text, LanguageCode: 1033 }] });

export async function api(method, path, body, { solution = CONFIG.solution, headers = {}, allow = [] } = {}) {
  for (let attempt = 0; attempt < 12; attempt++) {
    let res;
    try {
      res = await fetch(path.startsWith("http") ? path : `${BASE}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.include-annotations="*"',
        ...(solution ? { "MSCRM.SolutionUniqueName": solution } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      // network hiccup or a slow environment: wait and retry
      if (attempt < 11) { await new Promise((r) => setTimeout(r, 5000 * (attempt + 1))); continue; }
      throw e;
    }
    const text = await res.text();
    const json = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : {};
    if (res.ok || allow.includes(res.status)) return { status: res.status, json, headers: res.headers };
    const msg = json?.error?.message ?? text;
    // metadata locks and throttling: wait and retry
    if ([429, 503].includes(res.status) || /elastic pool|Generic SQL error|customization lock|another \[?import|try again|0x80071151|being imported/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      continue;
    }
    const err = new Error(`${method} ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  throw new Error(`${method} ${path}: gave up after retries`);
}

export const get = (p, o) => api("GET", p, undefined, o);
export const post = (p, b, o) => api("POST", p, b, o);
export const patch = (p, b, o) => api("PATCH", p, b, o);
export const del = (p, o) => api("DELETE", p, undefined, o);
export const idFrom = (res) => res.headers.get("OData-EntityId")?.match(/\(([0-9a-f-]{36})\)/)?.[1];

// all rows of a query, following @odata.nextLink
export async function all(path, o = { solution: null }) {
  const rows = [];
  let next = path;
  while (next) {
    const r = await get(next, o);
    rows.push(...r.json.value);
    next = r.json["@odata.nextLink"];
  }
  return rows;
}
