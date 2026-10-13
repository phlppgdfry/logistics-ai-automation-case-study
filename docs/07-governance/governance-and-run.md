# Governance and run

## Environments and ALM

| Environment | Purpose | Who builds | Data |
|---|---|---|---|
| Default | personal productivity only; new flows with premium or custom connectors blocked by DLP | everyone | — |
| `corlaan-cs-dev` | build and change | consultant, later the trained admin | mock API, test mailbox |
| `corlaan-cs-test` | evaluation set, load test, acceptance | IT | vendor test API, test mailbox |
| `corlaan-cs-prod` | live | nobody builds here; managed solution only | production |

- One solution `CorlaanCustomerEmail` (publisher `cor`): agent, flow, custom connector, Dataverse tables, environment variables, connection references.
- Promotion dev → test → prod as a **managed** solution, exported and stored in the repo; later via Power Platform pipelines.
- Every change to a rule or template: change in dev → add/adjust a case in the evaluation set → test → prod. The evaluation set is the regression test.

## Data loss prevention (production environment)

| Group | Connectors |
|---|---|
| Business | Office 365 Outlook, Microsoft Teams, Microsoft Dataverse, Microsoft Copilot Studio, Corlaan TMS (custom) |
| Blocked | HTTP, HTTP with Entra ID, all consumer connectors (Gmail, Dropbox, …), any other custom connector |

The default environment gets a stricter policy at the same time: business data connectors cannot be combined with consumer connectors. The 14 personal flows found in discovery were reviewed with their makers; 3 were moved to a proper environment, 11 kept as personal productivity.

## Ownership

| What | Owner | Backup |
|---|---|---|
| Templates, thresholds, weekly review, evaluation set | team lead customer service | NL champion |
| Flow, connector, environments, kill switch, credits | IT manager | IT engineer |
| App registration, secret rotation | IT manager | — |
| Business case follow-up (KPIs, hire decision) | operations director | — |
| Data protection | external DPO | — |

## Runbook

| Situation | Signal | Action |
|---|---|---|
| **Stop everything now** | anyone | set `cor_Mode = off` (IT or team lead). Mail stays in the inbox as before. |
| Wrong reply sent | complaint, weekly review | `cor_Mode = draft-only`; find the audit row; add the email to the evaluation set; fix the rule; promote; back to graduated after a clean week |
| TMS down | flow errors, circuit breaker alert | nothing — flow is in draft-only automatically; check vendor status; reset breaker when green |
| Credits running out | admin center alert at 80% | raise capacity or accept: the flow routes everything to the team when Copilot Studio stops |
| Model update announced by Microsoft | message center | run the agent evaluation in test; below target → stay on draft-only until fixed |
| Count mismatch | daily check: emails received ≠ audit rows | look for failed runs; reprocess from the inbox |
| Secret expiry | 30 days before, IT calendar | rotate in Entra ID, update the connection, test one lookup |

## Open points at handover

- TMS vendor to confirm a 120/min rate limit for Monday peaks.
- Contact list hygiene with key accounts: quarterly, owner account management.
- Phase 2 (slot changes) needs a write API from the vendor — separate decision.
