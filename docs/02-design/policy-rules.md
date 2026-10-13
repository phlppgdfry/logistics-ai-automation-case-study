# Policy rules: what may be sent without a person

The policy gate is the heart of the design. It takes the agent's reading of the email, the TMS data and the sender's rights, and decides one of four things:

| Outcome | Meaning | Who acts |
|---|---|---|
| **auto** | a fixed template, filled with TMS fields, sent to the original sender | nobody — logged |
| **draft** | the same reply is prepared, with the reason it was held | an agent approves, edits or rejects |
| **route** | no reply; category + queue + reason | the owning team |
| **ignore** | automated mail; logged, no reply | nobody |

Strength: ignore > route > draft > auto. When several rules fire, the strongest wins. When no rule fires and a shipment was found and the sender may see it, the reply goes automatically.

Thresholds: status older than <!--n:policy.staleHours-->4<!--/n--> hours is stale · intent confidence below <!--n:policy.confidence-->0.75<!--/n--> is unclear · more than <!--n:policy.maxRefs-->3<!--/n--> references is bulk · more than <!--n:policy.maxAuto-->3<!--/n--> automatic replies to one sender per day triggers the reply limit. The team lead owns these values (Dataverse settings table); changing one means re-running the test set.

## The rules

The table below is generated from [src/rules.mjs](../../src/rules.mjs) by `node scripts/build.mjs`. The last column lists the emails in the [evaluation set](../../data/emails.json) where the rule fires.

<!-- rules:start -->
| ID | Rule | When | Effect | Why | Test cases |
|---|---|---|---|---|---|
| R01 | Automated mail | Out-of-office, bounce, newsletter or other automated mail | ignore | Answering automated mail creates reply loops and noise. It is logged, never answered. | E43, E44, E45, E46 |
| R02 | Instruction or redirect in the email | The email contains instructions aimed at the system, or asks to send data to another address | route → security | Email text is data, not instructions. The flow can only reply to the sender, so a request to send elsewhere always needs a person. | E39, E40 |
| R03 | Sensitive message | Damage, 'not received', a legal threat or an angry complaint | route → team lead / claims | These are relationships and money, not status questions. A colleague answers, the same day. | E32, E33, E34, E42 |
| R04 | Out-of-scope intent | Slot change, invoice or cancellation | route → owning team | Phase 1 covers status and proof of delivery only. Other requests go to the team that owns them. | E35, E36, E37 |
| R05 | Unclear intent | No clear intent, or two intents equally present (confidence below 0.75) | draft | A wrong but confident answer costs more than a short review. | E25, E26, E28, E29, E39 |
| R06 | Unsupported language | Language is not Dutch, French or English | draft | Templates exist in three languages. Anything else is answered by a colleague. | E26 |
| R07 | No reference | Status or POD question without a usable shipment, CMR or customer reference | auto (clarify) | Asking for the reference is harmless and faster than a human search by name. | E13, E14, E15 |
| R08 | Reference only in quoted text | The only reference sits in the forwarded or quoted part of the thread | draft | Old threads mention old shipments. A person checks which one is meant. | E25 |
| R09 | Bulk request | More than 3 references in one email | draft | Bulk questions are better served by the portal export; a colleague offers it. | E27 |
| R10 | Reference not found | No shipment matches the reference | draft (known contact) / auto (generic) | A known contact probably made a typo: a person looks. Anyone else gets the generic reply, which does not reveal whether a shipment exists. | E19, E24 |
| R11 | Sender not authorised | Sender is not a registered contact, a colleague at the account's own domain, or the shipment's consignee — or DMARC did not pass | auto (generic) / draft (mixed) | Shipment data only goes to people entitled to it. The generic reply points to the portal and reveals nothing. | E16, E17, E18, E31, E39 |
| R12 | POD needs a registered contact | Proof of delivery asked by a domain colleague or consignee rather than a registered contact | draft | A POD carries a signature and a receiver's name. A person checks before sending it. | E20 |
| R13 | Exception status | The shipment has an open exception (failed delivery, delay, damage) | route → customer service (priority) | The customer needs a plan, not a status line. A colleague calls or writes. | E38, E41 |
| R14 | Stale status | In transit and the last TMS event is older than 4 hours (usually a subcontractor) | draft | An automatic answer from stale data is a confident wrong answer. A person checks with the carrier first. | E21, E22, E33 |
| R15 | Later than promised | The ETA window ends after the promised delivery slot | draft | Late deliveries deserve an apology and a reason, written by a person. | E23 |
| R16 | Reply limit | More than 3 automatic replies to this sender today | draft | Protects against loops with other systems and against harvesting. | E30 |
| R17 | POD not yet available | Proof of delivery asked for a shipment that is not delivered yet | auto (status instead) | The useful answer is the status. No person needed. | E12 |
| R18 | Draft-only mode | The pilot runs in draft-only mode (first two weeks) | draft | Every automatic reply is first proposed to a colleague, until the go/no-go criteria for sending are met. | all, in draft-only mode |
<!-- rules:end -->

## Who may see what

| Sender is… | Status | POD | How we know |
|---|---|---|---|
| a registered contact of the shipment's account | yes | yes | contact list in the TMS |
| a colleague at the account's own email domain | yes | draft (R12) | domain list per account; free-mail domains never count |
| the consignee, with the address given at booking | yes | draft (R12) | `consignee.email` on the shipment |
| anyone else, or DMARC did not pass | generic reply (R11) | generic reply (R11) | — |

The generic reply is identical for "not found" and "not authorised", so the mailbox cannot be used to test whether a shipment number exists.

## What the rules deliberately do not do

- **No customer blacklist.** The senior agents' "difficult customers" Excel is not used. R03 looks at what is written, not who wrote it.
- **No sentiment score.** A model's anger score is hard to explain to a customer or an auditor. R03 uses a short, reviewable list of words and phrases per language, maintained by the team lead.
- **No partial answers.** If one of two references may not be shared, the whole email becomes a draft (R11 mixed) rather than an automatic reply that silently skips one.
