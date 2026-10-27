// Reads what the real cloud flows decided in Dataverse and compares it with the tested reference
// (runGuarded in src/pipeline.mjs) given the very same reading. Writes verification/<batch>.json and
// regenerates ../VERIFICATION.md from all batches. With --record=<file>, the readings of the batch
// (e.g. the Copilot Studio agent's) are also saved as a model run in evaluation/runs/<file>.json.
//
//   node verify.mjs <batch> [--record=copilot-studio]
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { all, CONFIG } from "./dv.mjs";
import { createContext, runGuarded } from "../../src/pipeline.mjs";
import { fromAgentOutput } from "../../src/text.mjs";

const batch = process.argv[2];
const record = process.argv.find((a) => a.startsWith("--record="))?.slice(9);
const root = new URL("../../", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const data = { ...read("data/tms.json"), emails: read("data/emails.json").emails };
const holdout = read("data/emails-holdout.json").emails;
const byId = Object.fromEntries([...data.emails, ...holdout].map((e) => [e.id, e]));
const ctx = createContext(data);
const F = "@OData.Community.Display.V1.FormattedValue";
const o = { solution: null };

const rows = await all(`crl_inboundemails?$select=crl_inboundemailid,crl_testcase,crl_reader,crl_agentoutput,crl_status,crl_action,crl_template,crl_queue,crl_rules,crl_shipments,crl_error&$filter=crl_batch eq '${batch}'&$orderby=crl_testcase asc`, o);
const replies = await all(`crl_replies?$select=crl_text,crl_status,_crl_inboundemail_value&$filter=crl_Inboundemail/crl_batch eq '${batch}'`, o);
const replyOf = Object.fromEntries(replies.map((r) => [r._crl_inboundemail_value, r]));

const results = rows.map((row) => {
  const email = byId[row.crl_testcase];
  const out = row.crl_agentoutput ? JSON.parse(row.crl_agentoutput) : {};
  const g = runGuarded(ctx, email, { read: (e) => fromAgentOutput(e, out) });
  const flow = {
    status: row[`crl_status${F}`],
    action: row[`crl_action${F}`] ?? null,
    template: row.crl_template ?? null,
    queue: row.crl_queue ?? null,
    rules: (row.crl_rules ?? "").split(",").filter(Boolean).sort().join(","),
    shipments: row.crl_shipments ?? "",
    reply: replyOf[row.crl_inboundemailid]?.crl_text?.replace(/\r\n/g, "\n") ?? null,
  };
  const ref = { action: g.action, template: g.template, queue: g.queue, rules: g.rules.join(","), shipments: g.shipments.join(","), reply: g.reply?.text ?? null };
  const sameDecision = flow.action === ref.action && flow.template === ref.template && flow.queue === ref.queue && flow.rules === ref.rules && flow.shipments === ref.shipments;
  const sameReply = flow.reply === ref.reply;
  const exp = email.expected;
  const expected = flow.action === exp.action && (exp.template ?? null) === flow.template && (exp.queue ?? null) === flow.queue && exp.rules.every((r) => flow.rules.split(",").includes(r));
  return { id: row.crl_testcase, reader: row[`crl_reader${F}`], flow, reference: ref, sameDecision, sameReply, expected, error: row.crl_error ?? null, reading: out };
});

mkdirSync(new URL("power-platform/verification/", root), { recursive: true });
const summary = {
  batch, at: new Date().toISOString().slice(0, 16).replace("T", " "), reader: results[0]?.reader ?? "", emails: results.length,
  decided: results.filter((r) => r.flow.status === "Decided").length,
  sameDecision: results.filter((r) => r.sameDecision).length,
  sameReply: results.filter((r) => r.sameDecision && r.sameReply).length,
  expected: results.filter((r) => r.expected).length,
};
writeFileSync(new URL(`power-platform/verification/${batch}.json`, root), `${JSON.stringify({ summary, results: results.map(({ reading, ...r }) => r) }, null, 1)}\n`);

if (record) {
  // merge with an earlier batch of the same run (main set and held-out set are seeded as two batches)
  const file = new URL(`evaluation/runs/${record}.json`, root);
  let run = { outputs: {} };
  try { run = JSON.parse(readFileSync(file, "utf8")); } catch { /* first batch */ }
  Object.assign(run, { reader: "Copilot Studio agent (Execute Agent and wait, cloud flow CRL-01)", agent: "crl_corlaanMailReader", batches: [...new Set([...(run.batches ?? []), batch])], recordedAt: summary.at.slice(0, 10) });
  // only real readings: a failed agent call stored a safe placeholder, which says nothing about the model
  // real readings only: a failed agent call stored a safe placeholder that says nothing about the model.
  // A content-filter refusal is a real outcome (recorded as blocked); automated mail never reaches the agent ({}).
  for (const r of results) {
    if (r.error && !r.error.startsWith("Refused by the content filter")) continue;
    run.outputs[r.id] = r.reading ?? {};
  }
  run.outputs = Object.fromEntries(Object.entries(run.outputs).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(file, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`recorded ${Object.keys(run.outputs).length} readings → evaluation/runs/${record}.json`);
}

// VERIFICATION.md from every batch on disk
const dir = new URL("power-platform/verification/", root);
const batches = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
const row = (...c) => `| ${c.join(" | ")} |`;
const md = [
  "# Verification in Power Platform",
  "",
  `What the real cloud flows decided in the developer environment (${CONFIG.name}), next to the tested reference \`runGuarded()\` in [src/pipeline.mjs](../src/pipeline.mjs) given **the same reading**. Generated by \`node power-platform/scripts/verify.mjs <batch>\`. Do not edit by hand.`,
  "",
  "- **Same decision** = action, template, queue, rules fired and shipments answered are identical.",
  "- **Same reply** = the reply text written by the flow is identical to the text `compose()` produces, character for character.",
  "- **As expected** = the outcome matches the expected outcome in the test set (it measures the reader as well as the rules).",
  "",
  row("Batch", "Reader", "Emails", "Decided", "Same decision", "Same reply", "As expected", "Run at (UTC)"),
  row(...Array(8).fill("---")),
  ...batches.map(({ summary: s }) => row(s.batch, s.reader, s.emails, s.decided, `**${s.sameDecision}/${s.emails}**`, `${s.sameReply}/${s.emails}`, `${s.expected}/${s.emails}`, s.at)),
  "",
  ...batches.flatMap(({ summary: s, results }) => {
    const diff = results.filter((r) => !r.sameDecision || !r.sameReply || !r.expected);
    return [`## ${s.batch}`, "", diff.length ? "Emails where the flow differs from the reference, or the outcome differs from the expectation:" : "No differences.", "",
      ...(diff.length ? [row("Email", "Flow", "Reference", "Same decision", "Same reply", "As expected", "Note"), row(...Array(7).fill("---")),
        ...diff.map((r) => row(r.id, `${r.flow.action ?? r.flow.status} ${r.flow.template ?? ""} ${r.flow.queue ?? ""} ${r.flow.rules}`.trim(), `${r.reference.action} ${r.reference.template ?? ""} ${r.reference.queue ?? ""} ${r.reference.rules}`.trim(), r.sameDecision ? "yes" : "**no**", r.sameReply ? "yes" : "**no**", r.expected ? "yes" : "no", (r.error ?? "").slice(0, 100)))] : []), ""];
  }),
].join("\n");
writeFileSync(new URL("power-platform/VERIFICATION.md", root), `${md}\n`);
console.log(`${batch}: decided ${summary.decided}/${summary.emails}, same decision ${summary.sameDecision}, same reply ${summary.sameReply}, as expected ${summary.expected}`);
