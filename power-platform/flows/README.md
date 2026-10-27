# The three cloud flows

Defined as code in [definitions.mjs](definitions.mjs) and written into the solution by [../scripts/provision-flows.mjs](../scripts/provision-flows.mjs). The decision logic mirrors `runGuarded()` in [src/pipeline.mjs](../../src/pipeline.mjs); [../VERIFICATION.md](../VERIFICATION.md) shows that the real flows decide the same.

```text
 new row in Inbound emails                     (production: shared mailbox trigger)
        │
 CRL-01 Read inbound email
   0  kill switch: crl_Mode = off → stop, the email stays for the team
   1  automated mail? (Auto-Submitted, Precedence, List-Unsubscribe, system sender, out-of-office subject) → ignore, R01
   2  Copilot Studio agent "Corlaan Mail Reader" reads it  ──  Execute Agent and wait
      (no tools; answers JSON; not JSON or no answer → safe reading: unknown, confidence 0)
   3  reading stored on the row, status Read
        │
 CRL-02 Decide and reply                       (trigger: status = Read)
   4  normalise references (CL 2026 0412377 → CL-2026-0412377)
   5  for each reference (max. crl_MaxReferences): find the shipment in the TMS sandbox
      (customer references only within the sender's own accounts), authorise the sender:
      registered contact > colleague at the account's domain > consignee > none (DMARC must pass)
   6  rules R02–R17 as findings {id, effect, queue, detail}; R18 when crl_Mode = draft-only
   7  strongest effect wins: ignore > route > draft > auto; queue by priority
   8  reply from the template row of the reply language (same strings as src/compose.mjs)
   9  decision, rules, findings, shipments saved on the row; reply row created
      (auto → "Sent automatically (outbox)", draft → "Awaiting review")
        │
 CRL-03 Review draft                           (trigger: new reply with status Awaiting review)
  10  Approvals: approve = send as is, reject = a colleague answers; outcome and comment saved
```

| Flow | Trigger | Connections | Environment variables |
|---|---|---|---|
| CRL-01 Read inbound email | row added, Inbound emails | Dataverse, Microsoft Copilot Studio | `crl_Mode` |
| CRL-02 Decide and reply | row modified, Inbound emails, filter `crl_status = Read` | Dataverse | `crl_ConfidenceMin`, `crl_StaleHours`, `crl_MaxReferences`, `crl_MaxAutoRepliesPerDay`, `crl_Mode`, `crl_FreemailDomains`, `crl_ClockOverride` |
| CRL-03 Review draft | row added, Replies, filter `crl_status = Awaiting review` | Dataverse, Approvals | `crl_ReviewerEmail` |

## Design choices worth explaining

- **Two flows, not one.** Reading and deciding are separate runs. A recorded reading can be replayed through CRL-02 without calling the agent. That is how the verification proves the decision logic equals the tested reference, independent of what the model reads.
- **Findings, not nested conditions.** Every rule produces `[]` or one finding. The decision is the strongest effect among them. Adding a rule never changes the structure, and the findings column on the email row explains every decision.
- **Thresholds and the test clock are environment variables.** `crl_ClockOverride` freezes "now" at the test set's moment (13 October 2026, 08:00 UTC) so staleness (R14) is reproducible; it is empty in production ([deployment-settings/prod.json](../deployment-settings/prod.json)).
- **Nothing is sent from data.** In this build the reply is a row ("outbox") because the shared mailbox is not connected yet. In production the action is *Reply to email (V3)* on the original message: the To field is never set from an expression.

## Known differences with the production design

| Production design | This build | Why |
|---|---|---|
| Shared mailbox trigger, reply on the original message | rows in *Inbound emails*, replies as rows | the mailbox is connected later, after approval |
| TMS through the custom connector ([api/tms-shipments.swagger.json](../../api/tms-shipments.swagger.json)) | TMS sandbox tables in Dataverse | no TMS to connect to |
| Draft review as a Teams adaptive card in the shared mailbox context | Approvals (shows in Teams and Outlook) | Approvals connects without extra consent; same decision, simpler card |
| Circuit breaker on TMS errors | not built | the sandbox tables do not fail |
