// Creates publisher, solution, tables, columns, lookups, alternate keys and environment variables
// from ../model.json. Idempotent: existing components are skipped, so it can be re-run safely.
import { readFileSync } from "node:fs";
import { CONFIG, label, get, post, idFrom } from "./dv.mjs";

const model = JSON.parse(readFileSync(new URL("../model.json", import.meta.url)));
const P = CONFIG.publisher;
const schemaName = (logical) => logical.replace(/_([a-z])/, (_m, c) => `_${c.toUpperCase()}`);
const log = (...a) => console.log(...a);

async function ensurePublisher() {
  const found = await get(`publishers?$select=publisherid&$filter=uniquename eq '${P.uniquename}'`, { solution: null });
  if (found.json.value.length) return found.json.value[0].publisherid;
  const res = await post("publishers", { uniquename: P.uniquename, friendlyname: P.friendlyname, customizationprefix: P.prefix, customizationoptionvalueprefix: P.optionPrefix, description: "Fictional publisher for the portfolio case logistics-ai-automation-case-study." }, { solution: null });
  log("publisher created");
  return idFrom(res);
}

async function ensureSolution(publisherId) {
  const found = await get(`solutions?$select=solutionid&$filter=uniquename eq '${CONFIG.solution}'`, { solution: null });
  if (found.json.value.length) return;
  await post("solutions", { uniquename: CONFIG.solution, friendlyname: "Corlaan customer email (portfolio)", version: "1.0.0.0", description: "Where is my delivery? Inbound customer email: agent reads, flow looks up and applies 18 policy rules, replies or routes. Fictional data. Source: github.com/phlppgdfry/logistics-ai-automation-case-study", "publisherid@odata.bind": `/publishers(${publisherId})` }, { solution: null });
  log("solution created");
}

async function tableExists(name) {
  return (await get(`EntityDefinitions(LogicalName='${name}')?$select=LogicalName`, { allow: [404] })).status === 200;
}
// one metadata call per table instead of one per column (developer environments can be slow)
const attributeCache = new Map();
async function attributeExists(table, name) {
  if (!attributeCache.has(table)) {
    const r = await get(`EntityDefinitions(LogicalName='${table}')/Attributes?$select=LogicalName`, { solution: null });
    attributeCache.set(table, new Set(r.json.value.map((a) => a.LogicalName)));
  }
  return attributeCache.get(table).has(name);
}

function attributeMetadata([name, type, display, extra]) {
  const base = { SchemaName: schemaName(name), DisplayName: label(display), RequiredLevel: { Value: "None", CanBeChanged: true, ManagedPropertyLogicalName: "canmodifyrequirementlevelsettings" } };
  switch (type) {
    case "text": return { "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata", ...base, MaxLength: extra ?? 100, FormatName: { Value: "Text" } };
    case "memo": return { "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata", ...base, MaxLength: extra ?? 2000, Format: "TextArea" };
    case "int": return { "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata", ...base, MinValue: -2147483648, MaxValue: 2147483647, Format: "None" };
    case "decimal": return { "@odata.type": "Microsoft.Dynamics.CRM.DecimalAttributeMetadata", ...base, Precision: 2, MinValue: -100000000000, MaxValue: 100000000000 };
    case "datetime": return { "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata", ...base, Format: "DateAndTime", DateTimeBehavior: { Value: "TimeZoneIndependent" } };
    case "choice": {
      const options = model.choices[extra];
      return { "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata", ...base, OptionSet: { "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata", IsGlobal: false, OptionSetType: "Picklist", Options: Object.entries(options).map(([v, l]) => ({ Value: Number(v), Label: label(l) })) } };
    }
    default: throw new Error(`unknown type ${type}`);
  }
}

