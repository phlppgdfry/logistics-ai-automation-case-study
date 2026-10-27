# CS-01 Status questions and proof of delivery

*Corlaan Logistics, customer service procedure. Owner: customer service team lead. Version 2026-10. Fictional.*

## Who may receive shipment information

1. A **registered contact** of the shipping account (contact list in the TMS) may receive status and proof of delivery (POD).
2. A **colleague at the account's own email domain** may receive the status. A POD only after a check by a colleague (signature and receiver name are personal data).
3. The **consignee**, from the email address given at booking, may receive the status of that shipment.
4. Anyone else, or an email that fails DMARC, receives the **generic reply**: it points to the customer portal and does not say whether the shipment exists.
5. Free-mail addresses (Gmail, Outlook.com, Telenet, …) never count as a company domain.

## Answering a status question

- Look the shipment up by shipment number (CL-YYYY-NNNNNNN), CMR number, or the customer's own reference. A customer reference is only searched within that customer's account.
- Give the status, the last event and the ETA window from the TMS. Never estimate a time yourself.
- If the last TMS event of a shipment on the road is **older than 4 hours**, call the carrier first (usually a subcontractor) before answering.
- If the ETA ends after the promised slot, apologise and give the new window. Do not send the standard status line.
- If the shipment has an **exception** (failed delivery, damage, delay), do not answer with the status: call the customer or write a personal reply the same day.

## Proof of delivery

- A POD is sent as a secure portal link, valid 7 days. Never attach the scan to an email.
- If the shipment is not delivered yet, send the status instead and say the POD follows after delivery.
- More than 3 PODs in one request: offer the portal export.
