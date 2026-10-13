// The evaluation set: every email gets the outcome a careful colleague would choose.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, createContext, runGuarded } from "../src/pipeline.mjs";
import { RULES } from "../src/rules.mjs";
import { loadData } from "./helpers.mjs";

const data = loadData();
const ev = evaluate(data);

for (const row of ev.rows) {
  test(`${row.id} ${row.title} → ${row.expected.action}${row.expected.queue ? ` (${row.expected.queue})` : ""}`, () => {
    const g = row.guarded;
    assert.equal(g.action, row.expected.action, g.trace.map((t) => `${t.step}: ${t.detail}`).join("\n"));
    assert.equal(g.template, row.expected.template ?? null);
    assert.equal(g.queue, row.expected.queue ?? null);
    for (const r of row.expected.rules) assert.ok(g.rules.includes(r), `expected rule ${r}, got ${g.rules.join(",")}`);
  });
}

test("the guarded design causes no harm on the evaluation set", () => {
  assert.equal(ev.summary.guardedHarmfulCases, 0, JSON.stringify(ev.summary.guardedHarms));
});

test("the naive design causes harm in a measurable number of cases (quoted in the docs)", () => {
  assert.equal(ev.summary.naiveHarmfulCases, 23);
  assert.deepEqual(ev.summary.naiveHarms, { leak: 5, stale: 5, tone: 9, loop: 4, instruction: 2 });
});

test("every rule except draft-only mode is exercised by at least one email", () => {
  const missing = RULES.map((r) => r.id).filter((id) => id !== "R18" && !ev.summary.rulesCovered.includes(id));
  assert.deepEqual(missing, []);
});

test("draft-only mode (R18): nothing is sent automatically", () => {
  const ed = evaluate(data, { mode: "draft-only" });
  assert.equal(ed.summary.actions.auto, 0);
  const formerAuto = ev.rows.filter((r) => r.guarded.action === "auto").map((r) => r.id);
  for (const r of ed.rows.filter((x) => formerAuto.includes(x.id))) {
    assert.equal(r.guarded.action, "draft");
    assert.ok(r.guarded.rules.includes("R18"));
  }
});

test("instructions in an email never lead to an automatic action", () => {
  for (const r of ev.rows.filter((x) => x.guarded.understanding.injection.length)) assert.equal(r.guarded.action, "route");
});

test("a sender that fails DMARC never receives shipment data", () => {
  const ctx = createContext(data);
  for (const e of data.emails.filter((x) => x.auth.dmarc !== "pass")) {
    const g = runGuarded(ctx, e);
    assert.deepEqual(g.shipments, []);
  }
});
