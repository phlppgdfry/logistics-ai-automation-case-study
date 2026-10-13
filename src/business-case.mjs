// Business case: capacity freed, the part of it that becomes cash, costs, NPV and sensitivity.
// Inputs come from data/model.json. Used by the site (live sliders), the docs (generated numbers)
// and CI (tests/business-case.test.mjs).

export function values(model, overrides = {}) {
  const v = Object.fromEntries(Object.entries(model.assumptions).map(([k, a]) => [k, a.value]));
  return { ...v, ...overrides };
}

export function compute(v) {
  const wismoPerDay = v.emailsPerDay * v.shareWismo;
  const podPerDay = v.emailsPerDay * v.sharePod;
  const inScopePerDay = wismoPerDay + podPerDay;
  const baselineMinPerDay = wismoPerDay * v.ahtWismoMin + podPerDay * v.ahtPodMin;
  const avgAht = baselineMinPerDay / inScopePerDay;

  // Automatic replies save the full handling time; drafts save handling time minus review time.
  const savedMinPerDay = inScopePerDay * (v.autoShare * avgAht + v.draftShare * Math.max(0, avgAht - v.reviewMinPerDraft));
  const baselineHoursYear = (baselineMinPerDay / 60) * v.workingDays;
  const capacityHoursYear = (savedMinPerDay / 60) * v.workingDays;
  const capacityValueYear = capacityHoursYear * v.loadedCostPerHour;
  const capacityFte = capacityHoursYear / v.productiveHoursPerFte;

  // Freed hours only become cash where they replace money that would otherwise be spent:
  // the Q4 temps first, then the planned hire. The rest is time back for the team.
  const tempHours = Math.min(capacityHoursYear, v.tempHoursAvoided);
  const hireHours = Math.min(Math.max(0, capacityHoursYear - v.tempHoursAvoided), v.hireAvoidedHours);
  const cashBenefitYear = tempHours * v.tempRatePerHour + (hireHours / v.hireAvoidedHours) * v.hireAvoidedCost;

  const buildCost = v.consultantDays * v.consultantDayRate + v.integrationCost + v.changeCost;
  const creditsYear = (v.emailsPerDay * v.creditsPerEmail + inScopePerDay * v.creditsPerInScopeEmail) * v.workingDays;
  const creditCostYear = creditsYear * v.creditPrice;
  const adminCostYear = v.adminDaysPerMonth * 12 * v.adminDayCost;
  const runCostYear = creditCostYear + v.flowLicencePerYear + v.apiFeePerYear + adminCostYear;

  const cashflows = [
    -buildCost,
    v.year1BenefitFactor * cashBenefitYear - runCostYear,
    cashBenefitYear - runCostYear,
    cashBenefitYear - runCostYear,
  ];
  const npv3y = cashflows.reduce((sum, cf, year) => sum + cf / (1 + v.discountRate) ** year, 0);

  // Payback in months, undiscounted, with year 1 at its reduced benefit.
  let paybackMonths = null;
  let cumulative = -buildCost;
  for (let m = 1; m <= 36; m++) {
    const yearly = m <= 12 ? cashflows[1] : cashflows[2];
    cumulative += yearly / 12;
    if (cumulative >= 0) { paybackMonths = m; break; }
  }

  return {
    wismoPerDay, podPerDay, inScopePerDay, avgAht, baselineMinPerDay, baselineHoursYear,
    baselineCostYear: baselineHoursYear * v.loadedCostPerHour,
    savedMinPerDay, capacityHoursYear, capacityValueYear, capacityFte,
    cashBenefitYear, buildCost, creditsYear, creditCostYear, adminCostYear, runCostYear,
    cashflows, npv3y, paybackMonths,
    costPerAutoReply: runCostYear / (inScopePerDay * v.autoShare * v.workingDays),
  };
}

export function scenarios(model, v) {
  return model.scenarios.map((sc) => ({ ...sc, result: compute({ ...v, ...sc.overrides }) }));
}

export function sensitivity(model, v, swing = 0.25) {
  const base = compute(v).npv3y;
  return model.sensitivity.map((key) => {
    const lowV = { ...v, [key]: v[key] * (1 - swing) };
    const highV = { ...v, [key]: v[key] * (1 + swing) };
    if (key === "autoShare") highV.autoShare = Math.min(highV.autoShare, 1 - v.draftShare);
    const low = compute(lowV).npv3y;
    const high = compute(highV).npv3y;
    return { key, label: model.assumptions[key].label, low, high, range: Math.abs(high - low), base };
  }).sort((a, b) => b.range - a.range);
}
