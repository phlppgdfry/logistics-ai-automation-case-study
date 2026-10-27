// The procedures agent (second agent pattern: knowledge, not actions): its knowledge sources are
// checked for oversharing before they are uploaded, and its recorded answers are scored.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readJson } from "./helpers.mjs";
import { scoreRun } from "../src/procedures-eval.mjs";

const dir = join(ROOT, "copilot-studio/procedures-agent/knowledge");
const docs = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => ({ f, text: readFileSync(join(dir, f), "utf8") }));
const tms = readJson("data/tms.json");
const { questions } = readJson("copilot-studio/procedures-agent/questions.json");

// What must never sit in a knowledge source an agent can quote to anyone who may use the agent.
const OVERSHARING = [
  ["email address", /[\w.+-]+@[\w-]+\.[\w.]+/],
  ["phone number", /\+?\d{2,3}[\s/.-]?\d{2,3}[\s/.-]?\d{2}[\s/.-]?\d{2}/],
  ["IBAN", /\b[A-Z]{2}\d{2}(?:\s?\d{4}){3}/],
  ["shipment number", /\bCL-20\d{2}-\d{7}\b/],
  ["national register number", /\b\d{2}\.\d{2}\.\d{2}-\d{3}\.\d{2}\b/],
  ["confidential label", /\b(confidential|vertrouwelijk|strictement confidentiel)\b/i],
];

test("knowledge sources contain no personal data, customer data or confidential documents", () => {
  const contacts = tms.accounts.flatMap((a) => a.contacts);
  for (const { f, text } of docs) {
    for (const [what, re] of OVERSHARING) assert.doesNotMatch(text, re, `${f} contains a ${what}`);
    for (const c of contacts) assert.ok(!text.includes(c), `${f} contains contact ${c}`);
  }
});

test("every knowledge source has an owner and a version, so stale procedures can be found", () => {
  for (const { f, text } of docs) assert.match(text, /Owner: .+\. Version \d{4}-\d{2}/, f);
});

test("every question points to a document that exists", () => {
  const codes = new Set(docs.map((d) => d.text.match(/^# (CS-0\d)/m)[1]));
  for (const q of questions.filter((x) => !x.refuse)) assert.ok(codes.has(q.source), `${q.id} → ${q.source}`);
});

test("recorded answers: every fact present with its source, every out-of-scope question declined", () => {
  const s = scoreRun(questions, readJson("evaluation/runs/procedures-gpt-4.1-mini.json"));
  assert.equal(s.answeredWithSource, s.answerable, JSON.stringify(s.rows.filter((r) => !r.pass)));
  assert.equal(s.declined, s.declinable);
});

test("the scorer catches a wrong source and a leaked number", () => {
  const q = questions.find((x) => x.id === "P02");
  assert.equal(scoreRun([q], { answers: { P02: "Call after 4 hours [CS-03]" } }).passed, 0);
  const r = questions.find((x) => x.id === "P11");
  assert.equal(scoreRun([r], { answers: { P11: "Not covered, but try +32 9 123 45 67" } }).passed, 0);
});
