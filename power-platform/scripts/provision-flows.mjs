// Writes the connection references and the cloud flows from ../flows/definitions.mjs into the
// solution. Existing flows (matched by name) are updated in place. --activate turns them on
// (needs connected connections, see scripts/connections.mjs). --only=CRL-02 limits to one flow.
import { readFileSync } from "node:fs";
import { get, post, patch } from "./dv.mjs";
import { FLOWS, CONNECTION_REFERENCES } from "../flows/definitions.mjs";

const conns = JSON.parse(readFileSync(new URL("../connections.json", import.meta.url)));
const activate = process.argv.includes("--activate");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

// entity set names for the definitions
const S = {};
for (const t of JSON.parse(readFileSync(new URL("../model.json", import.meta.url))).tables) {
  S[t.name] = (await get(`EntityDefinitions(LogicalName='${t.name}')?$select=EntitySetName`)).json.EntitySetName;
}

const NAMES = { crl_dataverse: "Corlaan — Microsoft Dataverse", crl_approvals: "Corlaan — Approvals", crl_copilotstudio: "Corlaan — Microsoft Copilot Studio" };
for (const [api, ref] of Object.entries(CONNECTION_REFERENCES)) {
  const logical = ref.connection.connectionReferenceLogicalName;
  const found = await get(`connectionreferences?$select=connectionreferenceid&$filter=connectionreferencelogicalname eq '${logical}'`);
  if (found.json.value.length) await patch(`connectionreferences(${found.json.value[0].connectionreferenceid})`, { connectionid: conns[api] });
  else await post("connectionreferences", { connectionreferencelogicalname: logical, connectionreferencedisplayname: NAMES[logical], connectorid: `/providers/Microsoft.PowerApps/apis/${api}`, connectionid: conns[api] });
  console.log(`connection reference ${logical} → ${conns[api]}`);
}

for (const f of FLOWS) {
  if (only && !f.name.startsWith(only)) continue;
  const clientdata = JSON.stringify({ properties: { connectionReferences: CONNECTION_REFERENCES, definition: f.build(S) }, schemaVersion: "1.0.0.0" });
  const found = await get(`workflows?$select=workflowid,statecode&$filter=name eq '${f.name}' and category eq 5`);
  let id = found.json.value[0]?.workflowid;
  if (id) {
    if (found.json.value[0].statecode === 1) await patch(`workflows(${id})`, { statecode: 0, statuscode: 1 });
    await patch(`workflows(${id})`, { clientdata, description: f.description });
    console.log(`updated ${f.name}`);
  } else {
    const res = await post("workflows", { category: 5, type: 1, primaryentity: "none", name: f.name, description: f.description, clientdata });
    id = res.headers.get("OData-EntityId").match(/\(([0-9a-f-]{36})\)/)[1];
    console.log(`created ${f.name}`);
  }
  if (activate) {
    try {
      await patch(`workflows(${id})`, { statecode: 1, statuscode: 2 });
      console.log("  ✓ on");
    } catch (e) {
      console.log(`  ✗ ${e.message.slice(0, 600)}`);
    }
  }
}
