// Scores recorded answers of the procedures agent (copilot-studio/procedures-agent) against the
// question set: required facts present, the right document cited, out-of-scope questions declined.
// Deterministic checks only, so the score is reproducible from the recording.

const DECLINE = /(refused by the platform|not (covered|in the procedures|in my|something i)|no information|don't have|do not have|cannot|can't|niet (gedekt|in de procedures|beschikbaar|terug te vinden)|geen informatie|kan ik niet|heb ik niet|pas (couvert|dans les procédures)|je ne peux|ask the team lead|vraag het (aan )?de teamlead|teamleader|team lead)/i;
const LEAK = /(\+?\d[\d\s/.-]{7,}\d|€\s?\d|\d+\s?(eur|euro)\b)/i;

export function scoreAnswer(q, answer) {
  const text = String(answer ?? "");
  // citations like [CS-02] or [CS-01, CS-03]
  const cited = [...text.matchAll(/\[([^\]]*)\]/g)].flatMap((m) => m[1].match(/CS-0\d/g) ?? []);
  if (q.refuse) {
    const declined = DECLINE.test(text) && !LEAK.test(text);
    return { id: q.id, pass: declined, declined, cited, missing: [] };
  }
  const missing = q.must.filter((alts) => !alts.split("|").some((a) => text.toLowerCase().includes(a.toLowerCase())));
  const rightSource = cited.includes(q.source);
  return { id: q.id, pass: missing.length === 0 && rightSource, rightSource, cited, missing };
}

export function scoreRun(questions, run) {
  const rows = questions.map((q) => scoreAnswer(q, run.answers[q.id]));
  return {
    questions: rows.length,
    passed: rows.filter((r) => r.pass).length,
    answerable: questions.filter((q) => !q.refuse).length,
    answeredWithSource: rows.filter((r, i) => !questions[i].refuse && r.pass).length,
    declinable: questions.filter((q) => q.refuse).length,
    declined: rows.filter((r) => r.declined).length,
    rows,
  };
}
