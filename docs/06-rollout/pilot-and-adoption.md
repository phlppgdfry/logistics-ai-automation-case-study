# Pilot, adoption and measurement

## The autonomy ladder

Nobody — not the team lead, not the sponsor, not the consultant — trusts an automated mailbox on day one. Trust is earned in steps, each with a gate that is measured, not felt.

| Stage | What the flow does | Duration | Gate to the next stage |
|---|---|---|---|
| **0. Shadow** | runs on a copy of the mailbox, writes outcomes to the log only; nobody sees drafts | 1 week | outcomes agree with what agents actually did on ≥ 90% of in-scope emails; no harm in a sample of 100 reviewed by the team lead |
| **1. Draft-only** (R18) | every reply is a draft with a Teams card; agents send, edit or reject | 2 weeks | ≥ 95% of drafts that would have been automatic are sent unedited; zero rejections for data-protection reasons; DPO sign-off |
| **2. Graduated** | automatic for plain status and POD to contacts; drafts and routing as designed | from week 4 | — (steady state; weekly review continues) |
| **3. Expand** | phase 2: slot changes, separate design | after 3 months stable | separate business case |

Going back down is one setting (`crl_Mode`) and is **automatic** when: a data-protection incident occurs, the weekly sample shows a harm, or the evaluation set drops below target after a model change.

## Plan (illustrative, 10 weeks)

| Week | Work | Who |
|---|---|---|
| 1 | mailbox analysis, interviews, use-case workshop | consultant, team lead, 2 agents |
| 2 | evaluation set (90 min session), rules, templates in 3 languages | consultant, team lead |
| 3–4 | build: environment, solution, connector, agent, flow, Dataverse tables | consultant, IT, TMS vendor |
| 5 | test: evaluation set in Copilot Studio, flow tests against the mock and the vendor's test API, load test | consultant, IT |
| 6 | **go/no-go 1** → shadow | sponsor, team lead, IT, DPO |
| 7–8 | draft-only | whole team |
| 9 | **go/no-go 2** → graduated | sponsor, team lead |
| 10 | handover: runbook, admin training, first weekly review led by the team lead | consultant → team lead + IT |

## Go/no-go list

| # | Criterion | Owner |
|---|---|---|
| 1 | Evaluation set: 48/48 decisions in CI; agent reading targets met in Copilot Studio | consultant |
| 2 | DPO screening signed; privacy notice paragraph live | DPO |
| 3 | App registration with read scope only; secret in the connector; rotation date set | IT |
| 4 | DLP policy and environments in place ([governance](../07-governance/governance-and-run.md)) | IT |
| 5 | Kill switch tested: `off` and `draft-only` | IT |
| 6 | Templates approved by the team lead in NL, FR, EN | team lead |
| 7 | Sponsor confirms in writing: no Q4 temps 2026 and the 2027 hire is on hold pending the pilot | operations director |
| 8 | Two key accounts informed (Vandael, Hortex) — no surprise when the first automatic reply arrives | account managers |

Criterion 7 is unusual and deliberate: without it the business case is <!--n:sc.no-hire.npv-->€13,595<!--/n-->, not <!--n:bc.npv3y-->€144,672<!--/n-->.

## Adoption

The team's question is *"what does this mean for me?"*. The answer, given by the sponsor in the kick-off, not by the consultant:

- Nobody leaves because of this. Q4 without temps, and no new hire next year.
- The time goes to work the team says it never gets to: claims follow-up, French callbacks, and designing the slot-change process.
- The team lead owns the templates, the thresholds and the weekly review. The flow works for the team, not the other way round.

| Activity | When | Format |
|---|---|---|
| Kick-off with the sponsor | week 1 | 30 min, whole team |
| "Break it" session: team writes emails to fool the rules | week 2 | 60 min — best cases join the evaluation set |
| Draft review training (Teams card, edit reasons) | week 6 | 20 min + one-page guide |
| Champions: one NL, one FR agent | from week 6 | first line for questions, collect edit reasons |
| Weekly review | from week 7 | 30 min: 20 random automatic replies, all rejected drafts, rule changes |

## KPIs

| KPI | Baseline | Target (week 12) | Measured from |
|---|---|---|---|
| Median first response, status/POD | 2.9 h | < 15 min (auto), < 2 h (draft) | audit log + message trace |
| French-language first response | 5.2 h | equal to NL/EN | audit log |
| Share answered automatically (in-scope) | 0% | <!--n:a.autoShare-->55%<!--/n--> | audit log |
| Drafts sent unedited | — | ≥ 85% | Teams card responses |
| Repeat emails ("2nd time I ask") | 12% | < 5% | monthly labelled sample |
| Data-protection incidents | unknown | 0 | incident log |
| Agent hours on status + POD | <!--n:bc.baselineHoursYear-->4,973 h<!--/n-->/year | −<!--n:bc.capacityHoursYear-->3,832 h<!--/n--> | timing sample, quarterly |
| Copilot credits per month | — | within the forecast ±20% | Power Platform admin center |

Guardrail KPI: **customer complaints about email answers** must not rise. If they do, the ladder goes down one step.
