# Start here

> Independent portfolio case — fictional organisation. Pick the path that fits your time.

## If you have 2 minutes

1. [Live site](https://phlppgdfry.github.io/logistics-ai-automation-case-study/) — the case on one page
2. [2-minute guided demo](https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/?tour) — ten steps through the mailbox, the test set and the business case

## If you have 5 minutes

3. [Architecture](docs/02-design/to-be-and-architecture.md) — why the agent cannot send
4. [Test results](docs/04-test/test-strategy-and-results.md) — guarded vs naive design on 48 emails
5. [Business case](docs/05-business-case/business-case.md) — capacity is not cash
6. [One-page summary](application-kit/one-page-summary.md)

## If you have 15 minutes

7. [5-minute story](application-kit/5-minute-story.md)
8. [Mailbox analysis](docs/01-discover/mailbox-analysis.md) — where the time really goes
9. [Policy rules](docs/02-design/policy-rules.md) — 18 rules, each with a test case
10. [Threat model](docs/03-security/threat-model.md) — 14 threats, each with a control and evidence
11. [Pilot and adoption](docs/06-rollout/pilot-and-adoption.md) — the autonomy ladder

## If you want all the details

| Journey step | Best documents |
|---|---|
| Context | [context, stakeholders, scope](docs/00-context/README.md) |
| Discover | [mailbox analysis](docs/01-discover/mailbox-analysis.md) · [AS-IS and interviews](docs/01-discover/as-is-and-interviews.md) |
| Design | [TO-BE and architecture](docs/02-design/to-be-and-architecture.md) · [policy rules](docs/02-design/policy-rules.md) · [TMS integration](docs/02-design/integration-tms-api.md) · [ADRs](docs/adr/README.md) |
| Build | [Copilot Studio agent](copilot-studio/README.md) · [agent instructions](copilot-studio/instructions.md) · [Power Automate flow](power-automate/README.md) · [API contract](api/tms-shipments.swagger.json) · [src/](src/) |
| Secure | [threat model](docs/03-security/threat-model.md) · [data protection](docs/03-security/data-protection.md) |
| Test | [test strategy and results](docs/04-test/test-strategy-and-results.md) · [evaluation emails](data/emails.json) · [tests/](tests/) |
| Value | [business case](docs/05-business-case/business-case.md) · [model](data/model.json) |
| Roll out and run | [pilot and adoption](docs/06-rollout/pilot-and-adoption.md) · [governance and runbook](docs/07-governance/governance-and-run.md) |
