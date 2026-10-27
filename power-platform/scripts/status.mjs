// Compact view of the inbound emails of one batch (or all): status, decision, rules, error.
//   node status.mjs [batch]
import { all } from "./dv.mjs";
const batch = process.argv[2];
const F = "@OData.Community.Display.V1.FormattedValue";
const rows = await all(`crl_inboundemails?$select=crl_batch,crl_testcase,crl_status,crl_action,crl_rules,crl_template,crl_queue,crl_shipments,crl_error${batch ? `&$filter=crl_batch eq '${batch}'` : ""}&$orderby=crl_testcase asc`);
for (const x of rows) console.log([x.crl_batch, x.crl_testcase, x[`crl_status${F}`], x[`crl_action${F}`] ?? "", x.crl_rules ?? "", x.crl_template ?? "", x.crl_queue ?? "", x.crl_shipments ?? "", (x.crl_error ?? "").slice(0, 120)].join(" | "));
console.log(`${rows.length} rows`);
