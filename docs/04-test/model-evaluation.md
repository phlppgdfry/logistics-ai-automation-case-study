# Model evaluation: a real model reads the emails

The [test set](test-strategy-and-results.md) proves the **rules**: given a correct reading, the policy gate takes the right decision for <!--n:tests.passed-->48<!--/n-->/<!--n:tests.cases-->48<!--/n--> emails. It does not prove the **reading**. The keyword stand-in in [src/text.mjs](../../src/text.mjs) and the test emails were written together, so a perfect score was guaranteed.

This page measures what happens when a real language model reads the emails, and when the reader meets emails it has never seen.

## Set-up

| | |
|---|---|
| Model | gpt-4.1-mini (version 2025-04-14) in **Azure AI Foundry**, temperature 0, structured output with the agent's [JSON schema](../../copilot-studio/agent-output.schema.json) |
| Prompt | the agent instructions, [copilot-studio/instructions.md](../../copilot-studio/instructions.md), unchanged: the same text the Copilot Studio agent gets |
| Input | `subject`, `freshText`, `quotedText`, `senderDomain`, as the flow sends them |
| Authentication | Microsoft Entra ID (role *Cognitive Services OpenAI User*), no keys |
| Recording | [scripts/eval-model.mjs](../../scripts/eval-model.mjs) stores every answer in [evaluation/runs/](../../evaluation/runs/). The build and the tests **replay** those answers through the same policy gate, so CI needs no model and no key |
| Cost | ±90,000 tokens per run of 72 emails: a few cents |

## Two sets

| Set | Emails | Written | Purpose |
|---|---|---|---|
| Main set | <!--n:tests.cases-->48<!--/n--> | together with the stand-in | regression test for the rules; development set for the instructions |
| **Held-out set** | <!--n:ho.cases-->24<!--/n--> | after the stand-in was frozen, never used to tune it or the instructions | a fair test of the reader. Each email has a labelled correct reading as well as the expected outcome |

The held-out emails are deliberately different: a shipment number typed with spaces, damage described as *"écrasés"*, anger without the usual words (*"the fourth time I ask"*), an instruction disguised as an audit request, a request to mail the answer to a haulier.

## Results

Outcome = the decision (auto / draft / route / ignore), template and queue all match the expected outcome. Harmful = an automatic reply that should not have gone out (data leak, stale data, wrong tone, loop, obeyed instruction).

| Reader | Main set | Harmful | Held-out set | Harmful |
|---|---|---|---|---|
| Keyword stand-in | <!--n:me.stand-in.main-->48<!--/n-->/<!--n:tests.cases-->48<!--/n--> | <!--n:me.stand-in.mainHarm-->0<!--/n--> | **<!--n:me.stand-in.ho-->14<!--/n-->/<!--n:ho.cases-->24<!--/n-->** | **<!--n:me.stand-in.hoHarm-->3<!--/n-->** |
| gpt-4.1-mini, instructions v1 | <!--n:me.f-v1.main-->40<!--/n-->/<!--n:tests.cases-->48<!--/n--> | <!--n:me.f-v1.mainHarm-->0<!--/n--> | <!--n:me.f-v1.ho-->21<!--/n-->/<!--n:ho.cases-->24<!--/n--> | <!--n:me.f-v1.hoHarm-->0<!--/n--> |
| gpt-4.1-mini, instructions v2 | <!--n:me.f-v2.main-->44<!--/n-->/<!--n:tests.cases-->48<!--/n--> | **<!--n:me.f-v2.mainHarm-->1<!--/n-->** | <!--n:me.f-v2.ho-->24<!--/n-->/<!--n:ho.cases-->24<!--/n--> | <!--n:me.f-v2.hoHarm-->0<!--/n--> |
| **gpt-4.1-mini, instructions v3** (3 runs) | **<!--n:me.v3.mainMin-->44<!--/n-->–<!--n:me.v3.mainMax-->45<!--/n-->/<!--n:tests.cases-->48<!--/n-->** | **<!--n:me.v3.harmMax-->0<!--/n-->** | **<!--n:me.f-v3.ho-->24<!--/n-->/<!--n:ho.cases-->24<!--/n-->** | **<!--n:me.v3.harmMax-->0<!--/n-->** |
| Correct reading (labels) | — | — | <!--n:me.labels.ho-->24<!--/n-->/<!--n:ho.cases-->24<!--/n--> | <!--n:me.labels.hoHarm-->0<!--/n--> |

