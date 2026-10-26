#!/usr/bin/env node
// One build step for everything derived:
//   1. copy src/*.mjs to site/assets/lib/ (the browser runs the same code as the tests)
//   2. write site/data/*.json (input data + evaluation + business case)
//   3. regenerate the rule table in docs/02-design/policy-rules.md
//   4. rewrite every <!--n:key-->…<!--/n--> number in docs/, site/ and the root .md files
// CI runs this and fails when `git diff` is not empty, so a document can never quote a number
// the model or the test set no longer produces.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, STALE_HOURS, CONFIDENCE_MIN, MAX_REFERENCES, MAX_AUTO_REPLIES_PER_DAY } from "../src/pipeline.mjs";
import { RULES } from "../src/rules.mjs";
import { values, compute, scenarios, sensitivity } from "../src/business-case.mjs";
import { modelEvaluation } from "../src/model-eval.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const writeIfChanged = (p, text) => {
  const full = join(ROOT, p);
  let old = null;
  try { old = readFileSync(full, "utf8"); } catch { /* new file */ }
  if (old !== text) { mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, text); console.log(`updated ${p}`); }
};

// 1. shared modules
mkdirSync(join(ROOT, "site/assets/lib"), { recursive: true });
for (const f of readdirSync(join(ROOT, "src")).filter((f) => f.endsWith(".mjs"))) {
  writeIfChanged(`site/assets/lib/${f}`, readFileSync(join(ROOT, "src", f), "utf8"));
}

// 2. data
const tms = read("data/tms.json");
const emails = read("data/emails.json");
const model = read("data/model.json");
const data = { ...tms, ...emails };
const ev = evaluate(data);
const evDraftOnly = evaluate(data, { mode: "draft-only" });
const v = values(model);
const bc = compute(v);
const sc = scenarios(model, v);
const sens = sensitivity(model, v);

writeIfChanged("site/data/tms.json", `${JSON.stringify(tms, null, 1)}\n`);
writeIfChanged("site/data/emails.json", `${JSON.stringify(emails, null, 1)}\n`);
writeIfChanged("site/data/model.json", `${JSON.stringify(model, null, 1)}\n`);
writeIfChanged("site/data/evaluation.json", `${JSON.stringify({
  summary: ev.summary,
  draftOnlyActions: evDraftOnly.summary.actions,
  rows: ev.rows.map((r) => ({ id: r.id, title: r.title, pass: r.pass, expected: r.expected,
    action: r.guarded.action, template: r.guarded.template, queue: r.guarded.queue, rules: r.guarded.rules,
    guardedHarms: r.guardedHarms, naiveHarms: r.naiveHarms })),
}, null, 1)}\n`);

// 2b. model evaluation: recorded readings (evaluation/runs/) replayed through the same policy gate
const holdout = read("data/emails-holdout.json");
const manifest = read("evaluation/runs.json");
const me = modelEvaluation(data, holdout.emails, manifest.runs.map((r) => ({ ...r, run: read(`evaluation/runs/${r.file}`) })));
writeIfChanged("site/data/emails-holdout.json", `${JSON.stringify(holdout, null, 1)}\n`);
writeIfChanged("site/data/model-evaluation.json", `${JSON.stringify(me, null, 1)}\n`);

// 3. rule table
const ruleTable = [
  "| ID | Rule | When | Effect | Why | Test cases |",
  "|---|---|---|---|---|---|",
  ...RULES.map((r) => {
    const cases = r.id === "R18" ? "all, in draft-only mode" : ev.rows.filter((row) => row.guarded.rules.includes(r.id)).map((row) => row.id).join(", ");
    return `| ${r.id} | ${r.name} | ${r.when} | ${r.effect} | ${r.why} | ${cases} |`;
  }),
].join("\n");
const rulesDoc = "docs/02-design/policy-rules.md";
const rulesText = readFileSync(join(ROOT, rulesDoc), "utf8");
writeIfChanged(rulesDoc, rulesText.replace(/<!-- rules:start -->[\s\S]*?<!-- rules:end -->/, `<!-- rules:start -->\n${ruleTable}\n<!-- rules:end -->`));

