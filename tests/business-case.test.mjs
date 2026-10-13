import { test } from "node:test";
import assert from "node:assert/strict";
import { values, compute, scenarios, sensitivity } from "../src/business-case.mjs";
import { readJson } from "./helpers.mjs";

const model = readJson("data/model.json");
const v = values(model);
const r = compute(v);

test("every assumption has a label, unit and basis", () => {
  for (const [k, a] of Object.entries(model.assumptions)) {
    assert.ok(a.label && a.unit && a.basis && typeof a.value === "number", k);
  }
});

test("shares are consistent", () => {
  assert.ok(v.autoShare + v.draftShare <= 1);
  assert.ok(v.shareWismo + v.sharePod < 1);
});

test("cash benefit never exceeds the value of the capacity freed", () => {
  for (const sc of scenarios(model, v)) assert.ok(sc.result.cashBenefitYear <= sc.result.capacityValueYear + 1e-6, sc.id);
});

test("plan pays back within the 3-year horizon; without the avoided hire it is much thinner", () => {
  const by = Object.fromEntries(scenarios(model, v).map((s) => [s.id, s.result]));
  assert.ok(r.npv3y > 0 && r.paybackMonths <= 24);
  assert.ok(by["no-hire"].npv3y < r.npv3y / 5);
});

test("npv equals the discounted cash flows", () => {
  const manual = r.cashflows.reduce((s, cf, y) => s + cf / (1 + v.discountRate) ** y, 0);
  assert.ok(Math.abs(manual - r.npv3y) < 1e-6);
});

test("sensitivity is sorted by impact and names the avoided hire as the main driver", () => {
  const sens = sensitivity(model, v);
  for (let i = 1; i < sens.length; i++) assert.ok(sens[i - 1].range >= sens[i].range);
  assert.equal(sens[0].key, "hireAvoidedCost");
});
