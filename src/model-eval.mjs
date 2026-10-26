// Replays recorded readings (evaluation/runs/*.json) through the policy gate and scores them on the
// main set and the held-out set. No model is called here: scripts/eval-model.mjs records, this scores.

import { evaluate } from "./pipeline.mjs";
import { fromAgentOutput, fromLabels, understand } from "./text.mjs";

const FIELDS = ["language", "intent", "references", "referencesFromQuoted", "sensitive", "instruction"];

// How a reading compares with the labelled truth, field by field (held-out set only).
function fieldMatches(u, email) {
  const r = email.reading;
  const refs = (x) => [...x].sort().join("|");
  return {
    language: u.language === r.language,
    intent: u.intent === r.intent,
    references: refs(u.references.map((x) => x.value)) === refs(r.references),
    referencesFromQuoted: u.referencesFromQuoted === r.referencesFromQuoted,
    sensitive: refs(u.sensitive) === refs(r.sensitive),
    instruction: (u.injection.length > 0) === r.instruction,
  };
}

function score(data, holdout, read, { holdoutOnly = false } = {}) {
  const main = holdoutOnly ? null : evaluate(data, { read });
  const held = evaluate(data, { emails: holdout, truth: fromLabels, read });
  const fields = Object.fromEntries(FIELDS.map((f) => [f, holdout.filter((e) => fieldMatches((read ?? understand)(e), e)[f]).length]));
  const row = (r) => ({ id: r.id, title: r.title, pass: r.pass, action: r.guarded.action, template: r.guarded.template, queue: r.guarded.queue,
    rules: r.guarded.rules, expected: r.expected, harms: r.guardedHarms });
  return {
    main: main && { cases: main.summary.cases, passed: main.summary.passed, harmful: main.summary.guardedHarmfulCases, actions: main.summary.actions, misses: main.rows.filter((r) => !r.pass || r.guardedHarms.length).map(row) },
    holdout: { cases: held.summary.cases, passed: held.summary.passed, harmful: held.summary.guardedHarmfulCases, actions: held.summary.actions, fields, misses: held.rows.filter((r) => !r.pass || r.guardedHarms.length).map(row) },
  };
}

// runs: [{ key, label, run }] where run is a recording from scripts/eval-model.mjs
export function modelEvaluation(data, holdout, runs) {
  const readers = [
    { key: "stand-in", label: "Keyword stand-in (src/text.mjs)", result: score(data, holdout, null) },
    ...runs.map(({ key, label, run }) => ({
      key, label, model: run.model, deployment: run.deployment, recordedAt: run.recordedAt, instructionsSha256: run.instructionsSha256,
      blocked: Object.entries(run.outputs).filter(([, o]) => o.blocked).map(([id, o]) => ({ id, by: o.blockedBy })),
      result: score(data, holdout, (e) => fromAgentOutput(e, run.outputs[e.id])),
    })),
    { key: "labels", label: "Correct reading (labels)", result: score(data, holdout, fromLabels, { holdoutOnly: true }) },
  ];
  return { fields: FIELDS, readers };
}
