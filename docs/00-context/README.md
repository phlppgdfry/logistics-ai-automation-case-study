# Context: Corlaan Logistics and the customer service mailbox

> *Fictional organisation. All names, figures and documents are illustrative assumptions — not real company data.*

## The client

**Corlaan Logistics NV** is a Belgian pallet distribution and contract logistics company.

| | |
|---|---|
| Sites | DC Gent (head office, cross-dock hub), depot Liège |
| People | 310, of whom 11 FTE in customer service (Dutch and French speaking) |
| Volume | ±1,150 pallet deliveries a day, Benelux and northern France; ±30% by subcontractors |
| Customers | ±400 B2B shippers: breweries, cosmetics, garden supplies, plastics, wholesale |
| Systems | TMS (bookings, planning, track & trace, PODs, REST API) · Business Central (finance) · Microsoft 365 E3 · shared mailbox in Exchange Online |
| Power Platform | default environment only, 14 personal flows, no data-loss-prevention policy |

## The trigger

Two things happened in the same quarter:

1. **Q4 peak 2025.** First-response time on the shared mailbox went from 3 hours to more than a day. Three temps were hired for twelve weeks. Two large shippers complained formally.
2. **2027 budget.** Customer service asked for one extra FTE to absorb volume growth. The operations director replied: *"Before I hire, show me what can be automated."*

## The question

> *"Half the mailbox is 'where is my delivery?'. The answer is in the TMS. Why does a person still type it?"* — operations director

The consultant's job: find out whether that is true, design a solution the team trusts, build and test it, and show what it is worth.

## Stakeholders

| Who | Wants | Fears |
|---|---|---|
| Operations director (sponsor) | No extra hire in 2027, no Q4 temps | A chatbot that embarrasses Corlaan with a large shipper |
| Customer service team lead | Less copy-paste, time for real problems | Losing control over what goes out; team morale |
| Customer service agents (11) | Fewer repetitive emails | "This replaces us"; wrong answers they have to clean up |
| IT manager (team of 3) | Something they can support | Another unmanaged flow in the default environment |
| Data protection officer (external) | GDPR compliance | Customer data sent to the wrong person; data leaving the EU |
| Key accounts (Vandael, Hortex) | Fast, correct answers | Generic answers to specific problems |

## Scope

**In scope (phase 1):** emails asking for shipment status ("where is my delivery?") and proof of delivery (POD), in Dutch, French and English, arriving in the customer service shared mailbox.

**Out of scope (phase 1):** slot changes, claims and damage, invoices, cancellations, phone, the customer portal. These are routed to the owning team, faster than today, but answered by people. Slot changes are the phase 2 candidate.

## Deliberate messiness

| # | Messiness | Where it shows up |
|---|---|---|
| M1 | References in four formats: Corlaan number, CMR number, the customer's own PO or order number, or none at all | [mailbox analysis](../01-discover/mailbox-analysis.md), rules R07–R10 |
| M2 | ±30% of volume runs on subcontractors whose status updates arrive hours late | rule R14, test E21–E22 |
| M3 | Three languages; one German customer | rule R06, test E26 |
| M4 | Anyone can email the mailbox; a Gmail address can claim to be a customer | rule R11, tests E16–E18 |
| M5 | Threads full of forwarded history with old references | rule R08, test E25 |
| M6 | Out-of-office replies and newsletters land in the same mailbox | rule R01, tests E43–E46 |
| M7 | The team is worried about their jobs; the business case must not depend on cutting them | [business case](../05-business-case/business-case.md), [rollout](../06-rollout/pilot-and-adoption.md) |
| M8 | Two senior agents keep a private Excel of "difficult customers" | [workshop notes](../01-discover/as-is-and-interviews.md) |

## Assumptions and limits of this case

- Everything is fictional. The TMS API is a contract written for this case ([api/](../../api/)).
- The language-understanding step is a **deterministic stand-in** for the Copilot Studio agent with the same output shape ([src/text.mjs](../../src/text.mjs)). The policy, the replies, the tests and the business case are real code.
- Copilot Studio and Power Automate artefacts are **designs and a build guide**, not exports from a tenant ([copilot-studio/](../../copilot-studio/), [power-automate/](../../power-automate/)).
- Product capabilities and prices: as documented by Microsoft in October 2026; check before relying on them.
