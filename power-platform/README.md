# Power Platform: the solution, built

The design in [docs/02-design](../docs/02-design/to-be-and-architecture.md) is **built** in a Power Platform developer environment as one solution, `CorlaanCustomerEmail`: a Copilot Studio agent, three cloud flows, Dataverse tables, a model-driven app with a KPI dashboard, environment variables and connection references. Everything is created by the scripts in this folder, so it can be rebuilt in another environment.

> **Fictional and contained.** A shared developer environment with fictional data only. The TMS is a set of sandbox tables; the shared mailbox is not connected yet (emails are rows in a table, replies are rows in an outbox table). The links to the environment only work for its makers; for everyone else there are the [verification](VERIFICATION.md), the [solution source](solution/) and the screenshots.

## What is built

| Component | What | Source |
|---|---|---|
| Copilot Studio agent **Corlaan Mail Reader** | reads one email and returns JSON; no tools, no knowledge, no web; published | [copilot-studio/agent/](../copilot-studio/agent/), generated from [instructions.md](../copilot-studio/instructions.md) by [scripts/sync-agent.mjs](../scripts/sync-agent.mjs) |
| Cloud flow **CRL-01 Read inbound email** | kill switch, screens automated mail (R01), calls the agent with *Execute Agent and wait* | [flows/](flows/README.md) |
| Cloud flow **CRL-02 Decide and reply** | TMS look-ups, authorisation per shipment, rules R02–R18, reply from templates | [flows/](flows/README.md) |
| Cloud flow **CRL-03 Review draft** | held replies to a colleague through Approvals (Teams / Outlook) | [flows/](flows/README.md) |
| Dataverse | 6 tables: inbound emails (the audit log), replies (the outbox), reply templates, and the TMS sandbox (shipments, accounts, contacts) | [model.json](model.json) |
| Environment variables | `crl_Mode` (graduated / draft-only / **off**), the four thresholds, free-mail domains, reviewer, test clock | [model.json](model.json), values per environment in [deployment-settings/](deployment-settings/) |
| Model-driven app **Corlaan Customer Service** | KPI dashboard (6 charts), every email with its decision and findings, drafts awaiting review, TMS sandbox, templates | [apps/](apps/README.md) |

## Proof: the real flows decide exactly like the tested code

[scripts/seed-emails.mjs](scripts/seed-emails.mjs) puts the test emails in the inbound table; the flows take over; [scripts/verify.mjs](scripts/verify.mjs) reads back what they decided and compares it with `runGuarded()` in [src/pipeline.mjs](../src/pipeline.mjs), given the same reading.

| Batch | Reading | Same decision as the code | Same reply text, character for character | As expected |
|---|---|---|---|---|
| Main set | recorded reading of the stand-in | **<!--n:pp.main-standin.same-->48<!--/n-->/<!--n:pp.main-standin.emails-->48<!--/n-->** | <!--n:pp.main-standin.reply-->48<!--/n-->/<!--n:pp.main-standin.emails-->48<!--/n--> | <!--n:pp.main-standin.expected-->48<!--/n-->/<!--n:pp.main-standin.emails-->48<!--/n--> |
| Held-out set | the labelled correct reading | **<!--n:pp.holdout-labels.same-->24<!--/n-->/<!--n:pp.holdout-labels.emails-->24<!--/n-->** | <!--n:pp.holdout-labels.reply-->24<!--/n-->/<!--n:pp.holdout-labels.emails-->24<!--/n--> | <!--n:pp.holdout-labels.expected-->24<!--/n-->/<!--n:pp.holdout-labels.emails-->24<!--/n--> |

Details per email: [VERIFICATION.md](VERIFICATION.md). Screens of the agent, a flow run and the app: [docs/screenshots/power-platform/](../docs/screenshots/power-platform/README.md).

## The live agent

The same 72 emails, read live by the Copilot Studio agent through flow CRL-01:

