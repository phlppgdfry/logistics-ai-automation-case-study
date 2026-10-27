// KPI dashboard "Corlaan — Customer email" for the model-driven app: system charts on the inbound
// email and reply tables, on one dashboard. Idempotent: charts and dashboard are matched by name.
// Run before provision-app.mjs, which puts the dashboard first in the sitemap.
import { randomUUID } from "node:crypto";
import { get, post, patch } from "./dv.mjs";

export const DASHBOARD = "Corlaan — Customer email";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const g = () => `{${randomUUID()}}`;

// [chart name, table, group-by column, type, the question it answers] — KPIs from docs/06-rollout/pilot-and-adoption.md
export const CHARTS = [
  ["KPI 1 · Emails per decision", "crl_inboundemail", "crl_action", "Pie", "Which share is answered automatically, held as a draft, routed or ignored?"],
  ["KPI 2 · Routed emails per queue", "crl_inboundemail", "crl_queue", "Bar", "Which team receives the routed emails (security, team lead, claims, customer service, planning, finance)?"],
  ["KPI 3 · Replies per status", "crl_reply", "crl_status", "Column", "Of the held drafts, how many were approved as they are and how many rejected?"],
  ["KPI 4 · Emails per intent", "crl_inboundemail", "crl_intent", "Bar", "What do customers ask: status, POD, slot change, invoice, cancellation?"],
  ["KPI 5 · Emails per language", "crl_inboundemail", "crl_language", "Pie", "Are French-speaking customers served as well as Dutch-speaking ones?"],
  ["KPI 6 · Emails per processing status", "crl_inboundemail", "crl_status", "Column", "Is anything stuck in Received, Read or Error?"],
];

const COLORS = "19,93,115; 124,198,220; 214,140,40; 120,120,120; 60,140,90; 180,60,60; 90,100,120";
function presentation(type) {
  const pie = type === "Pie";
  return `<Chart Palette="None" PaletteCustomColors="${COLORS}"><Series><Series ChartType="${type}" IsValueShownAsLabel="True" Font="{0}, 9.5px" LabelForeColor="59, 59, 59"${pie ? ' CustomProperties="PieLabelStyle=Inside, PieDrawingStyle=Default"' : ' Color="19,93,115" BorderWidth="0"'}><SmartLabelStyle Enabled="True" /></Series></Series><ChartAreas><ChartArea BorderColor="White" BorderDashStyle="Solid"><AxisY LabelAutoFitMinFontSize="8" TitleForeColor="59, 59, 59" TitleFont="{0}, 10.5px" LineColor="165, 172, 181" IntervalAutoMode="VariableCount"><MajorGrid LineColor="239, 242, 246" /><MajorTickMark LineColor="165, 172, 181" /><LabelStyle Font="{0}, 10.5px" ForeColor="59, 59, 59" /></AxisY><AxisX LabelAutoFitMinFontSize="8" TitleForeColor="59, 59, 59" TitleFont="{0}, 10.5px" LineColor="165, 172, 181" IntervalAutoMode="VariableCount"><MajorTickMark LineColor="165, 172, 181" /><MajorGrid LineColor="Transparent" /><LabelStyle Font="{0}, 10.5px" ForeColor="59, 59, 59" /></AxisX></ChartArea></ChartAreas><Titles><Title Alignment="TopLeft" DockingOffset="-3" Font="{0}, 13px" ForeColor="0, 0, 0"></Title></Titles>${pie ? '<Legends><Legend Alignment="Center" LegendStyle="Table" Docking="Right" IsEquallySpacedItems="True" Font="{0}, 11px" ShadowColor="0, 0, 0, 0" ForeColor="59, 59, 59" /></Legends>' : ""}</Chart>`;
}
const data = (table, groupBy) => `<datadefinition><fetchcollection><fetch mapping="logical" aggregate="true"><entity name="${table}"><attribute groupby="true" alias="groupby_column" name="${groupBy}" /><attribute alias="aggregate_column" name="${table}id" aggregate="count" /></entity></fetch></fetchcollection><categorycollection><category><measurecollection><measure alias="aggregate_column" /></measurecollection></category></categorycollection></datadefinition>`;

