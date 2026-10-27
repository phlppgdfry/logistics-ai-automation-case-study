# "Where is my delivery?" — AI & Automation Business Transformation, Logistics Case Study

**Copilot Studio agent + Power Automate + Dataverse + Azure AI Foundry + policy rules + business case, built and measured**

> A logistics company answers <!--n:a.emailsPerDay-->640<!--/n--> customer emails a day by hand, and half of them ask what the transport system already knows. This case takes it from a mailbox analysis to a tested solution. An agent reads each email, a flow checks the TMS and <!--n:rules.count-->18<!--/n--> rules, and a reply goes out in minutes, never to the wrong person. The business case says honestly where the money comes from.

> *Independent portfolio case study based on a fictional organisation (Corlaan Logistics). It contains no confidential information from any real employer.*

**[Live site](https://phlppgdfry.github.io/logistics-ai-automation-case-study/)** · **[2-minute demo](https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/?tour)** · **[Start here](START-HERE.md)** · **[Evidence matrix](EVIDENCE.md)** · **[Case study](CASE_STUDY.md)**

[![Checks](https://github.com/phlppgdfry/logistics-ai-automation-case-study/actions/workflows/checks.yml/badge.svg)](https://github.com/phlppgdfry/logistics-ai-automation-case-study/actions/workflows/checks.yml)

## The journey

```text
Run the workshops          inspiration session, discovery workshop, use-case canvas, prioritisation
   ↓
Analyse the mailbox        1,000 emails labelled, handling time measured, references counted
   ↓
Design the solution        agent reads → flow looks up → rules decide → template replies
   ↓
Write the rules            18 named rules: who may see what, when a person must look
   ↓
Secure it                  14 threats, each with a control and a test
   ↓
Test it                    48-email evaluation set in CI: guarded vs naive design
   ↓
Measure the reading        a real model (Azure AI Foundry) and the live agent on a held-out set
   ↓
Build it                   Copilot Studio agent, 3 cloud flows, Dataverse, app: decides like the tests
   ↓
Prove the value            capacity vs cash, NPV, scenarios, sensitivity
   ↓
Roll out in steps          shadow → draft-only → graduated, with measured gates
   ↓
Train and hand over        reviewer training, champions, "break it" session, governance as files
```

## The problem

Corlaan Logistics (fictional, Belgian pallet distribution) gets <!--n:a.emailsPerDay-->640<!--/n--> emails a day. <!--n:a.shareWismo-->38%<!--/n--> ask *where is my delivery*, <!--n:a.sharePod-->11%<!--/n--> ask for a proof of delivery. Agents spend <!--n:bc.baselineHoursYear-->4,973 h<!--/n--> a year on them, mostly finding the shipment in the TMS. French-speaking customers wait 5.2 hours. Customer service asks for an extra FTE; the operations director wants to know what can be automated first.

## What I did

- **Ran the workshops**: inspiration session for management, a 2-hour discovery run sheet, the use-case canvas, and a prioritisation of 8 use cases (generated from data) → [workshops and training](docs/08-workshops-and-training/discovery-workshop.md)
- **Analysed** the mailbox: categories, handling time, reference formats, what makes an email hard → [mailbox analysis](docs/01-discover/mailbox-analysis.md), [AS-IS and interviews](docs/01-discover/as-is-and-interviews.md)
- **Designed** a Copilot Studio agent *without tools* that only reads, and a Power Automate flow that looks up, decides and replies → [TO-BE and architecture](docs/02-design/to-be-and-architecture.md), [agent](copilot-studio/README.md), [flow](power-automate/README.md)
- **Specified** the TMS integration as an OpenAPI 2.0 contract for a custom connector, with a mock server → [integration](docs/02-design/integration-tms-api.md), [contract](api/tms-shipments.swagger.json)
- **Wrote** <!--n:rules.count-->18<!--/n--> policy rules as code: authorisation per shipment, stale data, sensitive messages, prompt injection, loops → [policy rules](docs/02-design/policy-rules.md), [src/](src/)
- **Tested** against a <!--n:tests.cases-->48<!--/n-->-email evaluation set and a naive design: <!--n:tests.passed-->48<!--/n-->/<!--n:tests.cases-->48<!--/n--> correct with <!--n:guarded.harmful-->0<!--/n--> harm, vs <!--n:naive.harmful-->23<!--/n--> harmful outcomes for the naive design → [test results](docs/04-test/test-strategy-and-results.md), [threat model](docs/03-security/threat-model.md)
- **Measured the reading on a real model**: gpt-4.1-mini in Azure AI Foundry on the main set and on <!--n:ho.cases-->24<!--/n--> held-out emails the stand-in never saw. Stand-in <!--n:me.stand-in.ho-->14<!--/n-->/<!--n:ho.cases-->24<!--/n--> with <!--n:me.stand-in.hoHarm-->3<!--/n--> harmful; model with instructions v3 <!--n:me.f-v3.ho-->24<!--/n-->/<!--n:ho.cases-->24<!--/n-->, <!--n:me.v3.mainMin-->44<!--/n-->–<!--n:me.v3.mainMax-->45<!--/n-->/<!--n:tests.cases-->48<!--/n--> on the main set, no harmful outcome in 3 runs. The live Copilot Studio agent: <!--n:me.cs.ho-->24<!--/n-->/<!--n:ho.cases-->24<!--/n--> and <!--n:me.cs.main-->44<!--/n-->/<!--n:tests.cases-->48<!--/n-->, no harmful outcome → [model evaluation](docs/04-test/model-evaluation.md)
- **Built it in Power Platform**: the Copilot Studio agent (as code, published), three cloud flows, Dataverse tables, a model-driven app with a KPI dashboard. The real flows decide **<!--n:pp.main-standin.same-->48<!--/n-->/<!--n:pp.main-standin.emails-->48<!--/n-->** and **<!--n:pp.holdout-labels.same-->24<!--/n-->/<!--n:pp.holdout-labels.emails-->24<!--/n-->** emails exactly like the tested code, with identical reply texts → [power-platform/](power-platform/README.md), [verification](power-platform/VERIFICATION.md)
- **Built** the business case from one model file: capacity <!--n:bc.capacityHoursYear-->3,832 h<!--/n--> a year, NPV <!--n:bc.npv3y-->€144,672<!--/n-->, and <!--n:sc.no-hire.npv-->€13,595<!--/n--> if the planned hire happens anyway → [business case](docs/05-business-case/business-case.md)
- **Added a second agent pattern**: a procedures assistant that answers from four procedure documents with its source, 14/14 on its question set, with an oversharing check on its knowledge → [procedures agent](copilot-studio/procedures-agent/README.md)
- **Planned** rollout, adoption, governance and run → [pilot and adoption](docs/06-rollout/pilot-and-adoption.md), [governance and runbook](docs/07-governance/governance-and-run.md), [data protection](docs/03-security/data-protection.md)

## What this demonstrates

| Consultant skill | Evidence |
|---|---|
| Business analysis: from a vague complaint to measured facts | [mailbox analysis](docs/01-discover/mailbox-analysis.md) |
| Solution design with Copilot Studio and Power Automate | [architecture](docs/02-design/to-be-and-architecture.md), [ADR-002](docs/adr/002-copilot-studio-agent-called-from-flow.md) |
| Integration: API contract, OAuth, error handling | [integration](docs/02-design/integration-tms-api.md), [api/](api/) |
| Responsible AI: security, privacy, human in the loop | [threat model](docs/03-security/threat-model.md), [ADR-001](docs/adr/001-model-proposes-policy-decides.md) |
| Testing an AI solution before trusting it | [test strategy](docs/04-test/test-strategy-and-results.md), [tests/](tests/) |
| Business case with costs, benefits and honest caveats | [business case](docs/05-business-case/business-case.md) |
| Change, adoption, governance, handover | [rollout](docs/06-rollout/pilot-and-adoption.md), [governance](docs/07-governance/governance-and-run.md) |
| Workshops and training: discovery, prioritisation, reviewer training, champions | [workshops and training](docs/08-workshops-and-training/discovery-workshop.md) |
| Building in Copilot Studio and Power Automate, with ALM | [power-platform/](power-platform/README.md), [copilot-studio/agent/](copilot-studio/agent/) |
| Azure AI Foundry: evaluating a model before trusting it | [model evaluation](docs/04-test/model-evaluation.md) |
| Power Platform governance as checks: DLP, environment settings, kill switch | [governance files](power-platform/governance/), `tests/governance.test.mjs` |
| EU AI Act screening | [EU AI Act](docs/03-security/eu-ai-act.md) |

Full mapping: [EVIDENCE.md](EVIDENCE.md).

## Key decisions

1. **The model reads; rules decide what is sent.** An agent with send and TMS tools is a quick demo and a bad idea: on the test set it harms in <!--n:naive.harmful-->23<!--/n--> of <!--n:tests.cases-->48<!--/n--> emails ([ADR-001](docs/adr/001-model-proposes-policy-decides.md)).
2. **A Copilot Studio agent without tools, called from a flow**, so the reading can be tested on its own and a 3-person IT team can run it ([ADR-002](docs/adr/002-copilot-studio-agent-called-from-flow.md)).
3. **Templates, not generated text.** Every sentence approved once, every fact from the TMS ([ADR-003](docs/adr/003-templates-not-free-text.md)).
4. **Authorise every shipment.** The reply is the same for "not found" and "not yours", so the mailbox cannot be probed ([ADR-004](docs/adr/004-authorise-every-shipment.md)).
5. **Shadow → draft-only → graduated.** Draft-only alone already covers the cash, so trust can be earned without risk to the business case ([ADR-005](docs/adr/005-autonomy-ladder.md)).

## How to run and verify

Requires Node.js 20+ (no dependencies) and Python 3 for the link check.

| What | How | You should see |
|---|---|---|
| Open the prototype | [demo/?tour](https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/?tour) | the 2-minute guided tour |
| Run locally | `python3 -m http.server -d site 8000` → http://localhost:8000 | the same site |
| All tests | `node --test tests/*.test.mjs` | all passing: evaluation set, model replay, reply scans, agent contract, API, business case, governance, procedures agent |
| Model evaluation (needs an Azure AI Foundry deployment) | `node scripts/eval-model.mjs` | readings recorded in `evaluation/runs/`; the build replays them |
| Build it in Power Platform | see [power-platform/README.md](power-platform/README.md) | the solution in a developer environment, then `verify.mjs` |
| Rebuild derived files | `node scripts/build.mjs` | `build ok · test set 48/48 · naive harmful 23 · NPV €144,672` |
| TMS mock API | `node api/mock-server.mjs` then `curl -H "Authorization: Bearer demo" localhost:4010/v1/shipments/CL-2026-0412345` | a shipment as JSON |
| Agent evaluation CSV | `node scripts/export-eval-csv.mjs` | `copilot-studio/evaluation-set.csv` for Copilot Studio |
| Check links | `python3 scripts/check-links.py` | `All relative links OK.` |

CI ([checks.yml](.github/workflows/checks.yml)) runs the tests, re-runs the build and fails if any number in the docs or the site no longer matches the model or the test set.

## If the demo does not load

Screenshots of every tour step: [docs/screenshots/](docs/screenshots/README.md).

## Repository map

| Folder | Contents |
|---|---|
| `docs/00-context/` | company, trigger, stakeholders, scope, messiness |
| `docs/01-discover/` | mailbox analysis, AS-IS, interviews, use-case shortlist |
| `docs/02-design/` | TO-BE, architecture, policy rules, TMS integration |
| `docs/03-security/` | threat model, data protection |
| `docs/04-test/` | test strategy and results |
| `docs/05-business-case/` | business case |
| `docs/06-rollout/` | pilot, autonomy ladder, adoption, KPIs |
| `docs/07-governance/` | environments, DLP, ALM, ownership, runbook |
| `docs/08-workshops-and-training/` | inspiration session, discovery run sheet, use-case canvas, prioritisation, reviewer training, champions |
| `docs/adr/` | five design decisions |
| `copilot-studio/` | agent instructions, output schema, build guide; `agent/` = the agent as a pac workspace; `procedures-agent/` = the second agent |
| `power-platform/` | the built solution: Dataverse model, flows as code, provisioning, verification, governance, deployment settings |
| `evaluation/` | recorded model and agent readings, replayed by the build |
| `power-automate/` | flow specification, step by step |
| `api/` | OpenAPI 2.0 contract (custom connector) and mock server |
| `src/` | pipeline, rules, templates, business case — shared by tests and site |
| `data/` | fictional TMS data, 48 evaluation emails, 24 held-out emails, use cases, business case assumptions |
| `tests/` | `node:test` suites |
| `site/` | GitHub Pages site and demo |
| `application-kit/` | one-page summary, 5-minute story |

## Sources, data and licences

| Source / dependency | Used for | Licence |
|---|---|---|
| Microsoft Learn: Copilot Studio, Power Automate, custom connectors, DLP, ALM (October 2026) | product behaviour and licensing assumptions; verify before relying on them | — |
| Copilot Studio billing rates (Copilot credits per feature) | credit estimate in the business case | — |
| OpenAPI 2.0 specification | connector contract | — |
| All data, emails, people and companies | case material | self-written, fictional |
| No runtime dependencies | — | — |

This repository: [MIT](LICENSE) for code; documents © the author.

## Limitations and assumptions

All figures are *illustrative assumptions — not real company data*. Deliberate imperfections (messy references, stale subcontractor data, a worried team) are part of the case.

- **In CI and the demo, the reading is a stand-in.** The deterministic stand-in ([src/text.mjs](src/text.mjs)) keeps CI free of models and keys. Real readings, from Azure AI Foundry and from the live Copilot Studio agent, are **recorded** and replayed ([evaluation/runs/](evaluation/runs/)).
- **Built in a developer environment, not in a client tenant.** The agent, the flows, the tables and the app run in a shared developer environment with fictional data. The shared mailbox is not connected yet: emails are rows in a table and replies are rows in an outbox table. The TMS is a set of sandbox tables, not the custom connector.
- **Not tested:** real email traffic, load against a real TMS, Power BI (the KPIs are a Dataverse dashboard), the Teams publication of the procedures agent, tenant-level DLP and Purview policies (they are files and checks here).
- **Model evaluation limits:** 72 emails, written by one author; GlobalStandard deployment (processing may happen outside the EU), fictional data only.
- **Not shown:** phase 2 (slot changes), claims intake, the customer portal.
