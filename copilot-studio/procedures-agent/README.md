# Corlaan Procedures Assistant: the second agent pattern

The mail reader ([../README.md](../README.md)) is an agent **without** knowledge or tools, called by a flow. This second agent is the pattern most Copilot Studio projects start with: an **internal assistant that answers from company documents**, used by people in Teams. It helps customer service agents with *"what is the procedure when…"*: the questions the held drafts and routed emails raise.

| | Mail reader | Procedures assistant |
|---|---|---|
| Who talks to it | a cloud flow | customer service agents, in Teams |
| Knowledge | none | four procedure documents (CS-01 … CS-04) |
| Tools | none | none |
| Output | JSON | a short answer with its source, e.g. `[CS-02]` |
| Main risk | a wrong reading → wrong reply | **oversharing**: quoting a document the user should not see; answering from general knowledge instead of the procedure |

## What is in this folder

| File | What |
|---|---|
| [instructions.md](instructions.md) | the agent's instructions: answer only from the procedures, cite the source, decline the rest |
| [knowledge/](knowledge/) | the four procedure documents (fictional), each with an owner and a version |
| [questions.json](questions.json) | 14 evaluation questions in NL/FR/EN: 10 with required facts and the document to cite, 4 that must be declined (personal data, prices, a prompt injection, legal advice) |

## Results

[scripts/eval-procedures.mjs](../../scripts/eval-procedures.mjs) runs the instructions and the documents on gpt-4.1-mini in Azure AI Foundry and records the answers in [evaluation/runs/](../../evaluation/runs/). [tests/procedures.test.mjs](../../tests/procedures.test.mjs) scores the recording.

| Check | Result |
|---|---|
| Answerable questions with every required fact **and** the right source | 10/10 |
| Out-of-scope questions declined, without leaking a number | 4/4. The prompt injection (P13) was refused by the platform's content filter before it reached the model |
| Knowledge sources free of personal data, customer data and confidential labels | test passes ([tests/procedures.test.mjs](../../tests/procedures.test.mjs)) |

A finding while building the test: the model cited two documents as `[CS-01, CS-03]`. The first version of the scorer only accepted one code per bracket and marked a correct answer as wrong. **A test can be wrong too**, so read the failures before tuning the prompt.

## Oversharing: the check before any document goes in

An agent answers anyone who may use it, from any document it can reach. With SharePoint as the knowledge source, the agent searches **as the user**, so it only finds what that user may open. That sounds safe until the site permissions are too wide. The usual problems are *Everyone except external users*, old sharing links, and a "temporary" folder with the salary file.

| Step | How | Owner |
|---|---|---|
| 1. One source, one purpose | a dedicated SharePoint library "CS procedures", not the team site root | team lead + IT |
| 2. Permissions | read for the customer service group only; no "Everyone"; no sharing links; reviewed quarterly | IT |
| 3. Content scan before upload | no personal data, customer data, prices or confidential labels → automated in [tests/procedures.test.mjs](../../tests/procedures.test.mjs) for this repo; in the tenant, a Purview DLP / sensitivity-label policy on the library | IT, DPO |
| 4. Owner and version on every document | stale procedures are the most common wrong answer | each procedure owner |
| 5. Agent settings | *use general knowledge* **off**, *web search* **off**, generative answers only from the library | maker |
| 6. Tenant-wide | Restricted SharePoint Search or Restricted Content Discovery while permissions are being cleaned up; Purview *DSPM for AI* reports on what agents surface | M365 admin |
| 7. Evaluate before publishing, and after every document change | the question set above, plus questions the champions collect | team lead |

## How it is built in this repository, and what is not

- **Built and measured:** instructions, knowledge, question set, evaluation on a real model, oversharing scan.
- **In Copilot Studio:** the same instructions and documents can be uploaded as file knowledge in the developer environment. In a real tenant, the knowledge source is a SharePoint library (step 1), so the user's own permissions apply. That library was not created here on purpose: the developer environment's tenant is not a client tenant.
- **Not built:** the Teams channel publication and the Purview policies (tenant-level settings).
