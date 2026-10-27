// Loads the fictional TMS data (data/tms.json) into the sandbox tables and sets the environment
// variables that are generated from code (reply templates) or kept local (the reviewer).
// Upserts by alternate key, so it can be re-run.
import { readFileSync } from "node:fs";
import { CONFIG, get, post, patch } from "./dv.mjs";
import { TEMPLATES } from "../../src/compose.mjs";

const tms = JSON.parse(readFileSync(new URL("../../data/tms.json", import.meta.url)));
const model = JSON.parse(readFileSync(new URL("../model.json", import.meta.url)));
const opt = (choice, label) => Number(Object.entries(model.choices[choice]).find(([, l]) => l === label)[0]);
const o = { solution: null };
const key = (v) => encodeURIComponent(v.replace(/'/g, "''"));

for (const a of tms.accounts) {
  await patch(`crl_customeraccounts(crl_code='${key(a.id)}')`, { crl_name: a.name, crl_domains: a.domains.join(",") }, o);
  for (const c of a.contacts) {
    await patch(`crl_customercontacts(crl_email='${key(c)}')`, { "crl_Account@odata.bind": `/crl_customeraccounts(crl_code='${key(a.id)}')` }, o);
  }
}
console.log(`${tms.accounts.length} accounts, ${tms.accounts.flatMap((a) => a.contacts).length} contacts`);

for (const s of tms.shipments) {
  await patch(`crl_shipments(crl_shipmentno='${key(s.id)}')`, {
    "crl_Account@odata.bind": `/crl_customeraccounts(crl_code='${key(s.accountId)}')`,
    crl_accountcode: s.accountId,
    crl_customerref: s.customerReference ?? null,
    crl_cmr: s.cmr ?? null,
    crl_status: opt("shipmentStatus", s.status),
    crl_carrier: opt("carrier", s.carrier ?? "own"),
    crl_haulier: s.carrierName ?? null,
    crl_lasteventat: s.lastEvent?.at ?? null,
    crl_lasteventlocation: s.lastEvent?.location ?? null,
    crl_etafrom: s.eta?.from ?? null,
    crl_etato: s.eta?.to ?? null,
    crl_promisedfrom: s.promisedSlot?.from ?? null,
    crl_promisedto: s.promisedSlot?.to ?? null,
    crl_pickupdate: s.pickupDate ?? null,
    crl_deliveredat: s.deliveredAt ?? null,
    crl_consigneename: s.consignee?.name ?? null,
    crl_consigneeemail: s.consignee?.email ?? null,
    crl_exceptioncode: s.exception?.code ?? null,
    crl_exceptionnote: s.exception?.note ?? null,
    crl_receivedby: s.receivedBy ?? null,
  }, o);
}
console.log(`${tms.shipments.length} shipments`);

// environment variable current values
export async function setEnv(schema, value) {
  const def = (await get(`environmentvariabledefinitions?$select=environmentvariabledefinitionid&$filter=schemaname eq '${schema}'`, o)).json.value[0];
  const cur = (await get(`environmentvariablevalues?$select=environmentvariablevalueid&$filter=_environmentvariabledefinitionid_value eq ${def.environmentvariabledefinitionid}`, o)).json.value[0];
  if (cur) await patch(`environmentvariablevalues(${cur.environmentvariablevalueid})`, { value }, o);
  else await post("environmentvariablevalues", { schemaname: `${schema}_value`, value, "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${def.environmentvariabledefinitionid})` }, o); // values stay out of the solution: they belong to deployment-settings/<env>.json
}
await setEnv("crl_FreemailDomains", tms.freemailDomains.join(","));
if (CONFIG.reviewer) await setEnv("crl_ReviewerEmail", CONFIG.reviewer);
console.log("environment variables set (free-mail domains, reviewer)");

// reply templates: one row per language, generated from src/compose.mjs (environment variables hold at most 2,000 characters)
for (const [lang, t] of Object.entries(TEMPLATES)) {
  await patch(`crl_replytemplates(crl_language='${lang}')`, { crl_templates: JSON.stringify(t) }, o);
}
console.log(`reply templates: ${Object.keys(TEMPLATES).join(", ")}`);
