// Runs the agent instructions (copilot-studio/instructions.md) on a real model in Azure AI Foundry and
// records what it returns for every email of the main set and the held-out set. The recording is
// committed (evaluation/runs/), so the build, the tests and the site replay it without calling a model.
//
//   node scripts/eval-model.mjs            all emails
//   node scripts/eval-model.mjs H01 E26    only these
//
// Configuration (not committed): evaluation/foundry.local.json
//   { "endpoint": "https://<resource>.cognitiveservices.azure.com", "deployment": "gpt-4.1-mini",
//     "tenantId": "<tenant of the Azure subscription>", "region": "germanywestcentral", "sku": "GlobalStandard" }
// Authentication: Microsoft Entra ID through the Azure CLI (role "Cognitive Services OpenAI User"). No keys.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { splitQuoted } from "../src/text.mjs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const cfg = JSON.parse(read("evaluation/foundry.local.json"));
const instructions = read("copilot-studio/instructions.md");
const schema = JSON.parse(read("copilot-studio/agent-output.schema.json"));

// Structured outputs accept a subset of JSON Schema: drop the keywords it does not support.
function strict(node) {
  if (Array.isArray(node)) return node.map(strict);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (["$schema", "title", "minimum", "maximum", "maxLength", "uniqueItems"].includes(k)) continue;
    out[k] = strict(v);
  }
  if (out.enum && !out.type) out.type = "string";
  return out;
}

export function agentInput(email) {
  const { fresh, quoted } = splitQuoted(email.body);
  return { subject: email.subject, freshText: fresh, quotedText: quoted, senderDomain: email.from.split("@")[1] };
}

let token = null;
function getToken() {
  token ??= execSync(`az account get-access-token --tenant ${cfg.tenantId} --resource https://cognitiveservices.azure.com --query accessToken -o tsv`, { encoding: "utf8" }).trim();
  return token;
}

async function call(email) {
  const url = `${cfg.endpoint.replace(/\/$/, "")}/openai/deployments/${cfg.deployment}/chat/completions?api-version=2024-10-21`;
  const body = {
    temperature: 0,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: JSON.stringify(agentInput(email)) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "mail_reading", strict: true, schema: strict(schema) } },
  };
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (res.ok) {
      const choice = json.choices[0];
      return { output: JSON.parse(choice.message.content), usage: json.usage, model: json.model, filtered: choice.finish_reason === "content_filter" };
    }
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 3000 * (attempt + 1))); continue; }
    // Prompt Shields / content filter refused the input: the flow treats this as R02 (route to security).
    if (res.status === 400 && json.error?.code === "content_filter") {
      const why = Object.entries(json.error.innererror?.content_filter_result ?? {}).filter(([, v]) => v?.filtered || v?.detected).map(([k]) => k);
      return { output: { blocked: true, blockedBy: why.length ? why : ["content_filter"] }, usage: { total_tokens: 0 }, model: null };
    }
    throw new Error(`${email.id}: ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  }
  throw new Error(`${email.id}: gave up after retries`);
}

const main = JSON.parse(read("data/emails.json")).emails;
const holdout = JSON.parse(read("data/emails-holdout.json")).emails;
const only = process.argv.slice(2);
const emails = [...main, ...holdout].filter((e) => !only.length || only.includes(e.id));

const file = new URL(`evaluation/runs/foundry-${cfg.deployment}.json`, root);
mkdirSync(new URL("evaluation/runs/", root), { recursive: true });
const run = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { outputs: {} };
let tokens = 0;
for (const email of emails) {
  const r = await call(email);
  run.outputs[email.id] = r.output;
  tokens += r.usage.total_tokens;
  run.model = r.model ?? run.model;
  if (r.output.blocked) { console.log(`${email.id} blocked by ${r.output.blockedBy.join(", ")}`); continue; }
  process.stdout.write(`${email.id} ${r.output.intent}/${r.output.confidence} ${r.output.references.map((x) => x.value).join(",")}${r.output.sensitive.length ? ` [${r.output.sensitive}]` : ""}${r.output.instructionSignals.length ? " [instruction]" : ""}\n`);
}
Object.assign(run, {
  reader: "Azure AI Foundry",
  deployment: cfg.deployment,
  sku: cfg.sku,
  region: cfg.region,
  temperature: 0,
  structuredOutput: true,
  instructionsSha256: createHash("sha256").update(instructions).digest("hex").slice(0, 16),
  recordedAt: new Date().toISOString().slice(0, 10),
  lastRunTokens: tokens,
});
run.outputs = Object.fromEntries(Object.entries(run.outputs).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(file, `${JSON.stringify(run, null, 2)}\n`);
console.log(`recorded ${emails.length} emails, ${tokens} tokens → ${file.pathname}`);