const ids = [];
for (const [name, table, groupBy, type, description] of CHARTS) {
  const body = { name, description, primaryentitytypecode: table, datadescription: data(table, groupBy), presentationdescription: presentation(type), isdefault: false };
  const found = (await get(`savedqueryvisualizations?$select=savedqueryvisualizationid&$filter=name eq '${name.replace(/'/g, "''")}'`, { solution: null })).json.value[0];
  let id = found?.savedqueryvisualizationid;
  if (id) await patch(`savedqueryvisualizations(${id})`, body);
  else id = (await post("savedqueryvisualizations", body)).headers.get("OData-EntityId").match(/\(([0-9a-f-]{36})\)/)[1];
  const view = (await get(`savedqueries?$select=savedqueryid&$filter=returnedtypecode eq '${table}' and querytype eq 0 and isdefault eq true`, { solution: null })).json.value[0];
  ids.push({ name, table, chart: id, view: view.savedqueryid });
  console.log(`chart ${name}`);
}

const cell = (c) => `<cell id="${g()}" showlabel="false" rowspan="12" colspan="1" auto="false"><labels><label description="${esc(c.name)}" languagecode="1033" /></labels><control id="chart_${c.chart.slice(0, 8)}" classid="{E7A81278-8635-4d9e-8D4D-59480B391C5B}"><parameters><ViewId>{${c.view}}</ViewId><IsUserView>false</IsUserView><RelationshipName /><TargetEntityType>${c.table}</TargetEntityType><AutoExpand>Fixed</AutoExpand><EnableQuickFind>false</EnableQuickFind><EnableViewPicker>false</EnableViewPicker><EnableJumpBar>false</EnableJumpBar><ChartGridMode>Chart</ChartGridMode><VisualizationId>{${c.chart}}</VisualizationId><IsUserChart>false</IsUserChart><EnableChartPicker>false</EnableChartPicker><RecordsPerPage>10</RecordsPerPage></parameters></control></cell>`;
const empties = (n) => Array.from({ length: n }, () => "<row />").join("");
const rows = [ids.slice(0, 3), ids.slice(3, 6)].map((r) => `<row>${r.map(cell).join("")}</row>${empties(11)}`).join("");
const formxml = `<form><tabs><tab name="overview" verticallayout="true" id="${g()}"><labels><label description="Overview" languagecode="1033" /></labels><columns><column width="100%"><sections><section name="kpi" showlabel="false" showbar="false" columns="111" id="${g()}"><labels><label description="KPIs" languagecode="1033" /></labels><rows>${rows}</rows></section></sections></column></columns></tab></tabs></form>`;

const description = "Customer email KPIs (fictional data): decisions, routed queues, draft reviews, intents, languages and processing status.";
let dash = (await get(`systemforms?$select=formid&$filter=type eq 0 and name eq '${DASHBOARD}'`, { solution: null })).json.value[0];
if (dash) await patch(`systemforms(${dash.formid})`, { formxml, description });
else dash = { formid: (await post("systemforms", { name: DASHBOARD, description, type: 0, objecttypecode: "none", formxml, isdefault: false })).headers.get("OData-EntityId").match(/\(([0-9a-f-]{36})\)/)[1] };
await post("PublishXml", { ParameterXml: `<importexportxml><dashboards><dashboard>{${dash.formid}}</dashboard></dashboards><entities>${[...new Set(CHARTS.map((c) => c[1]))].map((t) => `<entity>${t}</entity>`).join("")}</entities></importexportxml>` });
console.log(`dashboard ${dash.formid} — now run provision-app.mjs`);
