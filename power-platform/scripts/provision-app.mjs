// Model-driven app "Corlaan Customer Service": main forms, default views, a "Drafts awaiting review"
// view, sitemap with the KPI dashboard first, and the app module. Idempotent.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { get, post, patch, CONFIG } from "./dv.mjs";
const DASHBOARD = "Corlaan — Customer email"; // same name as in provision-dashboard.mjs (importing it would run it)
import { OPT } from "../flows/definitions.mjs";

const model = JSON.parse(readFileSync(new URL("../model.json", import.meta.url)));
const byName = Object.fromEntries(model.tables.map((t) => [t.name, t]));
const CLASS = { text: "{4273EDBD-AC1D-40d3-9FB2-095C621B552D}", memo: "{E0DECE4B-6FC8-4a8f-A065-082708572369}", int: "{C6D124CA-7EDA-4a60-AEA9-7FB8D318B68F}", decimal: "{C3EFE0C3-0EC6-42be-8349-CBD9079DFD8E}", datetime: "{5B773807-9FB2-42db-97C3-7A91EFF8ADFF}", choice: "{3EF39988-22BB-4f0b-BBBE-64B5A3748AEE}", lookup: "{270BD3DB-D9AF-4782-9025-509E298DEC0A}" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const g = () => `{${randomUUID()}}`;

const VIEW = {
  crl_inboundemail: ["crl_name", "crl_testcase", "crl_from", "crl_subject", "crl_status", "crl_action", "crl_template", "crl_queue", "crl_rules", "crl_shipments", "crl_batch"],
  crl_reply: ["crl_name", "crl_to", "crl_subject", "crl_status", "crl_heldby", "crl_reviewedby", "crl_reviewedon", "crl_inboundemail"],
  crl_shipment: ["crl_shipmentno", "crl_accountcode", "crl_customerref", "crl_cmr", "crl_status", "crl_carrier", "crl_lasteventat", "crl_etato", "crl_promisedto"],
  crl_customeraccount: ["crl_name", "crl_code", "crl_domains"],
  crl_customercontact: ["crl_email", "crl_account"],
  crl_replytemplate: ["crl_language", "modifiedon"],
};
const SUBGRIDS = { crl_inboundemail: [["crl_reply", "crl_inboundemail_reply_inboundemail", "Replies"]] };

const columnsOf = (t) => [[t.primary[0], "text", t.primary[1]], ...(t.lookups ?? []).map(([n, , d]) => [n, "lookup", d]), ...(t.columns ?? [])];
const cell = ([name, type, display]) => `<cell id="${g()}"><labels><label description="${esc(display)}" languagecode="1033" /></labels><control id="${name}" classid="${CLASS[type]}" datafieldname="${name}" /></cell>`;
const section = (title, cols) => `<section showlabel="true" showbar="false" IsUserDefined="0" id="${g()}"><labels><label description="${esc(title)}" languagecode="1033" /></labels><rows>${cols.map((c) => `<row>${cell(c)}</row>`).join("")}</rows></section>`;

async function subgridXml(child, rel, label) {
  const view = (await get(`savedqueries?$select=savedqueryid&$filter=returnedtypecode eq '${child}' and querytype eq 2`, { solution: null })).json.value[0];
  const vid = `{${view.savedqueryid}}`;
  return `<section showlabel="true" showbar="false" IsUserDefined="0" id="${g()}"><labels><label description="${esc(label)}" languagecode="1033" /></labels><rows><row><cell id="${g()}" rowspan="6" colspan="1"><labels><label description="${esc(label)}" languagecode="1033" /></labels><control id="sg_${child}" classid="{E7A81278-8635-4d9e-8D4D-59480B391C5B}" indicationOfSubgrid="true" uniqueid="${g()}"><parameters><RecordsPerPage>10</RecordsPerPage><AutoExpand>Fixed</AutoExpand><EnableQuickFind>false</EnableQuickFind><EnableViewPicker>false</EnableViewPicker><EnableJumpBar>false</EnableJumpBar><ChartGridMode>Grid</ChartGridMode><VisualizationId /><IsUserView>false</IsUserView><ViewId>${vid}</ViewId><TargetEntityType>${child}</TargetEntityType><ViewIds>${vid}</ViewIds><RelationshipName>${rel}</RelationshipName></parameters></control></cell></row><row /><row /><row /><row /><row /></rows></section>`;
}

// email form: the decision first, then the email, then what the agent read
const EMAIL_SECTIONS = [
  ["Decision", ["crl_status", "crl_action", "crl_template", "crl_queue", "crl_rules", "crl_shipments", "crl_error"]],
  ["Email", ["crl_name", "crl_testcase", "crl_batch", "crl_from", "crl_subject", "crl_dmarc", "crl_receivedon", "crl_autorepliestoday", "crl_freshtext", "crl_quotedtext"]],
  ["Reading (agent)", ["crl_reader", "crl_language", "crl_intent", "crl_confidence", "crl_agentoutput", "crl_findings", "crl_headers", "crl_body"]],
];

for (const t of model.tables) {
  const cols = columnsOf(t);
  const subs = await Promise.all((SUBGRIDS[t.name] ?? []).map(([c, r, l]) => subgridXml(c, r, l)));
  let columnsXml;
  if (t.name === "crl_inboundemail") {
    const find = (n) => cols.find((c) => c[0] === n);
    columnsXml = `<column width="33%"><sections>${section(EMAIL_SECTIONS[0][0], EMAIL_SECTIONS[0][1].map(find))}</sections></column><column width="33%"><sections>${section(EMAIL_SECTIONS[1][0], EMAIL_SECTIONS[1][1].map(find))}</sections></column><column width="34%"><sections>${section(EMAIL_SECTIONS[2][0], EMAIL_SECTIONS[2][1].map(find))}</sections></column>`;
  } else {
    const half = Math.ceil(cols.length / 2);
    columnsXml = `<column width="50%"><sections>${section("General", cols.slice(0, half))}</sections></column><column width="50%"><sections>${section("Details", cols.slice(half))}</sections></column>`;
  }
  const formxml = `<form><tabs><tab verticallayout="true" id="${g()}" IsUserDefined="1"><labels><label description="${esc(t.display)}" languagecode="1033" /></labels><columns>${columnsXml}</columns></tab>${subs.length ? `<tab verticallayout="true" id="${g()}" IsUserDefined="1"><labels><label description="Related" languagecode="1033" /></labels><columns><column width="100%"><sections>${subs.join("")}</sections></column></columns></tab>` : ""}</tabs></form>`;
  const form = (await get(`systemforms?$select=formid&$filter=objecttypecode eq '${t.name}' and type eq 2`, { solution: null })).json.value[0];
  await patch(`systemforms(${form.formid})`, { formxml, name: t.display });

  const viewCols = VIEW[t.name] ?? cols.slice(0, 6).map((c) => c[0]);
  const q = (await get(`savedqueries?$select=savedqueryid,layoutxml&$filter=returnedtypecode eq '${t.name}' and querytype eq 0 and isdefault eq true`, { solution: null })).json.value[0];
  const object = q.layoutxml.match(/object="(\d+)"/)[1];
  const layout = (c) => `<grid name="resultset" object="${object}" jump="${t.primary[0]}" select="1" icon="1" preview="1"><row name="result" id="${t.name}id">${c.map((x) => `<cell name="${x}" width="${x === t.primary[0] ? 140 : 130}" />`).join("")}</row></grid>`;
  const fetch = (c, extra = "") => `<fetch version="1.0" mapping="logical"><entity name="${t.name}">${c.map((x) => `<attribute name="${x}" />`).join("")}<attribute name="${t.name}id" /><order attribute="createdon" descending="true" /><filter type="and"><condition attribute="statecode" operator="eq" value="0" />${extra}</filter></entity></fetch>`;
  await patch(`savedqueries(${q.savedqueryid})`, { layoutxml: layout(viewCols), fetchxml: fetch(viewCols) });

  // the reviewers' work list
  if (t.name === "crl_reply") {
    const name = "Drafts awaiting review";
    const body = { name, returnedtypecode: "crl_reply", querytype: 0, layoutxml: layout(viewCols), fetchxml: fetch(viewCols, `<condition attribute="crl_status" operator="eq" value="${OPT.reply.review}" />`), description: "Held replies a colleague still has to approve or reject (flow CRL-03)." };
    const found = (await get(`savedqueries?$select=savedqueryid&$filter=returnedtypecode eq 'crl_reply' and name eq '${name}'`, { solution: null })).json.value[0];
    if (found) await patch(`savedqueries(${found.savedqueryid})`, body);
    else await post("savedqueries", body);
  }
  console.log(`form + view ${t.name}`);
}

const AREAS = [
  ["crl_area_mail", "Customer email", [["Mailbox", ["crl_inboundemail", "crl_reply"]]]],
  ["crl_area_tms", "TMS sandbox", [["Master data", ["crl_shipment", "crl_customeraccount", "crl_customercontact"]]]],
  ["crl_area_settings", "Settings", [["Replies", ["crl_replytemplate"]]]],
];
const T = (s) => `<Titles><Title LCID="1033" Title="${esc(s)}" /></Titles>`;
const dash = (await get(`systemforms?$select=formid&$filter=type eq 0 and name eq '${DASHBOARD}'`, { solution: null })).json.value[0];
const dashArea = dash ? `<Area Id="crl_area_overview" ShowGroups="true">${T("Overview")}<Group Id="crl_area_overview_g0" IsProfile="false">${T("KPIs")}<SubArea Id="crl_dashboard" Url="/main.aspx?pagetype=dashboard&amp;id=${dash.formid}&amp;type=system" DefaultDashboard="${dash.formid}">${T("KPI dashboard")}</SubArea></Group></Area>` : "";
const sitemapxml = `<SiteMap IntroducedVersion="7.0.0.0">${dashArea}${AREAS.map(([id, title, groups]) => `<Area Id="${id}" ShowGroups="true">${T(title)}${groups.map(([gt, ents], i) => `<Group Id="${id}_g${i}" IsProfile="false">${T(gt)}${ents.map((e) => `<SubArea Id="${id}_${e}" Entity="${e}">${T(byName[e].plural)}</SubArea>`).join("")}</Group>`).join("")}</Area>`).join("")}</SiteMap>`;
let sm = (await get("sitemaps?$select=sitemapid&$filter=sitemapnameunique eq 'crl_customerservice'", { solution: null })).json.value[0];
if (sm) await patch(`sitemaps(${sm.sitemapid})`, { sitemapxml });
else sm = { sitemapid: (await post("sitemaps", { sitemapname: "Corlaan Customer Service", sitemapnameunique: "crl_customerservice", sitemapxml, isappaware: true })).headers.get("OData-EntityId").match(/\(([0-9a-f-]{36})\)/)[1] };

let app = (await get("appmodules?$select=appmoduleid&$filter=uniquename eq 'crl_CorlaanCustomerService'", { solution: null })).json.value[0];
if (!app) app = { appmoduleid: (await post("appmodules", { name: "Corlaan Customer Service", uniquename: "crl_CorlaanCustomerService", description: "Backoffice for the customer email automation (fictional): every email with its decision and rules, held replies to review, the TMS sandbox and the reply templates.", clienttype: 4, navigationtype: 0, formfactor: 1, webresourceid: "953b9fac-1e5e-e611-80d6-00155ded156f" })).headers.get("OData-EntityId").match(/\(([0-9a-f-]{36})\)/)[1] };
const entities = [];
for (const t of model.tables) entities.push({ "@odata.type": "Microsoft.Dynamics.CRM.entity", entityid: (await get(`EntityDefinitions(LogicalName='${t.name}')?$select=MetadataId`)).json.MetadataId });
const charts = (await get("savedqueryvisualizations?$select=savedqueryvisualizationid&$filter=startswith(name,'KPI ')", { solution: null })).json.value.map((c) => ({ "@odata.type": "Microsoft.Dynamics.CRM.savedqueryvisualization", savedqueryvisualizationid: c.savedqueryvisualizationid }));
await post("AddAppComponents", { AppId: app.appmoduleid, Components: [{ "@odata.type": "Microsoft.Dynamics.CRM.sitemap", sitemapid: sm.sitemapid }, ...entities, ...(dash ? [{ "@odata.type": "Microsoft.Dynamics.CRM.systemform", formid: dash.formid }] : []), ...charts] });
const v = await get(`ValidateApp(AppModuleId=${app.appmoduleid})`, { solution: null });
console.log("validate:", v.json.AppValidationResponse?.ValidationSuccess, (v.json.AppValidationResponse?.ValidationIssueList ?? []).map((i) => i.Message).slice(0, 5));
await post("PublishXml", { ParameterXml: `<importexportxml><appmodules><appmodule>${app.appmoduleid}</appmodule></appmodules><sitemaps><sitemap>${sm.sitemapid}</sitemap></sitemaps><entities>${model.tables.map((t) => `<entity>${t.name}</entity>`).join("")}</entities></importexportxml>` });
console.log(`app ${app.appmoduleid} published: ${CONFIG.url}/main.aspx?appid=${app.appmoduleid}`);
