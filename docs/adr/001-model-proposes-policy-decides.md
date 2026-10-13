# ADR-001: The model reads; deterministic rules decide what is sent

**Status:** accepted · **Deciders:** consultant, team lead, IT manager

## Context

The quickest demo of "AI answers the mailbox" gives one model the inbox, a TMS tool and a send tool, and tells it to help customers. It works in a demo. On the evaluation set it harms in <!--n:naive.harmful-->23<!--/n--> of <!--n:tests.cases-->48<!--/n--> emails: data to the wrong person, stale answers, status lines to angry customers, replies to out-of-office mails, and it acts on instructions written in the email.

## Decision

Split reading from acting.

- The **agent** reads one email and returns JSON (language, intent, confidence, references, signals). It has no tools.
- The **flow** does the look-ups and applies <!--n:rules.count-->18<!--/n--> named rules. Only the flow can send, only to the original sender, only templates.

## Consequences

- + Every outcome is explainable by rule number, to a customer, an auditor or the team lead.
- + Prompt injection can only mislabel, and labels are checked against the TMS and the sender's rights.
- + The rules are testable without the model (CI, 48 emails, every commit).
- − Less "magic": the agent will not handle an email the rules did not foresee; it drafts or routes instead. Accepted: that is the point.
- − Rules need an owner (team lead) and maintenance (2 days a month in the business case).

## Alternatives

| Option | Why not |
|---|---|
| Autonomous agent with send and TMS tools, guarded by instructions | instructions are not a control; fails T1, T3, T4 in the [threat model](../03-security/threat-model.md) |
| Rules only, no model (regex triage) | works for references, fails on intent across three languages and on sensitive signals; brittle as phrasing varies |
