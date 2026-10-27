# Governance and run

## Environments and ALM

| Environment | Purpose | Who builds | Data |
|---|---|---|---|
| Default | personal productivity only; new flows with premium or custom connectors blocked by DLP | everyone | — |
| `corlaan-cs-dev` | build and change | consultant, later the trained admin | mock API, test mailbox |
| `corlaan-cs-test` | evaluation set, load test, acceptance | IT | vendor test API, test mailbox |
| `corlaan-cs-prod` | live | nobody builds here; managed solution only | production |

- One solution `CorlaanCustomerEmail` (publisher `crl`): agent, cloud flows, custom connector, Dataverse tables, environment variables, connection references. **Built** in a developer environment: see [power-platform/](../../power-platform/README.md).
- Promotion dev → test → prod as a **managed** solution with a settings file per environment ([deployment-settings/](../../power-platform/deployment-settings/)): `pac solution import --settings-file test.json`. The settings file holds every environment variable and connection reference, never a secret; a test fails when a new variable has no value for an environment ([tests/governance.test.mjs](../../tests/governance.test.mjs)). Later via Power Platform pipelines, with the same settings files.
- Every change to a rule or template: change in dev → add/adjust a case in the evaluation set → test → prod. The evaluation set is the regression test.

## Data loss prevention (production environment)

The policy is a file, [governance/dlp-policy.prod.json](../../power-platform/governance/dlp-policy.prod.json), in the shape of the admin API. A test checks that every connector the flows use is in the business group and that no flow uses an HTTP action, so a flow change that would break the policy fails in CI before it reaches the admin.


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
| **Stop everything now** | anyone | set the environment variable `crl_Mode = off` (IT or team lead). Flow CRL-01 stops at its first step; mail stays in the inbox as before. |
| Wrong reply sent | complaint, weekly review | `crl_Mode = draft-only`; find the audit row; add the email to the evaluation set; fix the rule; promote; back to graduated after a clean week |
| TMS down | flow errors, circuit breaker alert | nothing — flow is in draft-only automatically; check vendor status; reset breaker when green *(designed; the built flows use the TMS sandbox tables)* |
| Credits running out | admin center alert at 80% | raise capacity or accept: when the agent call fails, CRL-01 stores a safe reading (unknown, confidence 0), so every email becomes a draft for the team |
| Model update announced by Microsoft | message center | run the agent evaluation in test; below target → stay on draft-only until fixed |
| Count mismatch | daily check: emails received ≠ audit rows | look for failed runs; reprocess from the inbox |
| Secret expiry | 30 days before, IT calendar | rotate in Entra ID, update the connection, test one lookup |

## Open points at handover

- TMS vendor to confirm a 120/min rate limit for Monday peaks.
- Contact list hygiene with key accounts: quarterly, owner account management.
- Phase 2 (slot changes) needs a write API from the vendor — separate decision.
