// Use-case prioritisation from the discovery workshop: a weighted score of value, feasibility and
// risk (all 1–5, risk 5 = low risk). Used by the build (generated table) and the demo (weights).

export function score(uc, weights) {
  const total = weights.value + weights.feasibility + weights.risk;
  return (uc.value * weights.value + uc.feasibility * weights.feasibility + uc.risk * weights.risk) / total;
}

// Ranked list. A use case with risk 1 is never "go" on score alone: it needs a design decision first.
export function prioritise({ useCases, weights }) {
  return useCases
    .map((uc) => ({ ...uc, score: Math.round(score(uc, weights) * 100) / 100, gate: uc.risk <= 1 ? "design decision needed" : "" }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
