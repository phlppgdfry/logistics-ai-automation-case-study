// Tests the kill switch end to end, without re-saving any flow:
//   crl_Mode = off        → a new email must stay "Received" (CRL-01 stops at its first step)
//   crl_Mode = graduated  → the next email must be decided
// Writes verification/tests/kill-switch.json. Uses recorded stand-in readings, so no agent call is made.
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { all } from "./dv.mjs";

const here = new URL("./", import.meta.url).pathname;
const run = (...args) => execFileSync("node", args, { cwd: here, encoding: "utf8" }).trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = async (batch) => (await all(`crl_inboundemails?$select=crl_status&$filter=crl_batch eq '${batch}'`))[0]?.["crl_status@OData.Community.Display.V1.FormattedValue"];

const steps = [];
for (const [mode, batch, expect] of [["off", "kill-off", "Received"], ["graduated", "kill-on", "Decided"]]) {
  run("set-env.mjs", "crl_Mode", mode);
  const at = new Date().toISOString();
  run("seed-emails.mjs", batch, "E01", "stand-in");
  let seen = null;
  for (let i = 0; i < 16; i++) { await wait(15000); seen = await state(batch); if (seen === "Decided") break; }
  steps.push({ mode, batch, expect, seen, ok: seen === expect, at });
  console.log(`crl_Mode = ${mode}: email is ${seen} (expected ${expect})`);
  run("delete-batch.mjs", batch);
}
writeFileSync(new URL("../verification/tests/kill-switch.json", import.meta.url), `${JSON.stringify({ test: "kill switch without re-saving the flows", steps }, null, 1)}\n`);
if (!steps.every((s) => s.ok)) process.exit(1);
