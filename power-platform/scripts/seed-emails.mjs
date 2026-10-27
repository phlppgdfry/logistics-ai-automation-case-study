// Puts test emails into the inbound-email table, as the mailbox trigger would. The flows take over:
// CRL-01 screens and reads, CRL-02 decides and replies, CRL-03 asks a colleague to review drafts.
//
//   node seed-emails.mjs <batch> <set> <reader>
//     set:    main | holdout | E01,E02,…
//     reader: stand-in        recorded reading of the keyword stand-in (src/text.mjs)
//             labels          the labelled correct reading (held-out set)
//             run:<file>      a recorded model run (evaluation/runs/<file>.json)
//             agent           the Copilot Studio agent reads the email (live)
import { readFileSync } from "node:fs";
import { post } from "./dv.mjs";
import { splitQuoted, understand, toAgentOutput } from "../../src/text.mjs";
import { OPT } from "../flows/definitions.mjs";

const [batch, set = "main", reader = "stand-in"] = process.argv.slice(2);
if (!batch) throw new Error("usage: node seed-emails.mjs <batch> <set> <reader>");
const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const tms = read("data/tms.json");
const main = read("data/emails.json").emails;
const holdout = read("data/emails-holdout.json").emails;
const emails = set === "main" ? main : set === "holdout" ? holdout : [...main, ...holdout].filter((e) => set.split(",").includes(e.id));
const run = reader.startsWith("run:") ? read(`evaluation/runs/${reader.slice(4)}.json`) : null;

function reading(e) {
  if (reader === "stand-in") return toAgentOutput(understand(e));
  if (reader === "labels") {
    const r = e.reading;
    return { language: r.language, intent: r.intent, confidence: r.intent === "unknown" ? 0.3 : 0.95, references: r.references.map((value) => ({ type: /^CL-/.test(value) ? "shipment" : /^\d{7}$/.test(value) ? "cmr" : "customer", value })), referencesFromQuoted: r.referencesFromQuoted, sensitive: r.sensitive, instructionSignals: r.instruction ? ["(labelled)"] : [] };
  }
  if (run) return run.outputs[e.id];
  return null;
}

for (const e of emails) {
  const { fresh, quoted } = splitQuoted(e.body);
  const out = reading(e);
  await post("crl_inboundemails", {
    crl_batch: batch,
    crl_testcase: e.id,
    crl_from: e.from,
    crl_subject: e.subject,
    crl_body: e.body,
    crl_freshtext: fresh,
    crl_quotedtext: quoted,
    crl_dmarc: e.auth?.dmarc ?? "none",
    crl_headers: JSON.stringify(e.headers ?? {}),
    crl_receivedon: tms.asOf,
    crl_autorepliestoday: e.context?.autoRepliesToSenderToday ?? 0,
    crl_reader: reader === "agent" ? OPT.reader.agent : OPT.reader.recorded,
    crl_agentoutput: out ? JSON.stringify(out) : null,
    crl_status: OPT.email.received,
  }, { solution: null });
  process.stdout.write(`${e.id} `);
}
console.log(`\n${emails.length} emails in batch ${batch}`);
