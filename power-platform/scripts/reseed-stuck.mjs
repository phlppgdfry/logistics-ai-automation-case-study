// Re-creates the emails of a batch that are still "Received" (their trigger never fired), with the same reader.
//   node reseed-stuck.mjs <batch> <reader>
import { execFileSync } from "node:child_process";
import { all, api } from "./dv.mjs";
import { OPT } from "../flows/definitions.mjs";
const [batch, reader] = process.argv.slice(2);
const rows = await all(`crl_inboundemails?$select=crl_inboundemailid,crl_testcase&$filter=crl_batch eq '${batch}' and crl_status eq ${OPT.email.received}`);
for (const r of rows) await api("DELETE", `crl_inboundemails(${r.crl_inboundemailid})`, undefined, { solution: null });
if (rows.length) console.log(execFileSync("node", ["seed-emails.mjs", batch, rows.map((r) => r.crl_testcase).join(","), reader], { cwd: new URL("./", import.meta.url).pathname, encoding: "utf8" }).trim().split("\n").pop());
else console.log(`nothing stuck in ${batch}`);
