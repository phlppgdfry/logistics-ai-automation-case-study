# One-page summary

> *Portfolio case, fictional organisation, illustrative figures.*

| | |
|---|---|
| **Client** | Corlaan Logistics (fictional): Belgian pallet distribution, 11 customer service agents |
| **Problem** | <!--n:a.emailsPerDay-->640<!--/n--> emails a day; half ask for status or a proof of delivery; <!--n:bc.baselineHoursYear-->4,973 h<!--/n--> a year of agent time; 2.9 h first response (5.2 h in French); extra hire requested |
| **Solution** | Power Automate flow + Copilot Studio agent without tools + read-only TMS connector + <!--n:rules.count-->18<!--/n--> policy rules + approved templates in NL/FR/EN |
| **Key idea** | The model reads. Rules decide. Only the flow sends — only templates, only to the original sender. |
| **Evidence** | <!--n:tests.passed-->48<!--/n-->/<!--n:tests.cases-->48<!--/n--> evaluation emails correct, 0 harm; naive design harms in <!--n:naive.harmful-->23<!--/n--> · 14 threats with controls · CI enforces docs = model |
| **Value** | <!--n:bc.capacityHoursYear-->3,832 h<!--/n-->/year freed · NPV <!--n:bc.npv3y-->€144,672<!--/n--> · payback <!--n:bc.payback-->13 months<!--/n--> · **<!--n:sc.no-hire.npv-->€13,595<!--/n--> if the hire happens anyway** |
| **Rollout** | shadow → draft-only → graduated, measured gates, kill switch |
| **Not claimed** | client tenant, real traffic, live mailbox, real TMS |

Demo: https://phlppgdfry.github.io/logistics-ai-automation-case-study/demo/?tour
