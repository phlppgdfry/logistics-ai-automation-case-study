# Evidence matrix

What an AI & automation consultant is typically asked to do, and where this case shows it. "Shown" means there is an artefact you can open; "not claimed" means this case does not prove it.

| Requirement | Shown in | Strength | Not claimed |
|---|---|---|---|
| Analyse business processes and find automation opportunities | [mailbox analysis](docs/01-discover/mailbox-analysis.md), [AS-IS and interviews](docs/01-discover/as-is-and-interviews.md) | method, numbers, findings that changed the design | a real client engagement |
| Translate a business problem into AI use cases and pick the right one | [use-case shortlist](docs/01-discover/as-is-and-interviews.md#use-case-shortlist-workshop-2-h) — incl. rejected options | value × feasibility × risk, with reasons | — |
| Design AI agents in Copilot Studio | [agent design](copilot-studio/README.md), [instructions](copilot-studio/instructions.md), [output schema](copilot-studio/agent-output.schema.json), [ADR-002](docs/adr/002-copilot-studio-agent-called-from-flow.md) | contract tested in CI against the stand-in | a build in a tenant (build guide included) |
| Automate workflows with Power Automate | [flow specification](power-automate/README.md), executable logic in [src/pipeline.mjs](src/pipeline.mjs) | step by step with error scopes, retries, kill switch | a flow export |
| Connect Outlook, Teams, Dataverse and line-of-business systems | [architecture](docs/02-design/to-be-and-architecture.md), [TMS integration](docs/02-design/integration-tms-api.md) | shared mailbox trigger, Teams adaptive card, Dataverse audit | — |
| APIs, OAuth, JSON, custom connectors | [OpenAPI 2.0 contract](api/tms-shipments.swagger.json), [mock server](api/mock-server.mjs), [tests](tests/api.test.mjs) | contract ↔ data ↔ mock checked in CI | Microsoft Graph beyond the Outlook connector |
| Security, permissions, safe AI | [threat model](docs/03-security/threat-model.md), [ADR-001](docs/adr/001-model-proposes-policy-decides.md), [ADR-004](docs/adr/004-authorise-every-shipment.md) | 14 threats with controls and tests; prompt injection handled by design | a penetration test |
| Test errors and exceptions | [evaluation set](data/emails.json), [test results](docs/04-test/test-strategy-and-results.md), [tests/](tests/) | 48 emails, every rule covered, naive baseline | real traffic |
| Data protection | [DPIA screening](docs/03-security/data-protection.md) | minimisation, retention, transparency, rights | legal advice |
| Governance: environments, DLP, ALM | [governance and run](docs/07-governance/governance-and-run.md) | environment strategy, DLP groups, managed solutions, ownership | CoE Starter Kit set-up |
| Business case: costs, benefits, KPIs | [business case](docs/05-business-case/business-case.md), [model](data/model.json), [demo](https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/#value) | capacity vs cash, scenarios, sensitivity, numbers enforced by CI | real financials |
| Workshops, demos, explaining to non-technical people | [guided demo](https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/?tour), [5-minute story](application-kit/5-minute-story.md), [one-pager](application-kit/one-page-summary.md) | built for a sponsor and a team lead | facilitated workshops |
| Training, adoption, handover | [pilot and adoption](docs/06-rollout/pilot-and-adoption.md), [runbook](docs/07-governance/governance-and-run.md#runbook) | autonomy ladder, champions, weekly review, KPIs | a delivered training |
