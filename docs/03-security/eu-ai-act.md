# EU AI Act: classification and obligations

A short screening of the solution against the EU AI Act (Regulation (EU) 2024/1689), as a consultant would hand it to the client's legal adviser. It is not legal advice; the adviser confirms it.

> Dates and scope as understood in October 2026. The European Commission's "Digital Omnibus" proposal (November 2025) may move some application dates; check the current text before relying on a date.

## What the system is, in AI Act terms

| Question | Answer |
|---|---|
| Is there an AI system? | Yes: the reading step (a language model in a Copilot Studio agent) infers intent, language and references from text. The rules, look-ups and templates are not AI. |
| Corlaan's role | **Deployer**: it uses an AI system under its own authority. Microsoft (Copilot Studio) and the model provider are providers. |
| Prohibited practice (Art. 5)? | No. No manipulation, no social scoring, no emotion recognition in the workplace. R03 detects words in a customer's email, not the emotions of an employee. |
| High-risk (Art. 6, Annex III)? | No. Answering delivery questions is not in Annex III (no employment decisions, credit, essential services, education, law enforcement…). |
| Transparency (Art. 50)? | Yes, for automatic replies: people must know when they interact with an AI system unless that is obvious. |
| General-purpose AI model obligations? | Those are the model provider's. Corlaan uses the model through Copilot Studio and Azure AI Foundry. |

## Obligations that apply, and how the design meets them

| Obligation | Where it comes from | How it is met | Evidence |
|---|---|---|---|
| **AI literacy** of staff who operate or use the system | Art. 4 (applies since 2 February 2025) | 20-minute reviewer training, champions, weekly review; IT and the team lead get the full rule set | [reviewer training](../08-workshops-and-training/reviewer-training.md), [champions](../08-workshops-and-training/champions-and-break-it.md) |
| **Tell people they deal with an automated system** | Art. 50(1) | every automatic reply ends with *"This reply was prepared automatically from our transport system. Simply reply to this email to reach a colleague."* in the customer's language | [src/compose.mjs](../../src/compose.mjs) footer, checked by [tests/replies.test.mjs](../../tests/replies.test.mjs) |
| **No AI-generated text presented as human-written** | Art. 50 (spirit), ADR-003 | the model writes no customer text at all: replies are approved templates filled with TMS fields | [ADR-003](../adr/003-templates-not-free-text.md) |
| **Use as instructed by the provider, human oversight, keep logs** | good practice for deployers (mandatory only for high-risk) | draft-only start, autonomy ladder, kill switch, every decision with its rules stored on the email row | [rollout](../06-rollout/pilot-and-adoption.md), [runbook](../07-governance/governance-and-run.md#runbook) |
| **Personal data** | GDPR, not the AI Act | DPIA screening, minimisation, EU data residency | [data protection](data-protection.md) |

## Things that would change the classification

- **Using the reading to judge employees** (e.g. ranking agents by how many drafts they approve): this moves towards Annex III (employment), so it is out of scope by design.
- **Letting the model write free text to customers**: transparency gets harder and the risk of a wrong commitment goes up. This was rejected in ADR-003.
- **Profiling customers** ("difficult customers" list): rejected in discovery (GDPR, accuracy).

## Data residency note for the model evaluation

The model evaluation in this repository ran on Azure AI Foundry with a *GlobalStandard* deployment, the only quota available on the student subscription used. With that deployment, prompts may be processed outside the EU. Only fictional emails were sent. **Production must use an EU Data Zone deployment, or Copilot Studio in an EU environment**, as the [data-protection screening](data-protection.md) requires.
