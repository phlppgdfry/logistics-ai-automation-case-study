# Corlaan Customer Service (model-driven app)

One app for the team lead, the champions and the reviewers. Built by [../scripts/provision-dashboard.mjs](../scripts/provision-dashboard.mjs) and [../scripts/provision-app.mjs](../scripts/provision-app.mjs) on the tables in [../model.json](../model.json).

| Area | Page | For | What it shows |
|---|---|---|---|
| Overview | **KPI dashboard** | team lead, sponsor | six charts: emails per decision, routed emails per queue, replies per status (approved / rejected / waiting), emails per intent, per language, per processing status |
| Customer email | **Inbound emails** | team lead, champions | every email with its decision, template, queue, rules fired and shipments answered. The form shows the decision first, then the email, then what the agent read (the JSON) and the findings: *why* it decided this |
| Customer email | **Replies** → view *Drafts awaiting review* | reviewers | held replies and the rules that held them; the decision itself is taken in Approvals (Teams or Outlook), see [flow CRL-03](../flows/README.md) |
| TMS sandbox | Shipments, accounts, contacts | IT, testers | the fictional TMS data the flow looks up |
| Settings | Reply templates | team lead | one row per language, generated from [src/compose.mjs](../../src/compose.mjs). Changing a sentence means changing the code and re-running the tests, on purpose: every sentence is approved once ([ADR-003](../../docs/adr/003-templates-not-free-text.md)) |

## Why a model-driven app and not a canvas app

The work is *look at a list, open a record, understand a decision*, which is what model-driven apps do without custom screens: views, forms, charts, security roles. A canvas app would add screens to maintain without adding a decision the user can take. The decision on a draft already happens in Approvals, where reviewers already are.

## Why not Power BI (yet)

The six KPIs are counts on two Dataverse tables, and the model-driven dashboard shows them live, with no extra licence. Power BI is the right tool when the KPIs need history and trends over months (first-response time per week, French vs Dutch, credits per month) or must be combined with data from Exchange message trace and the Copilot Studio analytics. That report is specified in [docs/06-rollout/pilot-and-adoption.md](../../docs/06-rollout/pilot-and-adoption.md#kpis) and is not built in this repository, because Power BI Desktop runs on Windows only.
