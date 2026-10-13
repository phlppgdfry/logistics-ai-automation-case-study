# ADR-002: A Copilot Studio agent without tools, called from a Power Automate flow

**Status:** accepted · **Deciders:** consultant, IT manager

## Context

The reading step needs a language model. Three ways to get one in the Microsoft stack Corlaan already has:

| Option | For | Against |
|---|---|---|
| A. AI Builder prompt action in the flow | simplest; one action; JSON output | weaker testing and analytics; no path to a conversational phase 2 |
| B. **Copilot Studio agent, no tools, called from the flow** | evaluation sets and analytics in Copilot Studio; the same agent can grow into the phase 2 slot-change conversation; admins manage it like the other agents | one more component; credits per call |
| C. Copilot Studio autonomous agent with an email trigger and tools | fewest moving parts on paper | the reading component would also hold the tools — conflicts with ADR-001 |
| D. Azure AI Foundry + custom code | full control | Corlaan's IT (3 people) cannot support custom code; overkill for classification |

## Decision

Option B. The flow is the orchestrator and is triggered by the shared mailbox; it calls the agent with *execute agent and wait*, validates the JSON, and does everything else.

## Consequences

- The agent's evaluation (reading) and the flow's tests (decisions) are separate and both repeatable.
- If phase 2 is cancelled, revisit: option A becomes the cheaper choice with the same contract ([agent-output.schema.json](../../copilot-studio/agent-output.schema.json)), and nothing else changes.
