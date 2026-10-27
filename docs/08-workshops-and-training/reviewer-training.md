# Training: reviewing held replies (20 minutes + one-page guide)

For the customer service agents who approve or reject the replies the flow holds back. Given in week 6, before the pilot moves from shadow to draft-only. Run by the team lead with the consultant next to them, not the other way round.

## Learning goals

After 20 minutes every agent can:

1. explain in one sentence why a reply was held (the rule on the card),
2. decide in under a minute whether to send it, change it or answer themselves,
3. record a reason when they reject, because those reasons are how the rules improve,
4. say what the system never does: send to anyone but the sender, write its own sentences, or answer an angry customer.

## Agenda

| Min | Block | How |
|---|---|---|
| 0–3 | Why this exists | Team lead: *"It drafts, you decide. Nothing goes out in draft-only mode without you."* |
| 3–8 | What you see | Open a real approval in Teams ([CRL-03](../../power-platform/flows/README.md)): title with the rule, the reply text, Approve / Reject, comment box |
| 8–16 | Five cases, together | Each agent decides first, then the group compares (cases below) |
| 16–19 | Reasons that help | What a useful reject reason looks like |
| 19–20 | Where to go | Champions (one NL, one FR), weekly review, the kill switch is with the team lead |

## The five cases

Taken from the [evaluation set](../../data/emails.json), so the answers are known.

| Case | Held by | What to do | Why |
|---|---|---|---|
| E21 subcontractor shipment, last update 7 h ago | R14 stale status | **Check first**: call the subcontractor, then edit the ETA or reject and answer yourself | the TMS answer may be wrong; that is exactly why it was held |
| E23 will be later than promised | R15 later than promised | **Reject and answer yourself**, with an apology and the new time | a late delivery deserves a sentence the template does not have |
| E20 POD asked by a colleague not on the contact list | R12 POD needs a registered contact | **Approve** if the domain is the customer's and the colleague is plausible; otherwise reject | a POD carries a signature; you are the check |
| E25 reference only in the forwarded thread | R08 reference in quoted text | **Check which shipment is meant**; approve only if it is the same one | old threads mention old shipments |
| E30 fifth email today from the same sender | R16 reply limit | **Look at the thread**: a loop with another system? Reject and tell IT | protects against mail loops and harvesting |

## Reasons that help

Short, in the team's words, one reason per reject:

- ✅ *"ETA wrong, subcontractor says 15:00"* → becomes a data-quality signal for R14
- ✅ *"customer is angry, template too cheerful"* → a candidate phrase for R03
- ❌ *"no"* → nobody can learn from it

The team lead reads every reject reason in the weekly review. Three of the same reason in a week means a rule or template change, then the test set runs again.

## One-page guide (printed next to each screen)

> **Held reply? You decide.**
> 1. Read the **rule** in the title: it tells you why it was held.
> 2. Read the reply. Every fact in it comes from the TMS.
> 3. **Approve** = sent as it is, to the sender only.
>    **Reject** = nothing is sent. You answer yourself, from the mailbox.
> 4. Rejecting? Write **one reason** in the comment box.
> 5. Never forward the approval to the customer. Never copy data from another customer into your answer.
> 6. Something odd? Tell your champion. Something wrong? Tell the team lead: they can switch automatic sending off in one step.

## How we know it worked

| Measure | Target | Source |
|---|---|---|
| Drafts sent unedited | ≥ 85% | approval responses (Reply table: status, reviewed by) |
| Median time from draft to decision | < 2 h | reviewed-on minus created-on |
| Rejects with a reason | ≥ 90% | review comment not empty |
| Agents who say "I trust what it sends" (weekly pulse, 1–5) | ≥ 4 by week 10 | Forms pulse |