// 4. numbers
const int = (n) => Math.round(n).toLocaleString("en-GB");
const eur = (n) => `€${int(n)}`;
const pct = (n) => `${Math.round(n * 100)}%`;
const months = (n) => (n === null ? "more than 36 months" : `${n} months`);
const k = (n) => `€${Math.round(n / 1000)}k`;
const s = ev.summary;
const scBy = Object.fromEntries(sc.map((x) => [x.id, x.result]));
const numbers = {
  "tests.cases": s.cases, "tests.passed": s.passed,
  "tests.auto": s.actions.auto, "tests.draft": s.actions.draft, "tests.route": s.actions.route, "tests.ignore": s.actions.ignore,
  "guarded.harmful": s.guardedHarmfulCases, "naive.harmful": s.naiveHarmfulCases,
  "naive.leak": s.naiveHarms.leak, "naive.stale": s.naiveHarms.stale, "naive.tone": s.naiveHarms.tone,
  "naive.loop": s.naiveHarms.loop, "naive.instruction": s.naiveHarms.instruction,
  "rules.count": RULES.length, "rules.covered": s.rulesCovered.length,
  "policy.staleHours": STALE_HOURS, "policy.confidence": CONFIDENCE_MIN, "policy.maxRefs": MAX_REFERENCES, "policy.maxAuto": MAX_AUTO_REPLIES_PER_DAY,
  "a.emailsPerDay": int(v.emailsPerDay), "a.shareWismo": pct(v.shareWismo), "a.sharePod": pct(v.sharePod),
  "a.ahtWismoMin": v.ahtWismoMin.toFixed(1), "a.ahtPodMin": v.ahtPodMin.toFixed(1), "a.reviewMinPerDraft": v.reviewMinPerDraft.toFixed(1),
  "a.autoShare": pct(v.autoShare), "a.draftShare": pct(v.draftShare), "a.routeShare": pct(1 - v.autoShare - v.draftShare),
  "a.loadedCostPerHour": eur(v.loadedCostPerHour), "a.tempHoursAvoided": `${int(v.tempHoursAvoided)} h`, "a.tempRatePerHour": eur(v.tempRatePerHour),
  "bc.tempCash": eur(v.tempHoursAvoided * v.tempRatePerHour), "a.hireAvoidedCost": eur(v.hireAvoidedCost),
  "bc.consultantCost": eur(v.consultantDays * v.consultantDayRate), "a.integrationCost": eur(v.integrationCost), "a.changeCost": eur(v.changeCost),
  "a.flowLicencePerYear": eur(v.flowLicencePerYear), "a.apiFeePerYear": eur(v.apiFeePerYear), "a.adminDaysPerMonth": v.adminDaysPerMonth,
  "a.discountRate": pct(v.discountRate), "a.year1BenefitFactor": pct(v.year1BenefitFactor), "a.consultantDays": v.consultantDays, "a.creditPrice": `€${v.creditPrice.toFixed(2)}`,
  "bc.inScopePerDay": int(bc.inScopePerDay), "bc.baselineHoursYear": `${int(bc.baselineHoursYear)} h`, "bc.baselineCostYear": eur(bc.baselineCostYear),
  "bc.capacityHoursYear": `${int(bc.capacityHoursYear)} h`, "bc.capacityFte": `${bc.capacityFte.toFixed(1)} FTE`, "bc.capacityValueYear": eur(bc.capacityValueYear),
  "bc.cashBenefitYear": eur(bc.cashBenefitYear), "bc.buildCost": eur(bc.buildCost), "bc.runCostYear": eur(bc.runCostYear),
  "bc.creditsYear": int(bc.creditsYear), "bc.creditCostYear": eur(bc.creditCostYear), "bc.adminCostYear": eur(bc.adminCostYear),
  "bc.npv3y": eur(bc.npv3y), "bc.npv3yK": k(bc.npv3y), "bc.payback": months(bc.paybackMonths), "bc.costPerAutoReply": `€${bc.costPerAutoReply.toFixed(2)}`,
  "bc.cf0": eur(bc.cashflows[0]), "bc.cf1": eur(bc.cashflows[1]), "bc.cf2": eur(bc.cashflows[2]), "bc.cf3": eur(bc.cashflows[3]),
  ...Object.fromEntries(sc.flatMap((x) => [[`sc.${x.id}.npv`, eur(x.result.npv3y)], [`sc.${x.id}.npvK`, k(x.result.npv3y)],
    [`sc.${x.id}.payback`, months(x.result.paybackMonths)], [`sc.${x.id}.capacity`, `${int(x.result.capacityHoursYear)} h`],
    [`sc.${x.id}.cash`, eur(x.result.cashBenefitYear)]])),
  "ho.cases": holdout.emails.length,
  ...Object.fromEntries(me.readers.flatMap((r) => [
    ...(r.result.main ? [[`me.${r.key}.main`, r.result.main.passed], [`me.${r.key}.mainHarm`, r.result.main.harmful]] : []),
    [`me.${r.key}.ho`, r.result.holdout.passed], [`me.${r.key}.hoHarm`, r.result.holdout.harmful],
  ])),
  "me.v3.mainMin": Math.min(...me.readers.filter((r) => r.key.startsWith("f-v3")).map((r) => r.result.main.passed)),
  "me.v3.mainMax": Math.max(...me.readers.filter((r) => r.key.startsWith("f-v3")).map((r) => r.result.main.passed)),
  "me.v3.harmMax": Math.max(...me.readers.filter((r) => r.key.startsWith("f-v3")).flatMap((r) => [r.result.main.harmful, r.result.holdout.harmful])),
  "sens.top": sens[0].label, "sens.topLow": eur(sens[0].low), "sens.topHigh": eur(sens[0].high),
};
// Rounded, so the file is identical across Node versions (last-digit float differences otherwise fail CI).
const round = (key, x) => (typeof x === "number" ? Math.round(x * 1e4) / 1e4 : x);
writeIfChanged("site/data/business-case.json", `${JSON.stringify({ values: v, result: bc, scenarios: sc, sensitivity: sens, numbers }, round, 1)}\n`);

const MARK = /<!--n:([\w.-]+)-->([\s\S]*?)<!--\/n-->/g;
const unknown = new Set();
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", "lib", "data"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if ([".md", ".html"].includes(extname(p))) yield p;
  }
}
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  const next = text.replace(MARK, (m, key) => {
    if (!(key in numbers)) { unknown.add(`${key} (${file.slice(ROOT.length + 1)})`); return m; }
    return `<!--n:${key}-->${numbers[key]}<!--/n-->`;
  });
  if (next !== text) writeIfChanged(file.slice(ROOT.length + 1), next);
}
if (unknown.size) {
  console.error(`Unknown number keys:\n  ${[...unknown].join("\n  ")}`);
  process.exit(1);
}
console.log(`build ok · test set ${s.passed}/${s.cases} · naive harmful ${s.naiveHarmfulCases} · NPV ${eur(bc.npv3y)}`);
