// Deletes the inbound emails (and, by cascade, their replies) of a test batch.
//   node delete-batch.mjs <batch>
import { all, api } from "./dv.mjs";
const rows = await all(`crl_inboundemails?$select=crl_inboundemailid&$filter=crl_batch eq '${process.argv[2]}'`);
for (const r of rows) await api("DELETE", `crl_inboundemails(${r.crl_inboundemailid})`, undefined, { solution: null });
console.log(`deleted ${rows.length} emails of batch ${process.argv[2]}`);