async function ensureTable(t) {
  if (await tableExists(t.name)) { log(`table ${t.name} exists`); return; }
  const [pName, pDisplay, auto] = t.primary;
  const primary = { "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata", SchemaName: schemaName(pName), IsPrimaryName: true, MaxLength: 100, FormatName: { Value: "Text" }, DisplayName: label(pDisplay), RequiredLevel: { Value: auto ? "None" : "ApplicationRequired" }, ...(auto ? { AutoNumberFormat: auto } : {}) };
  await post("EntityDefinitions", {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    SchemaName: schemaName(t.name), DisplayName: label(t.display), DisplayCollectionName: label(t.plural),
    Description: label(`${t.display} — Corlaan portfolio case (fictional)`), OwnershipType: t.ownership, IsActivity: false, HasActivities: false, HasNotes: false,
    Attributes: [primary],
  });
  log(`table ${t.name} created`);
}

async function ensureColumns(t) {
  for (const col of t.columns ?? []) {
    if (await attributeExists(t.name, col[0])) continue;
    await post(`EntityDefinitions(LogicalName='${t.name}')/Attributes`, attributeMetadata(col));
    log(`  + ${t.name}.${col[0]}`);
  }
}

async function ensureLookups(t) {
  for (const [name, target, display] of t.lookups ?? []) {
    if (await attributeExists(t.name, name)) continue;
    await post("RelationshipDefinitions", {
      "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
      SchemaName: `crl_${target.replace(/^crl_/, "")}_${t.name.replace(/^crl_/, "")}_${name.replace(/^crl_/, "")}`,
      ReferencedEntity: target, ReferencingEntity: t.name,
      CascadeConfiguration: { Assign: "NoCascade", Delete: target === "crl_inboundemail" ? "Cascade" : "RemoveLink", Merge: "NoCascade", Reparent: "NoCascade", Share: "NoCascade", Unshare: "NoCascade" },
      Lookup: { "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata", AttributeType: "Lookup", AttributeTypeName: { Value: "LookupType" }, SchemaName: schemaName(name), DisplayName: label(display), RequiredLevel: { Value: "None" } },
    });
    log(`  ↳ lookup ${t.name}.${name} → ${target}`);
  }
}

async function ensureKeys(t) {
  for (const attrs of t.keys ?? []) {
    const keyName = `${t.name}_${attrs.join("_").replace(/crl_/g, "")}_key`;
    const existing = await get(`EntityDefinitions(LogicalName='${t.name}')/Keys?$select=LogicalName`);
    if (existing.json.value.some((k) => k.LogicalName === keyName)) continue;
    await post(`EntityDefinitions(LogicalName='${t.name}')/Keys`, { SchemaName: keyName, DisplayName: label(`Key ${attrs.join(", ")}`), KeyAttributes: attrs });
    log(`  ⚿ key ${keyName}`);
  }
}

async function ensureEnvironmentVariables() {
  const TYPES = { string: 100000000, decimal: 100000001, boolean: 100000002, json: 100000003 };
  for (const v of model.environmentVariables) {
    const found = await get(`environmentvariabledefinitions?$select=environmentvariabledefinitionid&$filter=schemaname eq '${v.schemaName}'`);
    if (found.json.value.length) continue;
    await post("environmentvariabledefinitions", { schemaname: v.schemaName, displayname: v.display, type: TYPES[v.type], defaultvalue: v.value, description: "Corlaan portfolio case: threshold or setting, changeable without a release. See docs/02-design/policy-rules.md." });
    log(`  env var ${v.schemaName}`);
  }
}

const publisherId = await ensurePublisher();
await ensureSolution(publisherId);
for (const t of model.tables) await ensureTable(t);
for (const t of model.tables) await ensureColumns(t);
for (const t of model.tables) await ensureLookups(t);
for (const t of model.tables) await ensureKeys(t);
await ensureEnvironmentVariables();
// publish only this solution's tables (a full PublishAllXml also publishes other projects in a shared environment)
await post("PublishXml", { ParameterXml: `<importexportxml><entities>${model.tables.map((t) => `<entity>${t.name}</entity>`).join("")}</entities></importexportxml>` });
log("published");
