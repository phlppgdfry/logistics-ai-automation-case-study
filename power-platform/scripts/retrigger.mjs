// Re-runs CRL-02 for the emails of a batch that are still on Read (or Error): writes the status again.
//   node retrigger.mjs <batch>
import { all, patch } from "./dv.mjs";
import { OPT } from "../flows/definitions.mjs";
const rows = await all(`crl_inboundemails?$select=crl_inboundemailid,crl_testcase&$filter=crl_batch eq '${process.argv[2]}' and (crl_status eq ${OPT.email.read} or crl_status eq ${OPT.email.error})`);
for (const r of rows) await patch(`crl_inboundemails(${r.crl_inboundemailid})`, { crl_status: OPT.email.read }, { solution: null });
console.log(`re-triggered ${rows.length}: ${rows.map((r) => r.crl_testcase).join(" ")}`);
