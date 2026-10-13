# Test strategy and results

## What we test, and how

| Level | What | How | Where |
|---|---|---|---|
| 1. Reading | language, intent, references, signals | evaluation set in Copilot Studio (agent) / stand-in in CI | [copilot-studio/](../../copilot-studio/README.md), `tests/agent-contract.test.mjs` |
| 2. Decisions | the right outcome per email: auto, draft, route, ignore — and the right rule | **evaluation set of <!--n:tests.cases-->48<!--/n--> emails**, run on every commit | [data/emails.json](../../data/emails.json), `tests/pipeline.test.mjs` |
| 3. Replies | only TMS facts, only authorised shipments, no personal data, right language, automation notice | scans of every reply the set produces | `tests/replies.test.mjs` |
| 4. Integration | contract, data and error codes agree | mock server in CI | `tests/api.test.mjs` |
| 5. Value | business case arithmetic and scenarios | unit tests on the model | `tests/business-case.test.mjs` |
| 6. Pilot | real emails, real people | draft-only weeks: every proposed reply reviewed | [rollout](../06-rollout/pilot-and-adoption.md) |

## The evaluation set

Built with the team lead in one 90-minute session: *"Give me the emails you would never want a machine to answer — and the ones you'd love it to."* Then completed to cover every rule. It is **deliberately hard**: only <!--n:tests.auto-->21<!--/n--> of <!--n:tests.cases-->48<!--/n--> emails should be answered automatically, against ±<!--n:a.autoShare-->55%<!--/n--> of real in-scope traffic.

| Group | Expected outcome | Emails |
|---|---|---|
| Plain questions | automatic reply (status / POD / ask for reference / generic) | <!--n:tests.auto-->21<!--/n--> |
| A person should check first | draft | <!--n:tests.draft-->12<!--/n--> |
| A person should handle it | route to a queue | <!--n:tests.route-->11<!--/n--> |
| Automated mail | ignore | <!--n:tests.ignore-->4<!--/n--> |

Every email has an expected action, template, queue and the rule that must fire. A pass means all four match.

## Results

**Guarded design: <!--n:tests.passed-->48<!--/n-->/<!--n:tests.cases-->48<!--/n--> correct, <!--n:guarded.harmful-->0<!--/n--> harmful outcomes.** Every one of the <!--n:rules.count-->18<!--/n--> rules is exercised (R18 in a separate draft-only run).

### Compared with the naive design

The naive design is what a quick demo usually is: one model with the mailbox and a TMS tool, told to *help customers*. It finds every reference anywhere in the thread, looks it up across all accounts and answers everything. Same data, same templates for the status line — only the policy is missing.

| Harm | Naive | Guarded |
|---|---|---|
| Shipment data sent to someone not entitled to it | <!--n:naive.leak-->5<!--/n--> | 0 |
| Automatic answer from stale or already-late data | <!--n:naive.stale-->5<!--/n--> | 0 |
| Status line where a person was needed (damage, dispute, legal, anger, exception, out of scope) | <!--n:naive.tone-->9<!--/n--> | 0 |
| Reply to an automated sender (loop risk) | <!--n:naive.loop-->4<!--/n--> | 0 |
| Email with instructions handled without a person | <!--n:naive.instruction-->2<!--/n--> | 0 |
| **Emails with at least one harm** | **<!--n:naive.harmful-->23<!--/n--> of <!--n:tests.cases-->48<!--/n-->** | **<!--n:guarded.harmful-->0<!--/n-->** |

This table is the answer to the sponsor's question *"what happens if it sends something wrong to Vandael?"*. The demo's **Test set** tab replays it live.

### What the set does not prove

- That the real model reads as well as the stand-in. Level 1 must be run in Copilot Studio before the pilot; the targets are in [copilot-studio/README.md](../../copilot-studio/README.md).
- That 48 emails cover the real world. The pilot's draft-only weeks are the second test set: every rejected or edited draft becomes a new case in `data/emails.json`.
- Performance and rate limits under Q4 load. Load test against the vendor's test environment is on the go/no-go list.

## Adding a case

1. Add the email to [data/emails.json](../../data/emails.json) with the outcome a careful colleague would choose.
2. `node --test tests/*.test.mjs` — if it fails, decide: is the rule wrong, or the expectation?
3. Change [src/rules.mjs](../../src/rules.mjs) / [src/pipeline.mjs](../../src/pipeline.mjs) if needed, then `node scripts/build.mjs` to refresh the numbers in the docs and the site.
4. If the flow is live: change the same condition in the flow, in the dev environment, and promote through test (see [governance](../07-governance/governance-and-run.md)).
