# Mailbox analysis

> *Illustrative assumptions — not real company data.*

Before designing anything, the consultant and the team lead labelled a sample of the mailbox. The goal: replace "half the mailbox is where-is-my-delivery" with numbers the team agrees with.

## Method

| Step | What | Who |
|---|---|---|
| 1 | Export 1,000 emails from two normal weeks (not Q4) — headers, subject, first 500 characters | IT, via a one-off Graph export to the team's SharePoint, deleted after the analysis |
| 2 | Agree a label set in 30 minutes (below) and label 100 emails together | consultant + team lead + 2 agents |
| 3 | Label the remaining 900, split between three people; 50 double-labelled to check agreement | team |
| 4 | Time 60 status emails and 30 POD emails end-to-end with a stopwatch | 2 agents, 2 mornings |
| 5 | Replay the 1,000 emails through the draft rules to estimate the automatic share | consultant |

Labelling agreement on the 50 double-labelled emails: 46/50. The four disagreements were all "status + complaint" — which became rule R03.

## Results

Volume: <!--n:a.emailsPerDay-->640<!--/n--> emails a day on average (Q4 peak: ±1,000).

| Category | Share | In scope phase 1? | Today handled by |
|---|---|---|---|
| Where is my delivery (status, ETA) | <!--n:a.shareWismo-->38%<!--/n--> | **yes** | any agent |
| Proof of delivery (POD, signed CMR) | <!--n:a.sharePod-->11%<!--/n--> | **yes** | any agent |
| Slot change / reschedule | 14% | no — phase 2 | planning |
| Damage, shortage, "not received" | 9% | no — never automatic | claims |
| Invoice and credit notes | 8% | no | finance |
| Automated mail (out-of-office, bounces, newsletters) | 7% | ignored | nobody (deleted by hand) |
| Other (new business, complaints, misc.) | 13% | no | team lead |

**In scope: <!--n:bc.inScopePerDay-->314<!--/n--> emails a day.**

### Handling time

| | Status email | POD email |
|---|---|---|
| Median handling time | <!--n:a.ahtWismoMin-->4.0<!--/n--> min | <!--n:a.ahtPodMin-->3.0<!--/n--> min |
| Where the time goes | 35% finding the shipment (which number is it?), 30% switching to the TMS and back, 25% writing, 10% checking | 50% finding the POD in the TMS, 30% attaching, 20% writing |

The writing is not the bottleneck. **Finding the shipment is.** That shaped the design: reference extraction and a direct TMS lookup matter more than eloquent text.

### What the replay showed (in-scope emails)

| Outcome under the draft rules | Share |
|---|---|
| Can be answered automatically from the TMS | <!--n:a.autoShare-->55%<!--/n--> |
| Needs a person to check a prepared draft (stale status, late, POD to a non-contact, unclear) | <!--n:a.draftShare-->30%<!--/n--> |
| Needs a person from the start (exceptions, mixed with complaints) | <!--n:a.routeShare-->15%<!--/n--> |

### Findings that changed the plan

1. **References are messy.** 61% of in-scope emails contain a Corlaan number, 17% a CMR, 14% only the customer's own PO number, 8% nothing usable. → The agent extracts all three, and the TMS lookup by customer reference is limited to the sender's own account.
2. **Subcontractor shipments go stale.** For 1 in 4 subcontractor shipments, the last TMS event is more than 4 hours old when the customer asks. → Rule R14: never answer automatically from stale data.
3. **One in eight "status" emails is really a complaint.** → Rule R03 routes anger, damage and "not received" to people, even when the text also asks for a status.
4. **The Q4 peak is 60% status emails.** The peak is exactly where automation helps most — and where the temps were hired.
5. **French-speaking customers wait longest** (median first response 5.2 h vs 2.4 h), because only 3 of 11 agents write French comfortably. Templated French replies remove that gap for in-scope emails.