| Batch | Same decision as the code (given the agent's reading) | Same reply text | As expected |
|---|---|---|---|
| Main set | **<!--n:pp.main-agent.same-->48<!--/n-->/<!--n:pp.main-agent.emails-->48<!--/n-->** | <!--n:pp.main-agent.reply-->48<!--/n-->/<!--n:pp.main-agent.emails-->48<!--/n--> | <!--n:pp.main-agent.expected-->44<!--/n-->/<!--n:pp.main-agent.emails-->48<!--/n--> |
| Held-out set | **<!--n:pp.holdout-agent.same-->24<!--/n-->/<!--n:pp.holdout-agent.emails-->24<!--/n-->** | <!--n:pp.holdout-agent.reply-->24<!--/n-->/<!--n:pp.holdout-agent.emails-->24<!--/n--> | <!--n:pp.holdout-agent.expected-->24<!--/n-->/<!--n:pp.holdout-agent.emails-->24<!--/n--> |

The four misses are safe (a draft or a routing instead of an automatic reply) and none is harmful: see [docs/04-test/model-evaluation.md](../docs/04-test/model-evaluation.md#copilot-studio-live).

**What went wrong first, and what it taught.** The first run sent 72 emails at once. 47 agent calls failed with *GenAITool* errors, the generative-AI rate limit of a developer environment. The design did its job: every failed call became a safe reading, so every one of those emails became a draft for a colleague. Nothing wrong was sent ([archive](verification/archive/)). The fix is a production setting anyway: the trigger of CRL-01 now runs one email at a time (concurrency control), and the run was repeated.

## Build it yourself

Requires Node.js 20+, the Azure CLI signed in as a maker of the target environment, and `pac` (Power Platform CLI).

```bash
# environment.local.json: { "url": "https://<org>.crm4.dynamics.com", "tenantId": "<tenant>", "reviewer": "<you@tenant>" }
node power-platform/scripts/provision-schema.mjs        # publisher, solution, tables, keys, environment variables
node power-platform/scripts/seed-master.mjs             # TMS sandbox + reply templates (from src/compose.mjs)
node scripts/sync-agent.mjs && (cd copilot-studio/agent && pac copilot push) && pac copilot publish --bot crl_corlaanMailReader
node power-platform/scripts/connections.mjs             # Dataverse, Approvals, Copilot Studio (one-time consent)
node power-platform/scripts/provision-flows.mjs --activate
node power-platform/scripts/provision-dashboard.mjs && node power-platform/scripts/provision-app.mjs
node power-platform/scripts/seed-emails.mjs main-standin main stand-in
node power-platform/scripts/verify.mjs main-standin
node power-platform/scripts/export-solution.mjs         # ALM: unmanaged source in solution/src, solution checker
```

## Lessons from building it (the things a demo does not show)

| What happened | Why | What changed |
|---|---|---|
| A text column `crl_carriername` could not be written | a choice column `crl_carrier` creates a hidden `crl_carriername` itself | renamed to `crl_haulier` |
| An environment variable refused the reply templates | values hold at most 2,000 characters | templates in a table, one row per language |
| The agent would not publish: "Unexpected character in expression" | Copilot Studio reads `{…}` in instructions as Power Fx | literal braces written as `{Char(123)}` / `{Char(125)}` by the sync script |
| Two exception shipments failed the flow | Power Automate's `and()` evaluates every argument; `ticks(null)` fails | null-sensitive rules guarded with `if()`, which does short-circuit |
| Dutch dates differed: "okt." vs "okt" | .NET and the browser abbreviate months differently | the flow drops the period for nl-BE; verification compares every character |
| 47 of 72 agent calls failed on the first live run | parallel generative-AI calls in a developer environment | trigger concurrency 1; failures already fell back to drafts |
| The prompt-injection email never reached the model | the content filter (Prompt Shields) refused it, in Foundry and in Copilot Studio | a refusal is treated as an instruction signal → routed to security |