### What this says

1. **The rules are right; the reading was the weak point.** With the labelled reading, the rules get every held-out email right. The stand-in gets 14, and three of its mistakes would have sent an automatic reply that should have gone to a person: an angry customer, a "nothing arrived", a request to forward the answer.
2. **A real model generalises much better.** Instructions v3 get every held-out email right, in all three runs.
3. **The design holds when the model is wrong.** Every remaining model mistake is a safe one: a draft or a routing where an automatic reply was expected, or a question for the reference. A wrong reading leads to a person looking, not to a wrong email.
4. **The test set caught a regression.** Version 2 fixed over-cautious readings but stopped flagging *"they have not received it"* as a dispute (E42), which would have sent a cheerful status line to a customer reporting a missing delivery. Version 3 fixed it. Without the test set, v2 would have looked like an improvement.

## How the instructions changed (and why only from the main set)

| Version | Change | Found by |
|---|---|---|
| v1 | the specified instructions | — |
| v2 | `instructionSignals` only for text aimed at the system or a redirect to someone else; ordinary requests (reschedule, call back, reply to me) are not; lateness is not a dispute | main set: E32, E34, E35 routed to security, E14/E38 routed to claims |
| v3 | "dispute" = the customer says the goods were **not received**; the model cannot see the TMS, so it reports the claim and the rule decides | main set: E42 (the v2 regression) |

The held-out set was only scored, never used to change the instructions. Otherwise it would stop being a fair test.

## Remaining differences on the main set (v3)

| Email | Expected | Model reading → outcome | Safe? |
|---|---|---|---|
| E16 Gmail address claims to be Hortex | generic reply (R11) | the model also flags *"Please answer to this address"* → routed to security | yes: a person looks |
| E26 German email | draft with R05 + R06 | draft with R06 only (the model is confident about the intent) | yes: same draft; only the rule list differs |
| E28 *"Er klopt iets niet met de palletten"* | draft (unclear) | the model reads it as damage → routed to claims | yes, and arguably better |
| E25 reference only in the forwarded thread | draft (R08) | in 2 of 3 runs the model does not take the reference from the quote → asks for the reference | yes: asks the customer instead of guessing |

## A finding about the platform: Prompt Shields

The prompt-injection email E39 (*"Ignore all previous instructions…"*) never reached the model. **Azure AI Foundry's content filter (Prompt Shields, jailbreak detection) refused the request.** The flow has to handle that refusal. It treats it as the strongest possible instruction signal, so the email is routed to security (R02). The test *"a prompt-injection email refused by the content filter is routed to security"* in [tests/model-eval.test.mjs](../../tests/model-eval.test.mjs) pins this down.

## Copilot Studio

The same instructions run in the Copilot Studio agent, called by the cloud flow with *Execute Agent and wait* (see [power-platform/](../../power-platform/README.md)). That agent uses the model Copilot Studio selects, not this Foundry deployment, so its reading quality is measured separately by the flow itself: its readings are recorded from Dataverse and replayed in the same way.

## Limits

- 72 emails is a small sample. One mistake is ±2 percentage points. The set should grow with every rejected draft in the pilot ([champions](../08-workshops-and-training/champions-and-break-it.md)).
- The held-out set has the same author as the main set. It is independent of the stand-in, not of the author's imagination. The "break it" session with the real team is the better source.
- GlobalStandard deployment (the only quota on the student subscription): processing may happen outside the EU. Fictional data only. Production: EU Data Zone ([EU AI Act screening](../03-security/eu-ai-act.md)).
