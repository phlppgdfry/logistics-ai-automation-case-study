# ADR-003: Replies are approved templates filled with TMS fields, not generated text

**Status:** accepted · **Deciders:** team lead, consultant

## Context

A model can write a friendlier reply than a template. It can also write an ETA that is not in the TMS, promise a callback nobody will make, or paste the receiver's name. In a status message every word is a commitment.

The [mailbox analysis](../01-discover/mailbox-analysis.md) showed that writing is 25% of handling time; finding the shipment is the rest. A template removes the writing cost too.

## Decision

- Automatic replies and drafts are **templates per language × status**, stored in Dataverse, owned by the team lead.
- The flow fills them with TMS fields only: shipment number, customer reference, status, ETA window, pickup date, last event location and time, delivery time, POD link.
- Every reply ends with an automation notice and the way to reach a person.

## Consequences

- + Each sentence was read once by a person, in three languages.
- + `tests/replies.test.mjs` can prove that every fact in a reply is a field of the shipment and that no personal data appears.
- − Replies are plainer. Agents can still personalise drafts.
- Revisit when: the weekly review shows customers misunderstand templates, or a phase needs free text (e.g. claims). Then: generated text as a **draft only**, never automatic.
