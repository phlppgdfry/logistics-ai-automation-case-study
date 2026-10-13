# Data protection (DPIA screening)

> Written for the external data protection officer. Not legal advice; a screening to decide whether a full DPIA is needed and what to put in the processing register.

## Processing

| Question | Answer |
|---|---|
| Purpose | answering customer questions about shipment status and proof of delivery |
| Legal basis | performance of the transport contract (GDPR art. 6(1)(b)) for customers; legitimate interest (art. 6(1)(f)) for consignees asking about a delivery to them |
| Personal data | sender name and address; in the TMS: receiver name, consignee contact; in a POD: signature and name |
| Data subjects | employees of customers and consignees, occasionally private persons (consignees) |
| New processing? | No new data is collected. The same data is processed as today, by a flow instead of a person |
| Automated decision with legal effect (art. 22)? | No. The only automated decision is *whether to send a status message*; anything with an effect on the person (claims, disputes, cancellations) is routed to people |
| Processors | Microsoft (M365, Power Platform, Copilot Studio) under the existing DPA; TMS vendor under the existing DPA |
| Location | tenant in the EU; Copilot Studio environment in the Europe region; check that generative AI features do not move data outside the EU geography (environment setting "move data across regions" off) |

## Minimisation

- The agent receives subject and body only, not attachments, not other emails.
- The flow uses `consignee.email` for authorisation only; receiver names, addresses and signatures never go into a reply or a log.
- The audit log stores subject, outcome, rules, ids and sender domain — **not the email body**. Full sender address is kept 90 days (needed for R16 and complaints), then reduced to the domain.
- Copilot Studio conversation transcripts: retention set to 30 days in the environment (default is longer); only IT and the team lead can view them.

## Transparency

- Every automatic reply says it was prepared automatically and how to reach a person (footer in all three templates). This is also what the EU AI Act's transparency obligation for systems interacting with people points to.
- The privacy notice on the website gets one paragraph: customer service emails may be read by an automated system to find shipment information; a person handles everything else.

## Rights

| Right | How |
|---|---|
| Access | audit log by sender address (90 days) + mailbox as today |
| Objection | a customer can ask to be excluded: account flag `cor_noautoreply` → all their emails become drafts |
| Erasure | mailbox retention as today; audit rows deleted with the 90-day reduction |

## Screening outcome

No full DPIA needed in the consultant's view: no new data, no new data subjects, no profiling, no automated decisions with legal effect, mitigations for the main risk (disclosure to the wrong person) tested. **Decision is the DPO's**; recorded in the go/no-go list ([rollout](../06-rollout/pilot-and-adoption.md)).
