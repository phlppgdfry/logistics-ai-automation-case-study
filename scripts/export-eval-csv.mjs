#!/usr/bin/env node
// Writes copilot-studio/evaluation-set.csv: the 48 evaluation emails with the expected reading,
// for import into the agent's evaluation in Copilot Studio.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { understand, toAgentOutput, automatedMailReason } from "../src/text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { emails } = JSON.parse(readFileSync(join(ROOT, "data/emails.json"), "utf8"));
const cell = (s) => `"${String(s).replace(/"/g, '""')}"`;
const rows = [["id", "question", "expected_response"]];
for (const e of emails.filter((x) => !automatedMailReason(x))) {
  const expected = toAgentOutput(understand(e));
  expected.instructionSignals = expected.instructionSignals.length ? ["<any quote>"] : [];
  rows.push([e.id, `Subject: ${e.subject}\n\n${e.body}`, JSON.stringify(expected)]);
}
writeFileSync(join(ROOT, "copilot-studio/evaluation-set.csv"), `${rows.map((r) => r.map(cell).join(",")).join("\n")}\n`);
console.log(`copilot-studio/evaluation-set.csv: ${rows.length - 1} cases`);
