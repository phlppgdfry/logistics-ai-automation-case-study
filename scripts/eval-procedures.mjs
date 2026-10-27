// Runs the procedures agent's instructions with its four knowledge documents on the Azure AI Foundry
// model and records the answers (evaluation/runs/procedures-<deployment>.json). The documents are
// given in full: with four short documents that is what retrieval would return anyway. The Copilot
// Studio agent itself uses its own retrieval over the uploaded files; see copilot-studio/procedures-agent/README.md.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { scoreRun } from "../src/procedures-eval.mjs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const cfg = JSON.parse(read("evaluation/foundry.local.json"));
const dir = "copilot-studio/procedures-agent/knowledge/";
const docs = readdirSync(new URL(dir, root)).filter((f) => f.endsWith(".md")).sort().map((f) => read(dir + f)).join("\n\n---\n\n");
const system = `${read("copilot-studio/procedures-agent/instructions.md")}\n\n## Procedure documents\n\n${docs}`;
const { questions } = JSON.parse(read("copilot-studio/procedures-agent/questions.json"));
const token = execSync(`az account get-access-token --tenant ${cfg.tenantId} --resource https://cognitiveservices.azure.com --query accessToken -o tsv`, { encoding: "utf8" }).trim();

const run = { reader: "Azure AI Foundry", deployment: cfg.deployment, recordedAt: new Date().toISOString().slice(0, 10), temperature: 0, answers: {} };
for (const q of questions) {
  const res = await fetch(`${cfg.endpoint.replace(/\/$/, "")}/openai/deployments/${cfg.deployment}/chat/completions?api-version=2024-10-21`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ temperature: 0, messages: [{ role: "system", content: system }, { role: "user", content: q.q }] }),
  });
  const json = await res.json();
  run.answers[q.id] = res.ok ? json.choices[0].message.content : `[refused by the platform: ${json.error?.code ?? res.status}]`;
  console.log(`${q.id}: ${run.answers[q.id].replace(/\s+/g, " ").slice(0, 140)}`);
}
writeFileSync(new URL(`evaluation/runs/procedures-${cfg.deployment}.json`, root), `${JSON.stringify(run, null, 2)}\n`);
const s = scoreRun(questions, run);
console.log(`passed ${s.passed}/${s.questions} · answered with the right source ${s.answeredWithSource}/${s.answerable} · declined ${s.declined}/${s.declinable}`);
for (const r of s.rows.filter((x) => !x.pass)) console.log("  ✗", JSON.stringify(r));
