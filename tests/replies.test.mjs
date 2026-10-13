// What leaves the building: automatic replies contain TMS facts only, for authorised shipments only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createContext, runGuarded, authorise } from "../src/pipeline.mjs";
import { compose } from "../src/compose.mjs";
import { loadData } from "./helpers.mjs";

const data = loadData();
const ctx = createContext(data);
const results = data.emails.map((e) => ({ e, g: runGuarded(ctx, e) }));
const autoWithData = results.filter(({ g }) => g.action === "auto" && ["status", "pod"].includes(g.template));

test("automatic replies only mention shipments the sender is authorised for", () => {
  assert.ok(autoWithData.length > 0);
  for (const { e, g } of autoWithData) {
    for (const id of g.shipments) assert.notEqual(authorise(ctx, e, ctx.tms.byId.get(id)).level, "none", `${e.id} ${id}`);
    const mentioned = g.reply.text.match(/CL-20\d{2}-\d{7}/g) || [];
    for (const id of mentioned) assert.ok(g.shipments.includes(id), `${e.id} mentions ${id}`);
  }
});

test("replies never contain receiver names, addresses, signatures or exception notes", () => {
  for (const { e, g } of results.filter(({ g }) => g.reply)) {
    for (const s of data.shipments) {
      for (const secret of [s.consignee?.name, s.consignee?.address, s.receivedBy, s.exception?.note, s.carrierName].filter(Boolean)) {
        assert.ok(!g.reply.text.includes(secret), `${e.id} contains "${secret}"`);
      }
    }
  }
});

test("every fact in a reply is a field of the shipment it is about", () => {
  for (const { e, g } of autoWithData) {
    for (const f of g.reply.facts) {
      const s = ctx.tms.byId.get(f.shipment);
      if (f.field === "podLink") assert.equal(s.status, "DELIVERED");
      else assert.deepEqual(s[f.field], f.value, `${e.id} ${f.field}`);
    }
  }
});

test("'not found' and 'not authorised' produce the same reply (no way to test if a shipment exists)", () => {
  const generic = results.filter(({ g }) => g.template === "generic" && g.action === "auto");
  const byLang = {};
  for (const { g } of generic) (byLang[g.reply.lang] ||= new Set()).add(g.reply.text);
  for (const set of Object.values(byLang)) assert.equal(set.size, 1);
  assert.deepEqual(new Set(generic.flatMap(({ g }) => g.rules)), new Set(["R10", "R11"]));
});

test("replies are written in the customer's language, with an automation notice", () => {
  const notice = { nl: "automatisch opgesteld", fr: "préparée automatiquement", en: "prepared automatically" };
  for (const { e, g } of results.filter(({ g }) => g.action === "auto")) {
    assert.equal(g.reply.lang, g.understanding.language, e.id);
    assert.ok(g.reply.text.includes(notice[g.reply.lang]), e.id);
  }
});

test("POD link only for delivered shipments", () => {
  const s = data.shipments.find((x) => x.status === "IN_TRANSIT");
  assert.ok(!compose({ template: "pod", lang: "en", shipments: [s] }).text.includes("/pod/"));
});
