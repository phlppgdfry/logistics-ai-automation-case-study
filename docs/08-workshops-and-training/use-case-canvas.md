# Use-case canvas

One canvas per idea, filled in by two people in 15 minutes. It forces the questions that decide whether an AI or automation idea is worth a proof of concept: who does the work today, what data it needs, what a wrong answer costs, and who owns it afterwards.

## The template

| Field | Question |
|---|---|
| **Name** | What do we call it, in the team's words? |
| **Today** | Who does this now, how often, how long per item? |
| **Trigger** | What starts it: an email, a form, a time of day? |
| **Data needed** | Which system holds the answer? Is there an API? |
| **Decision** | Is it a lookup, a judgement, or writing text? |
| **What could go wrong** | What is the worst wrong answer, and who notices? |
| **Human in the loop** | Where must a person look, at least at first? |
| **Value** | Hours, speed, fewer complaints: what would we measure? |
| **Owner** | Who decides on the rules and reviews the results? |
| **Simplest version** | What is the smallest thing we could switch on in 4 weeks? |
| **Not AI?** | Would a form, a portal or a flow without AI solve it? |

The last row is deliberate. Some ideas are better served by a form or a portal, and the canvas is where that comes out.

## Example 1: status replies (became phase 1)

| Field | Answer from the workshop |
|---|---|
| Name | "Where is my delivery?" |
| Today | 11 agents; <!--n:bc.inScopePerDay-->314<!--/n--> status and POD emails a day; <!--n:a.ahtWismoMin-->4.0<!--/n--> min each, most of it finding the shipment in the TMS |
| Trigger | email in the shared mailbox |
| Data needed | TMS: status, ETA, last event, POD. Read-only REST API exists (separate licence) |
| Decision | mostly a lookup; judgement when the shipment is late, stale or has an exception |
| What could go wrong | status of shipment A sent to customer B; a cheerful status line to an angry customer; an old ETA from a subcontractor |
| Human in the loop | everything at first (draft-only), then only the emails the rules hold back |
| Value | first response in minutes; <!--n:bc.capacityHoursYear-->3,832 h<!--/n--> a year; French-speaking customers no longer wait longest |
| Owner | customer service team lead (templates, thresholds, weekly review) |
| Simplest version | draft replies in the mailbox for status questions with a shipment number, NL only |
| Not AI? | partly: the portal already exists, but customers email anyway. The reading needs a model; the lookup and the reply do not |

## Example 2: generative free-text replies (rejected)

| Field | Answer from the workshop |
|---|---|
| Name | "Let the AI write the answer" |
| Today | agents type every reply |
| Decision | writing text |
| What could go wrong | a confident sentence that is wrong, an apology that admits liability, a tone that does not fit the customer |
| Human in the loop | every reply, forever: then nothing is saved |
| Value | low: the status sentences are always the same |
| Not AI? | **yes**: approved templates filled with TMS fields do the same job, and every sentence has been read once → [ADR-003](../adr/003-templates-not-free-text.md) |
