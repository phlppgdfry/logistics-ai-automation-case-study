# Power Automate: cloud flow "Handle customer email"

> **Status: design specification.** Written to be built step by step in a tenant; not exported from one. The executable version of the same logic is [src/pipeline.mjs](../src/pipeline.mjs), tested in CI.

| | |
|---|---|
| Solution | `CorlaanCustomerEmail` (publisher prefix `cor`) |
| Trigger | Office 365 Outlook — *When a new email arrives in a shared mailbox (V2)*, mailbox `klantendienst@corlaan.example`, folder Inbox |
| Owner | service account `svc-cs-automation` (Power Automate Process licence); co-owners: team lead, IT |
| Connections | Office 365 Outlook (service account), Microsoft Copilot Studio, Corlaan TMS (custom connector, OAuth client credentials), Microsoft Teams, Microsoft Dataverse |
| Concurrency | 20 parallel runs (TMS rate limit, see [integration](../docs/02-design/integration-tms-api.md)) |
| Environment variables | `cor_Mode` (`graduated` / `draft-only` / `off`), `cor_StaleHours` (4), `cor_MinConfidence` (0.75), `cor_MaxReferences` (3), `cor_MaxAutoRepliesPerDay` (3) |

## Steps

Rule numbers refer to [policy rules](../docs/02-design/policy-rules.md).

| # | Action | Detail |
|---|---|---|
| 0 | **Kill switch** | `Condition: cor_Mode equals 'off'` → *Terminate (Succeeded)*. The email stays in the inbox, as today. |
| 1 | **Screen automated mail (R01)** | headers `Auto-Submitted`, `Precedence`, `List-Unsubscribe`; sender `mailer-daemon`/`noreply`; subject prefixes. Match → audit row `ignore`, move to folder *Automated*, terminate. |
| 2 | **Split fresh and quoted text** | *Html to text*; then a Compose with `indexOf` on the quote markers (`-----Original Message-----`, `-----Oorspronkelijk bericht-----`, `Van:`/`From:`/`De :` lines, `Op … schreef`). |
| 3 | **Read DMARC verdict** | from the `Authentication-Results` header: `dmarc=pass` or not. Stored for step 7. |
| 4 | **Call the agent** | Copilot Studio — *execute agent and wait*: agent *Corlaan Mail Reader*, input `{subject, freshText, quotedText, senderDomain}`. Timeout 60 s. |
| 5 | **Validate output** | *Parse JSON* with [agent-output.schema.json](../copilot-studio/agent-output.schema.json). Invalid or timeout → *Scope: Route* to the customer service queue, reason `agent-error`. |
| 6 | **Rules on the reading (R02–R09)** | conditions in a *Scope* that appends to an array variable `firedRules` (`{id, effect, queue, detail}`): instruction signals → R02; sensitive → R03; out-of-scope intent → R04; confidence < `cor_MinConfidence` → R05; language not nl/fr/en → R06; no reference → R07; quoted only → R08; more than `cor_MaxReferences` → R09. |
| 7 | **Look-ups** | *Apply to each* reference (concurrency 1): TMS `GetShipment` / `SearchShipments` (customer reference with the sender's accounts from `GetAccountsForSender`). Retry policy: fixed, 2 retries, honour `Retry-After`. |
| 8 | **Authorise (R10–R11)** | per shipment: contact / domain / consignee / none (none if DMARC ≠ pass). All none → generic template; mixed → draft. |
| 9 | **Shipment rules (R12–R17)** | POD by non-contact → R12; status `EXCEPTION` → R13; moving and `lastEvent.at` older than `cor_StaleHours` → R14; `eta.to` after `promisedSlot.to` → R15; auto replies to this sender today (Dataverse count) > limit → R16; POD for undelivered → R17. |
| 10 | **Decide** | strongest effect in `firedRules` (ignore > route > draft > auto). If `cor_Mode = draft-only` and the result is auto → draft (R18). |
| 11a | **auto** | *Get row* template from `cor_replytemplate` (language × template × status); *Compose* with TMS fields only; *Reply to email (V3)* to the original message — **the To field is never set from data**, so a reply cannot go to another address. |
| 11b | **draft** | *Draft a reply* in the shared mailbox + Teams adaptive card to the customer service channel: reason (fired rules in plain words), shipment summary, buttons *Send* / *Edit in Outlook* / *Reject*. Card response is logged with the reviewer and, on edit/reject, a reason picked from a list. |
| 11c | **route** | categorise the email (`Claims`, `Planning`, `Finance`, `Security`, `Team lead`, `Customer service`), flag high importance for R03/R13, post to the owning team's channel. |
| 12 | **Audit** | *Add a new row* in `cor_emailcase`: message id, received, sender domain (not the full address after 90 days), language, intent, confidence, rules fired, outcome, shipment ids, template id, reply message id, reviewer. **Not** the body. |
| 13 | **Error scope** | *Configure run after: has failed / has timed out* on the main scope → route to customer service queue + alert IT. A failure never sends. |

## Why the reply is a template, not generated text

See [ADR-003](../docs/adr/003-templates-not-free-text.md). In short: every sentence that leaves the building has been read by the team lead once, in three languages, and every number in it comes from the TMS. The model's job is reading, not writing.

## Test before import

The same decisions run in CI: `node --test tests/*.test.mjs`. When a condition in the flow changes, change [src/rules.mjs](../src/rules.mjs) and [src/pipeline.mjs](../src/pipeline.mjs) first, and add an email to [data/emails.json](../data/emails.json) that proves it.
