# ADR-005: Start in shadow and draft-only mode; automate in steps with measured gates

**Status:** accepted · **Deciders:** operations director, team lead

## Context

The team lead's condition for support: *"If it answers, I want to see what it answered and why."* The sponsor's condition: no embarrassment with a key account.

## Decision

Four stages — shadow, draft-only, graduated, expand — with written gates ([rollout](../06-rollout/pilot-and-adoption.md)). One environment variable switches between them; specific signals switch down automatically.

## Consequences

- + The team sees every proposed reply before anything is sent; their edits become test cases.
- + The business case does not depend on reaching full automation: draft-only mode alone frees <!--n:sc.draft-only.capacity-->3,107 h<!--/n--> a year ([business case](../05-business-case/business-case.md)).
- − Two to three weeks slower to full value. Accepted.
