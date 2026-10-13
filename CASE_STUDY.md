# Case study: "Where is my delivery?"

> *Fictional organisation; illustrative figures.*

**Client.** Corlaan Logistics, a Belgian pallet distributor with 11 customer service agents and <!--n:a.emailsPerDay-->640<!--/n--> emails a day.

**Question.** "Half the mailbox is 'where is my delivery?'. The answer is in the TMS. Why does a person still type it?" — and should we hire an extra agent for 2027?

**What the analysis found.** <!--n:a.shareWismo-->38%<!--/n--> status and <!--n:a.sharePod-->11%<!--/n--> proof-of-delivery emails, <!--n:bc.baselineHoursYear-->4,973 h<!--/n--> a year. The time goes into *finding* shipments, because customers use four kinds of reference. One in eight status emails is really a complaint. Subcontractor data is often stale. French-speaking customers wait twice as long.

**What was designed.** A Power Automate flow triggered by the shared mailbox. It asks a Copilot Studio agent, which has no tools, to read the email and return JSON. It looks up the TMS through a read-only custom connector, checks whether the sender may see each shipment, and applies <!--n:rules.count-->18<!--/n--> named rules. Then it sends a template reply, prepares a draft for a colleague, or routes the email to the right team. Everything is logged, and one setting switches it to draft-only or off.

**How it was tested.** A <!--n:tests.cases-->48<!--/n-->-email evaluation set, written with the team lead, runs in CI on every commit. Result: <!--n:tests.passed-->48<!--/n-->/<!--n:tests.cases-->48<!--/n-->, no harm. A naive "give the model the mailbox" design harms in <!--n:naive.harmful-->23<!--/n--> of the same emails.

**What it is worth.** <!--n:bc.capacityHoursYear-->3,832 h<!--/n--> a year freed. Cash comes only from what management stops spending (Q4 temps, the 2027 hire): NPV <!--n:bc.npv3y-->€144,672<!--/n-->, payback <!--n:bc.payback-->13 months<!--/n-->. If the hire happens anyway, the NPV is <!--n:sc.no-hire.npv-->€13,595<!--/n-->, so that decision is on the go/no-go list.

**How it goes live.** Shadow, then draft-only, then graduated automation, each step with a measured gate and an automatic way back.

**What this case does not claim.** No tenant build, no real emails, no real model evaluation: see [Limitations](README.md#limitations-and-assumptions).
