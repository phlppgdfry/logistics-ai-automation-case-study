# Discovery workshop: run sheet (2 hours)

The workshop that turned *"half the mailbox is 'where is my delivery?'"* into a ranked list of use cases with owners. It is written so another consultant can run it tomorrow: timing, what to say, what to bring, what comes out.

> *Fictional organisation. The people and quotes are illustrative.*

## Before the workshop

| What | Who | When |
|---|---|---|
| Agree the question with the sponsor: *"What can we automate in customer email, and what is it worth?"* | consultant + operations director | 1 week before |
| Pull a sample of 1,000 emails (metadata + subject, bodies masked) and label 200 by hand | consultant + team lead | 1 week before → [mailbox analysis](../01-discover/mailbox-analysis.md) |
| Time 30 status emails end to end (stopwatch, screen share) | consultant + two agents | 3 days before |
| Invite: sponsor, team lead, two agents (NL + FR), IT manager. **Not** the whole team: they get the kick-off | sponsor sends it | 1 week before |
| Room: whiteboard, sticky notes in three colours, the use-case canvas printed A3 ×6, a laptop with the TMS open | consultant | day before |

Send one page in advance: the question, the agenda, and *"bring two emails that annoy you"*.

## Agenda

| Time | Block | What happens | Output |
|---|---|---|---|
| 0:00–0:10 | **Why we are here** | Sponsor opens (2 min, his words). Consultant shows the question and the ground rules: *we look at work, not at people; no decision on tools today.* | shared question |
| 0:10–0:30 | **Today, as it is** | Two agents show one status email live: mailbox → TMS → copy → reply. Everyone notes on yellow stickies where time goes. Consultant shows the timing (median <!--n:a.ahtWismoMin-->4.0<!--/n--> min per status email, most of it spent finding the shipment) and the mailbox mix (<!--n:a.shareWismo-->38%<!--/n--> status, <!--n:a.sharePod-->11%<!--/n--> POD). | pain points on the wall |
| 0:30–0:50 | **What makes an email hard** | Each person reads out one of "their" two emails. Group them: *messy reference, wrong person asking, angry customer, subcontractor shipment, two questions in one*. | the messiness list → later the test set |
| 0:50–1:00 | *Break* | | |
| 1:00–1:20 | **Art of the possible** | 10-minute demo of a status email answered from the TMS (the [prototype](https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/)), including one email it **refuses** to answer. Then: *"What would you never want it to do?"* — written on red stickies. | red lines (became rules R02, R03, R11) |
| 1:20–1:45 | **Use cases** | Pairs fill a [use-case canvas](use-case-canvas.md) for the ideas on the wall (max. 8). Each pair presents in 2 minutes. | 6–8 canvases |
| 1:45–1:55 | **Score and rank** | Agree the weights first (value 45%, feasibility 35%, risk 20%), then score each canvas 1–5 together. → [prioritisation](prioritisation.md) | ranked list |
| 1:55–2:00 | **Close** | Sponsor names an owner per phase-1 use case. Consultant states the next step and date. | owners, next step |

## Facilitation notes

- **Let the agents show the work.** A live screen share of the TMS says more than any process map. Ask *"what are you looking for now?"* every time they pause.
- **Collect the red lines before the use cases.** When people have said what must never happen, they are more open about what could.
- **Write the sponsor's worry down literally.** *"What if it sends something wrong to Vandael?"* became requirement 1 of the [test set](../04-test/test-strategy-and-results.md).
- **Do not score alone.** The team scores; the consultant only asks *"why a 4 and not a 3?"*. A score the team gave is a score the team defends.
- **Say no in the room.** "Let the AI write the replies" scored high on feasibility and lowest on risk. Saying why in the workshop (every sentence must be approved once) saved a debate later ([ADR-003](../adr/003-templates-not-free-text.md)).
- **Watch the French-speaking agent.** She did a third of the status emails because colleagues forwarded French ones. That fact, mentioned in passing, became a KPI.

## What came out

| Output | Where it went |
|---|---|
| Pain points and timings | [AS-IS](../01-discover/as-is-and-interviews.md), [business case](../05-business-case/business-case.md) baseline |
| The messiness list | [evaluation set](../../data/emails.json), <!--n:tests.cases-->48<!--/n--> emails, and later the [held-out set](../../data/emails-holdout.json) |
| Red lines | [policy rules](../02-design/policy-rules.md) R02, R03, R11, R12 |
| Ranked use cases with owners | [prioritisation](prioritisation.md) → phase 1 = UC1–UC3 |
| Next step | 2-week design sprint, then a [shadow pilot](../06-rollout/pilot-and-adoption.md) |

## Follow-up within 48 hours

A one-page summary to everyone who attended: the question, the photo of the wall, the ranked list, the owners, the red lines in their own words, and the date of the next meeting. No slides.
