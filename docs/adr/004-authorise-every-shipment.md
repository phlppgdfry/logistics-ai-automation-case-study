# ADR-004: Authorise the sender per shipment; one generic reply for "not found" and "not yours"

**Status:** accepted · **Deciders:** consultant, IT manager, DPO

## Context

Anyone can email the mailbox. Today agents decide by feel whether a sender "seems to be" the customer. A Gmail address with a plausible story usually gets an answer.

## Decision

- For every shipment, the sender must be a registered contact of the account, a colleague at the account's own domain, or the consignee address from the booking. Free-mail domains never count as a domain. DMARC must pass.
- POD only to registered contacts; others get a draft.
- Customer references are looked up only within the sender's own accounts.
- If nothing may be shared, the reply is the **same generic text** whether the shipment exists or not.

## Consequences

- + Closes the most likely real-world incident (T1, T2, T5, T6 in the [threat model](../03-security/threat-model.md)).
- − A legitimate person using a private address gets the generic reply. Accepted: the reply explains what to do.
- − Depends on contact lists in the TMS. Quarterly review with key accounts added to the handover.
