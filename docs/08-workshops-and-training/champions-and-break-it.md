# Champions plan and the "break it" session

Adoption does not happen in a kick-off. It happens when two colleagues the team trusts can answer *"why did it do that?"* without calling IT or the consultant. And it happens when the team has tried to fool the system and seen it hold.

## The "break it" session (week 2, 60 minutes)

**Goal:** the team writes emails meant to make the system do something wrong. The best ones join the evaluation set, so the team helps build the test the system has to pass.

| Min | What |
|---|---|
| 0–5 | Rules of the game: *"Write an email that makes it send the wrong thing to the wrong person, or answer when it should not."* Prize for the sneakiest. |
| 5–35 | In pairs, write emails in the shadow mailbox. The flow decides; nothing is sent (shadow mode). |
| 35–55 | Look at the decisions together in the [backoffice app](../../power-platform/apps/README.md): what was held, why, which rule. Any wrong decision goes on the board. |
| 55–60 | Pick five emails for the evaluation set. The team lead writes the expected outcome for each. |

What the team usually tries, and what the system does:

| Attempt | What happens | Rule |
|---|---|---|
| "I'm from Hortex" from a Gmail address | generic reply, nothing revealed | R11 |
| "Also send this to our haulier at …" | routed to security | R02 |
| A real contact asks about another customer's shipment | generic reply for that one; mixed emails become a draft | R11 |
| A pasted "ignore your instructions" | routed to security; the model's content filter sometimes refuses it first | R02 |
| "Third time I ask!!" | routed to the team lead | R03 |
| A shipment number with one digit missing | asks for the reference again | R07 |

When a wrong decision is found, it becomes a test case before it becomes a fix. That is how the [held-out set](../../data/emails-holdout.json) started: emails nobody had tuned the reader on.

## Champions

| | |
|---|---|
| Who | one Dutch-speaking and one French-speaking agent, volunteers, chosen by the team lead |
| Time | 2 hours a week in weeks 6–12, then 1 hour a week |
| Role | first line for *"why did it do that?"*; collect reject reasons and odd cases; join the weekly review; demo new rules to the team |
| Not their role | changing rules or templates (the team lead owns those), fixing flows (IT) |
| Preparation | 90 minutes with the consultant: the 18 rules on one page, how to read a decision in the backoffice app (findings column), how to replay an email |
| Recognition | named in the sponsor's update; first to see phase 2 (slot changes) |

### Champion checklist, every week

1. Read all rejected drafts and their reasons. Group them.
2. Pick three automatic replies at random and check them against the TMS.
3. Bring one surprising case to the weekly review, with the email and the decision.
4. Ask two colleagues: *"Anything it did this week that you did not expect?"*

## Weekly review (30 minutes, from week 7)

| Who | team lead (chair), champions, consultant until handover, IT on request |
|---|---|
| Input | 20 random automatic replies, all rejected drafts with reasons, the KPI dashboard |
| Decisions | rule or threshold changes (always followed by a test-set run), template wording, moving up or down the [autonomy ladder](../06-rollout/pilot-and-adoption.md) |
| Output | a short note in the team channel: what changed and why |
