// The stand-in produces exactly what the Copilot Studio agent is specified to return,
// so the flow and the demo work against the same contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { understand, toAgentOutput } from "../src/text.mjs";
import { readJson, loadData } from "./helpers.mjs";

const schema = readJson("copilot-studio/agent-output.schema.json");

function validate(value, s, path = "$") {
  if (s.enum) assert.ok(s.enum.includes(value), `${path}: ${value} not in enum`);
  if (s.type === "object") {
    assert.equal(typeof value, "object");
    for (const k of s.required || []) assert.ok(k in value, `${path}.${k} missing`);
    if (s.additionalProperties === false) for (const k of Object.keys(value)) assert.ok(k in s.properties, `${path}.${k} not allowed`);
    for (const [k, sub] of Object.entries(s.properties || {})) if (k in value) validate(value[k], sub, `${path}.${k}`);
  }
  if (s.type === "array") {
    assert.ok(Array.isArray(value), path);
    if (s.uniqueItems) assert.equal(new Set(value).size, value.length, `${path} not unique`);
    value.forEach((v, i) => validate(v, s.items, `${path}[${i}]`));
  }
  if (s.type === "number") { assert.equal(typeof value, "number"); assert.ok(value >= s.minimum && value <= s.maximum, path); }
  if (s.type === "string") { assert.equal(typeof value, "string"); if (s.maxLength) assert.ok(value.length <= s.maxLength, path); }
  if (s.type === "boolean") assert.equal(typeof value, "boolean", path);
}

test("every evaluation email yields a schema-valid agent output", () => {
  for (const e of loadData().emails) validate(toAgentOutput(understand(e)), schema, e.id);
});

test("references are copied, not completed: a number with a missing digit is not a reference", () => {
  const u = understand({ subject: "", body: "Waar blijft CL-2026-041234?", from: "a@b.example" });
  assert.deepEqual(u.references, []);
});
