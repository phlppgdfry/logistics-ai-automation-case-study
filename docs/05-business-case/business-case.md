# Business case

> *All figures are illustrative assumptions — not real company data.* They come from one file, [data/model.json](../../data/model.json); every number on this page is regenerated from it by `node scripts/build.mjs`, and CI fails when the page and the model disagree. Try other assumptions in the demo's **Business case** tab.

## The short version

- Today, status and POD emails cost <!--n:bc.baselineHoursYear-->4,973 h<!--/n--> of agent time a year (<!--n:bc.baselineCostYear-->€238,694<!--/n-->).
- The solution frees <!--n:bc.capacityHoursYear-->3,832 h<!--/n--> a year (<!--n:bc.capacityFte-->2.4 FTE<!--/n-->), worth <!--n:bc.capacityValueYear-->€183,924<!--/n--> at loaded cost.
- **Only part of that is cash.** Nobody is let go (agreed with the sponsor). Cash comes from two things management controls: no Q4 temps, and not making the planned 2027 hire. That is <!--n:bc.cashBenefitYear-->€113,984<!--/n--> a year.
- Build <!--n:bc.buildCost-->€40,700<!--/n-->, run <!--n:bc.runCostYear-->€21,577<!--/n--> a year → **3-year NPV <!--n:bc.npv3y-->€144,672<!--/n-->, payback <!--n:bc.payback-->13 months<!--/n-->.**
- **If the 2027 hire happens anyway, the NPV drops to <!--n:sc.no-hire.npv-->€13,595<!--/n-->** with a payback of <!--n:sc.no-hire.payback-->27 months<!--/n-->. The case is not "AI saves money"; it is "AI lets you not hire". That is a management decision, and it is written into the go/no-go list.

## Capacity, not headcount

| | Per year |
|---|---|
| Agent time on status + POD today | <!--n:bc.baselineHoursYear-->4,973 h<!--/n--> |
| Freed: automatic replies (full handling time) + drafts (handling minus <!--n:a.reviewMinPerDraft-->1.0<!--/n--> min review) | <!--n:bc.capacityHoursYear-->3,832 h<!--/n--> |
| Of which replaces Q4 temps (<!--n:a.tempHoursAvoided-->1,368 h<!--/n--> × <!--n:a.tempRatePerHour-->€38<!--/n-->) | <!--n:bc.tempCash-->€51,984<!--/n--> |
| Of which replaces the planned 2027 hire | <!--n:a.hireAvoidedCost-->€62,000<!--/n--> |
| Freed time that stays with the team | the rest — spent on the claims backlog, French-language callbacks and the phase 2 slot-change process |

## Costs

| One-off | |
|---|---|
| Consultant: discovery, design, build, pilot, handover (<!--n:a.consultantDays-->32<!--/n--> days) | <!--n:bc.consultantCost-->€27,200<!--/n--> |
| TMS vendor: API access, custom connector support | <!--n:a.integrationCost-->€9,500<!--/n--> |
| Training, team time for the evaluation set, champions | <!--n:a.changeCost-->€4,000<!--/n--> |
| **Build** | **<!--n:bc.buildCost-->€40,700<!--/n-->** |

| Per year | |
|---|---|
| Copilot credits: <!--n:bc.creditsYear-->717,696<!--/n--> at <!--n:a.creditPrice-->€0.01<!--/n--> (every email read once; in-scope emails one extra action) | <!--n:bc.creditCostYear-->€7,177<!--/n--> |
| Power Automate Process licence | <!--n:a.flowLicencePerYear-->€1,800<!--/n--> |
| TMS API subscription | <!--n:a.apiFeePerYear-->€3,000<!--/n--> |
| Functional admin: rules, templates, evaluation set, monitoring (<!--n:a.adminDaysPerMonth-->2<!--/n--> days/month) | <!--n:bc.adminCostYear-->€9,600<!--/n--> |
| **Run** | **<!--n:bc.runCostYear-->€21,577<!--/n-->** |

Run cost per automatic reply: <!--n:bc.costPerAutoReply-->€0.50<!--/n-->. The licence line is the smallest one; the admin time is the largest — which is the honest picture of running an AI solution.

## Cash flow and NPV (<!--n:a.discountRate-->8%<!--/n-->)

| Year 0 | Year 1 (pilot + ramp-up, <!--n:a.year1BenefitFactor-->50%<!--/n--> benefit) | Year 2 | Year 3 | NPV |
|---|---|---|---|---|
| <!--n:bc.cf0-->€-40,700<!--/n--> | <!--n:bc.cf1-->€35,415<!--/n--> | <!--n:bc.cf2-->€92,407<!--/n--> | <!--n:bc.cf3-->€92,407<!--/n--> | <!--n:bc.npv3y-->€144,672<!--/n--> |

## Scenarios

| Scenario | Capacity freed | Cash benefit / year | 3-year NPV | Payback |
|---|---|---|---|---|
| Plan | <!--n:sc.plan.capacity-->3,832 h<!--/n--> | <!--n:sc.plan.cash-->€113,984<!--/n--> | <!--n:sc.plan.npv-->€144,672<!--/n--> | <!--n:sc.plan.payback-->13 months<!--/n--> |
| The 2027 hire happens anyway | <!--n:sc.no-hire.capacity-->3,832 h<!--/n--> | <!--n:sc.no-hire.cash-->€51,984<!--/n--> | <!--n:sc.no-hire.npv-->€13,595<!--/n--> | <!--n:sc.no-hire.payback-->27 months<!--/n--> |
| Draft-only forever (no automatic replies) | <!--n:sc.draft-only.capacity-->3,107 h<!--/n--> | <!--n:sc.draft-only.cash-->€113,984<!--/n--> | <!--n:sc.draft-only.npv-->€144,672<!--/n--> | <!--n:sc.draft-only.payback-->13 months<!--/n--> |
| Reviewing a draft takes 2 minutes | <!--n:sc.slow-review.capacity-->3,437 h<!--/n--> | <!--n:sc.slow-review.cash-->€113,984<!--/n--> | <!--n:sc.slow-review.npv-->€144,672<!--/n--> | <!--n:sc.slow-review.payback-->13 months<!--/n--> |
| Only half the planned automatic share | <!--n:sc.half-auto.capacity-->2,464 h<!--/n--> | <!--n:sc.half-auto.cash-->€94,463<!--/n--> | <!--n:sc.half-auto.npv-->€103,401<!--/n--> | <!--n:sc.half-auto.payback-->15 months<!--/n--> |

**What the scenarios say:**

1. **The money is in the drafts, the speed is in the automation.** Draft-only mode alone frees enough hours to cover the temps and the hire. Automatic replies add capacity and — more importantly for customers — turn a 2.9-hour first response into minutes. That is why the rollout starts in draft-only mode without risk to the business case.
2. **The avoided hire is the swing factor.** The sensitivity analysis (±25% on each assumption) puts it at the top: NPV between <!--n:sens.topLow-->€111,902<!--/n--> and <!--n:sens.topHigh-->€177,441<!--/n-->. Credit prices and email volume barely move the result.
3. **Do not sell this on licences.** At <!--n:bc.creditCostYear-->€7,177<!--/n--> a year the AI consumption is a rounding error next to the people time on both sides.

## What is not in the numbers

- Customer value: faster answers, fewer repeat emails (12% today), French-speaking customers no longer waiting longest. Measured in the pilot, not monetised.
- Risk reduction: today agents occasionally send status to the wrong contact; there is no data on how often.
- Phase 2 (slot changes) — separate case once phase 1 runs.
