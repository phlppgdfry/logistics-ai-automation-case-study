// Governance as checks: the flows stay inside the DLP policy, every environment gets every setting,
// no secret sits in a settings file, and the kill switch exists. See docs/07-governance/governance-and-run.md.
import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "./helpers.mjs";
import { FLOWS, CONNECTION_REFERENCES } from "../power-platform/flows/definitions.mjs";

const dlp = readJson("power-platform/governance/dlp-policy.prod.json");
const model = readJson("power-platform/model.json");
const S = new Proxy({}, { get: (_o, k) => `${String(k)}s` });
const definitions = FLOWS.map((f) => ({ name: f.name, def: f.build(S) }));

function* actions(node) {
  for (const [name, a] of Object.entries(node ?? {})) {
    yield [name, a];
    yield* actions(a.actions);
    yield* actions(a.else?.actions);
  }
}
const allActions = definitions.flatMap(({ name, def }) => [...actions(def.actions), ...Object.entries(def.triggers)].map(([n, a]) => ({ flow: name, name: n, action: a })));

test("every connector the flows use is in the DLP business group", () => {
  const business = new Set(dlp.connectorGroups.find((g) => g.classification === "Confidential").connectors.map((c) => c.id.split("/").pop()));
  const used = new Set(allActions.map((a) => a.action.inputs?.host?.apiId?.split("/").pop()).filter(Boolean));
  assert.ok(used.size >= 3);
  for (const api of used) assert.ok(business.has(api), `${api} is used but not allowed by the DLP policy`);
  for (const api of Object.keys(CONNECTION_REFERENCES)) assert.ok(business.has(api), api);
});

test("no flow uses an HTTP action, so data can only leave through governed connectors", () => {
  for (const a of allActions) assert.ok(!dlp.builtInActionsBlocked.includes(a.action.type), `${a.flow} › ${a.name} is ${a.action.type}`);
});

test("the default connector group is blocked, so a new connector needs a decision", () => {
  assert.equal(dlp.defaultConnectorsClassification, "Blocked");
});

for (const env of ["test", "prod"]) {
  test(`deployment settings for ${env} cover every environment variable and connection reference, without secrets`, () => {
    const settings = readJson(`power-platform/deployment-settings/${env}.json`);
    const vars = new Set(settings.EnvironmentVariables.map((v) => v.SchemaName));
    for (const v of model.environmentVariables) assert.ok(vars.has(v.schemaName), `${env}: ${v.schemaName} missing`);
    const refs = new Set(settings.ConnectionReferences.map((r) => r.LogicalName));
    for (const r of Object.values(CONNECTION_REFERENCES)) assert.ok(refs.has(r.connection.connectionReferenceLogicalName), `${env}: ${r.connection.connectionReferenceLogicalName}`);
    assert.doesNotMatch(JSON.stringify({ ...settings, _note: undefined }), /password|secret|apikey|"Value":"[A-Za-z0-9+/]{40,}"/i);
  });
}

test("production starts in draft-only mode and never on the test clock", () => {
  const prod = Object.fromEntries(readJson("power-platform/deployment-settings/prod.json").EnvironmentVariables.map((v) => [v.SchemaName, v.Value]));
  assert.equal(prod.crl_Mode, "draft-only");
  assert.equal(prod.crl_ClockOverride, "");
});

test("the kill switch: crl_Mode is read on every run, and with off the reading flow stops before it does anything", () => {
  const read = definitions.find((d) => d.name.startsWith("CRL-01")).def;
  const first = Object.entries(read.actions).find(([, a]) => !a.runAfter || !Object.keys(a.runAfter).length);
  assert.equal(first[0], "Read_mode");
  assert.match(JSON.stringify(first[1].inputs.parameters), /crl_Mode/);
  const kill = read.actions.Kill_switch;
  assert.deepEqual(Object.keys(kill.runAfter), ["Read_mode"]);
  assert.match(JSON.stringify(kill.expression), /off/);
  assert.equal(kill.actions.Stop_automation_is_off.type, "Terminate");
  // not a workflow parameter: a parameter keeps the value the flow had when it was saved
  assert.doesNotMatch(JSON.stringify(read.parameters), /crl_Mode/);
});

test("thresholds are environment variables, not numbers in the flow", () => {
  const decideDef = definitions.find((d) => d.name.startsWith("CRL-02")).def;
  const decide = JSON.stringify(decideDef.actions);
  for (const schema of ["crl_ConfidenceMin", "crl_StaleHours", "crl_MaxReferences", "crl_MaxAutoRepliesPerDay"]) assert.ok(decide.includes(schema) && JSON.stringify(decideDef.parameters).includes(schema), schema);
  assert.ok(decide.includes("crl_Mode"), "draft-only mode is read at run time");
  assert.doesNotMatch(decide, /0\.75|less\([^)]*, 4\)/);
});
