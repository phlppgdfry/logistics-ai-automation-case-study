# Prioritisation: value × feasibility × risk

The room scored each [use-case canvas](use-case-canvas.md) from 1 to 5 on three criteria. Risk is scored the other way round: 5 means low risk. The weights were agreed **before** scoring, so nobody could tune them to favour a pet idea.

| Criterion | Weight | 5 means |
|---|---|---|
| Value | 45% | hours saved, faster answers, fewer complaints: large and measurable |
| Feasibility | 35% | data available, API exists, rules can be written down, the team can run it |
| Risk | 20% | a wrong answer costs little: no data to the wrong person, no money, no relationship |

## The ranked list

Generated from [data/use-cases.json](../../data/use-cases.json) by `node scripts/build.mjs`. In the [demo](https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/#workshop) you can change the weights and watch the order move.

<!-- usecases:start -->
| Rank | Use case | Value | Feasibility | Risk (5 = low) | Score | Decision | Owner | Why |
|---|---|---|---|---|---|---|---|---|
| 1 | UC1 Status replies from the TMS | 5 | 4 | 3 | 4.25 | phase 1 | Customer service team lead | 38% of the mailbox; API exists; risk is data to the wrong person, handled by authorisation per shipment |
| 2 | UC3 Triage of the whole mailbox to queues | 4 | 4 | 5 | 4.2 | phase 1 | Customer service team lead | comes free with the reading step; misrouting costs minutes, not trust |
| 3 | UC2 Proof-of-delivery retrieval | 3 | 4 | 3 | 3.35 | phase 1 | Customer service team lead | 11% of the mailbox; a POD carries a signature, so registered contacts only |
| 4 | UC4 Slot changes | 4 | 2 | 3 | 3.1 | phase 2 | Planning | needs planning rules written down and a write API |
| 5 | UC7 'Chat with the TMS' for agents in Teams | 2 | 4 | 4 | 3.1 | backlog | IT | nice, but the email still has to be answered by hand |
| 6 | UC5 Claims intake (form + photos) | 3 | 3 | 2 | 2.8 | phase 3 | Claims | money and relationships; with the claims team, after phase 1 |
| 7 | UC8 Invoice copies on request | 2 | 3 | 4 | 2.75 | backlog | Finance | low volume (4%); Business Central already has a portal |
| 8 | UC6 Generative free-text replies | 2 | 4 | 1 | 2.5 | rejected | — | every sentence must be approved once; see ADR-003 · **design decision needed** |
<!-- usecases:end -->

## How the score became a decision

The score sorts the list. It does not make the decision.

- **UC4 and UC7 have the same score.** Slot changes went to phase 2 because they remove emails, while a Teams chat does not. The owner (planning) also asked for it.
- **UC5 scores below UC7 but has a phase.** Claims carry money, so they come later, with the claims team in the room, once phase 1 has earned trust.
- **A risk score of 1 is a stop sign, whatever the total.** UC6 needed a design decision ([ADR-003](../adr/003-templates-not-free-text.md)) before it could be scored at all.
- **Phase 1 is three use cases, built once.** One reading step serves status, POD and triage. That is why UC3 costs almost nothing extra.
