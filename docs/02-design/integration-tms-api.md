# Integration: TMS shipment-status API and custom connector

## Contract

[api/tms-shipments.swagger.json](../../api/tms-shipments.swagger.json) — OpenAPI 2.0, because Power Platform custom connectors import that version. Three read operations:

| Operation | Used for | Notes |
|---|---|---|
| `GET /shipments/{shipmentId}` | Corlaan number `CL-YYYY-NNNNNNN` | 404 when unknown |
| `GET /shipments?cmr=` | CMR number (7 digits) | |
| `GET /shipments?customerReference=&accountId=` | the customer's own PO/order number | **account is mandatory**: customer references are only unique per account, and a search across accounts would let one customer find another's shipment |
| `GET /accounts/by-sender?email=` | authorisation: is this address a contact or a domain colleague? | free-mail domains never match a domain |

The mock server ([api/mock-server.mjs](../../api/mock-server.mjs)) serves the case data with the same contract; `tests/api.test.mjs` checks contract, data and errors against each other.

```bash
node api/mock-server.mjs
curl -H "Authorization: Bearer demo" http://localhost:4010/v1/shipments/CL-2026-0412345
curl -H "Authorization: Bearer demo" "http://localhost:4010/v1/shipments?customerReference=PO778120&accountId=A-400"
curl -H "Authorization: Bearer demo" "http://localhost:4010/v1/shipments/CL-2026-0412345?simulate=429" -i
```

## Authentication

| Choice | Why |
|---|---|
| OAuth 2.0 client credentials (app registration in Entra ID, owned by IT) | no user account, no password in a flow; the secret lives in the connector's connection, rotated by IT every 6 months |
| One scope: `shipments.read` | there is no write scope for this client; a mistake in the flow cannot change a booking |
| Connection owned by the service account `svc-cs-automation`, shared with the flow only | the flow survives when a maker leaves |

## Error handling in the flow

| Response | Flow behaviour | Why |
|---|---|---|
| 200 | continue | |
| 404 | rule R10 (draft for a known contact, generic otherwise) | typo or a booking not yet in the TMS |
| 401 | stop, alert IT, route email to team queue | broken credentials are an IT problem, not a customer problem |
| 429 | wait `Retry-After`, retry max 2 times, then draft with note | rate limit 60/min; Q4 peaks reach ±1,000 emails/day, well within the limit when spread, not when bursty |
| 5xx / timeout 10 s | draft with note; circuit breaker: 10 failures in 15 min → draft-only mode + alert | never answer without data, never lose the email |

## Data minimisation

The API returns more than the reply needs (consignee name and address, receiver signature name, exception notes). The flow uses `consignee.email` **only** for authorisation and never writes the other fields into a reply or the audit log. `tests/replies.test.mjs` checks that no reply contains any of them.

## Volumes

At plan volume the flow makes ±<!--n:bc.inScopePerDay-->314<!--/n--> shipment look-ups and the same number of sender look-ups per day. Peak minute (Monday 08:30, after the weekend) observed in the sample: 38 emails. With two calls per email that exceeds the 60/min limit for a few minutes → the flow's concurrency control is set to 20 parallel runs, and the vendor was asked for a 120/min limit (open point, see [governance](../07-governance/governance-and-run.md)).
