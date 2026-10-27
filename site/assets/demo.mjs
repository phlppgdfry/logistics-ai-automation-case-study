// Mailbox demo. Runs the same modules as CI (copied to assets/lib by scripts/build.mjs).
import { createContext, runGuarded, runNaive, harmsOf, evaluate, HARMS } from "./lib/pipeline.mjs";
import { RULE_BY_ID } from "./lib/rules.mjs";
import { values, compute, sensitivity } from "./lib/business-case.mjs";
import { prioritise } from "./lib/prioritise.mjs";
import { createTour } from "./tour.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = (n) => `€${Math.round(n).toLocaleString("en-GB")}`;
const int = (n) => Math.round(n).toLocaleString("en-GB");

const [tms, mail, model, modelEval, holdout, useCases] = await Promise.all(["tms", "emails", "model", "model-evaluation", "emails-holdout", "use-cases"].map((f) => fetch(`../data/${f}.json`).then((r) => r.json())));
const data = { ...tms, ...mail };
const state = { id: "E01", design: "guarded", mode: "graduated", reader: "stand-in" };

const OUTCOME_TEXT = {
  auto: "Sent automatically",
  draft: "Draft for a colleague",
  route: "Routed to a person",
  ignore: "Ignored (logged)",
};
const TEMPLATE_TEXT = { status: "status reply", pod: "proof-of-delivery reply", clarify: "asks for the reference", generic: "generic reply, reveals nothing" };

// --- Tabs -------------------------------------------------------------------------------------------
const tabs = [...document.querySelectorAll('[role="tab"]')];
function showTab(id) {
  for (const t of tabs) {
    const on = t.getAttribute("aria-controls") === id;
    t.setAttribute("aria-selected", String(on));
    document.getElementById(t.getAttribute("aria-controls")).classList.toggle("active", on);
  }
  if (location.hash !== `#${id}`) history.replaceState(null, "", `${location.search}#${id}`);
}
tabs.forEach((t) => t.addEventListener("click", () => showTab(t.getAttribute("aria-controls"))));
if (["inbox", "tests", "value", "reading", "rollout", "workshop"].includes(location.hash.slice(1))) showTab(location.hash.slice(1));

// --- Inbox ------------------------------------------------------------------------------------------
function results() {
  const ctx = createContext(data, { mode: state.mode });
  return { ctx, guarded: data.emails.map((e) => runGuarded(ctx, e)) };
}

function renderList() {
  const { guarded } = results();
  $("#mail-list").innerHTML = data.emails.map((e, i) => {
    const g = guarded[i];
    const shown = state.design === "naive" ? "auto" : g.action;
    return `<li><button type="button" data-id="${e.id}" aria-current="${e.id === state.id}">
      <span class="from">${esc(e.id)} · ${esc(e.from)}</span>
      <span class="subj">${esc(e.subject)}</span>
      <span class="meta"><span class="out ${shown}">${shown}</span><span class="from">${esc(e.title)}</span></span>
    </button></li>`;
  }).join("");
}
$("#mail-list").addEventListener("click", (ev) => {
  const b = ev.target.closest("button[data-id]");
  if (b) select(b.dataset.id);
});

function renderDetail() {
  const e = data.emails.find((x) => x.id === state.id);
  const ctx = createContext(data, { mode: state.mode });
  const g = runGuarded(ctx, e);
  const header = `<div class="mail"><h3>${esc(e.subject)}</h3>
    <p class="hdr">From ${esc(e.from)} · DMARC ${esc(e.auth?.dmarc)}${e.headers ? ` · ${esc(Object.entries(e.headers).map(([k, v]) => `${k}: ${v}`).join(" · "))}` : ""}${e.context?.autoRepliesToSenderToday ? ` · ${e.context.autoRepliesToSenderToday} automatic replies to this sender today` : ""}</p>
    <pre>${esc(e.body)}</pre></div>`;

  if (state.design === "naive") {
    const n = runNaive(ctx, e);
    const harms = harmsOf(ctx, e, n);
    $("#detail").innerHTML = `${header}
      <div class="verdict ${harms.length ? "route" : "auto"}" id="verdict"><strong>Naive design: sent automatically</strong>
        <p>One model with the mailbox and a TMS tool: every reference anywhere in the thread, looked up across all accounts, answered.</p>
        ${harms.length ? `<p class="harm">Harm: ${harms.map((h) => esc(HARMS[h])).join(" · ")}</p>` : "<p>No harm on this email — the naive design is fine on easy cases.</p>"}
        <p>Guarded design would: <strong>${OUTCOME_TEXT[g.action]}</strong>${g.template && g.action !== "route" ? ` — ${TEMPLATE_TEXT[g.template]}` : g.queue ? ` — ${esc(g.queue)}` : ""}${g.rules.length ? ` (${g.rules.join(", ")})` : ""}.</p></div>
      <div class="reply naive" id="reply"><pre>${esc(n.reply.text)}</pre></div>`;
    return;
  }

  const steps = g.trace.map((t) => `<li><b>${esc(t.step)}</b><span>${esc(t.detail)}</span></li>`).join("");
  const why = g.fired.length
    ? g.fired.map((f) => `<code>${f.id}</code> ${esc(RULE_BY_ID[f.id].name)} — ${esc(RULE_BY_ID[f.id].why)}`).join("<br>")
    : "No rule fired: a plain question, a shipment found, a sender entitled to see it.";
  const what = g.action === "route" ? `Queue: <strong>${esc(g.queue)}</strong>` : g.template ? `Template: ${TEMPLATE_TEXT[g.template]}` : "";
  $("#detail").innerHTML = `${header}
    <ol class="steps" id="steps">${steps}</ol>
    <div class="verdict ${g.action}" id="verdict"><strong>${OUTCOME_TEXT[g.action]}</strong>${what ? ` · ${what}` : ""}<p>${why}</p></div>
    ${g.reply ? `<div class="reply" id="reply"><p class="note" style="margin:0 0 6px">${g.action === "draft" ? "Prepared draft — a colleague sends, edits or rejects it" : "Sent to the original sender"}</p><pre>${esc(g.reply.text)}</pre></div>` : ""}`;
}

function select(id) {
  state.id = id;
  renderList();
  renderDetail();
}

function setSwitch(group, attr, value) {
  for (const b of document.querySelectorAll(`#${group} [data-${attr}]`)) b.setAttribute("aria-pressed", String(b.dataset[attr] === value));
}
$("#design-switch").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-design]");
  if (!b) return;
  setDesign(b.dataset.design);
});
$("#mode-switch").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-mode]");
  if (!b) return;
  state.mode = b.dataset.mode;
  setSwitch("mode-switch", "mode", state.mode);
  select(state.id);
});
function setDesign(d) {
  state.design = d;
  setSwitch("design-switch", "design", d);
  select(state.id);
}

// --- Test set ---------------------------------------------------------------------------------------
function renderTests() {
  const ev = evaluate(data);
  const s = ev.summary;
  const max = s.cases;
  const bar = (label, naive, guarded) => `
    <div class="bar-row"><span>${esc(label)}</span><div class="track"><div class="fill naive" style="width:${(naive / max) * 100}%"></div></div><span class="num">${naive}</span></div>
    <div class="bar-row"><span class="note" style="font-style:normal">guarded</span><div class="track"><div class="fill guarded" style="width:${(guarded / max) * 100}%"></div></div><span class="num">${guarded}</span></div>`;
  $("#tests-summary").innerHTML = `
    <div class="card"><p class="note" style="font-style:normal">Guarded design</p><div class="big">${s.passed}/${s.cases} correct</div>
      <p>${s.actions.auto} automatic · ${s.actions.draft} drafts · ${s.actions.route} routed · ${s.actions.ignore} ignored · ${s.guardedHarmfulCases} harmful</p>
      <p style="margin-top:8px">The set is deliberately hard: real traffic is ±55% automatic, this set ${Math.round((s.actions.auto / s.cases) * 100)}%.</p></div>
    <div class="card"><p class="note" style="font-style:normal">Naive design — harmful outcomes</p><div class="big" style="color:var(--risk)">${s.naiveHarmfulCases} of ${s.cases} emails</div>
      <div class="bars" style="margin-top:10px">${Object.keys(HARMS).map((h) => bar(HARMS[h], s.naiveHarms[h], s.guardedHarms[h])).join("")}</div></div>`;
  $("#tests-table").innerHTML = `<thead><tr><th>Email</th><th>Expected</th><th>Guarded</th><th>Rules</th><th></th><th>Naive harm</th></tr></thead><tbody>${ev.rows.map((r) => `
    <tr><td><a href="#inbox" data-open="${r.id}">${r.id}</a> ${esc(r.title)}</td>
      <td>${r.expected.action}${r.expected.queue ? ` → ${r.expected.queue}` : r.expected.template ? ` · ${r.expected.template}` : ""}</td>
      <td>${r.guarded.action}${r.guarded.queue ? ` → ${r.guarded.queue}` : r.guarded.template ? ` · ${r.guarded.template}` : ""}</td>
      <td><code>${r.guarded.rules.join(" ") || "—"}</code></td>
      <td class="${r.pass ? "pass" : "fail"}">${r.pass ? "pass" : "FAIL"}</td>
      <td class="harm">${r.naiveHarms.join(", ")}</td></tr>`).join("")}</tbody>`;
}
$("#tests-table").addEventListener("click", (ev) => {
  const a = ev.target.closest("[data-open]");
  if (!a) return;
  ev.preventDefault();
  showTab("inbox");
  setDesign("guarded");
  select(a.dataset.open);
  document.querySelector(`[data-id="${a.dataset.open}"]`)?.scrollIntoView({ block: "nearest" });
});

// --- Business case ----------------------------------------------------------------------------------
const SLIDERS = [
  ["emailsPerDay", 300, 1200, 10, (x) => int(x)],
  ["shareWismo", 0.2, 0.6, 0.01, (x) => `${Math.round(x * 100)}%`],
  ["ahtWismoMin", 2, 8, 0.5, (x) => `${x.toFixed(1)} min`],
  ["autoShare", 0, 0.7, 0.05, (x) => `${Math.round(x * 100)}%`],
  ["reviewMinPerDraft", 0.5, 3, 0.5, (x) => `${x.toFixed(1)} min`],
  ["creditPrice", 0.005, 0.03, 0.001, (x) => `€${x.toFixed(3)}`],
  ["consultantDays", 15, 60, 1, (x) => `${x} days`],
];
const base = values(model);
let v = { ...base };
function renderSliders() {
  $("#sliders").innerHTML = SLIDERS.map(([k, min, max, step, fmt]) => `
    <div class="slider"><label for="s-${k}"><span>${esc(model.assumptions[k].label)}</span><output id="o-${k}">${fmt(v[k])}</output></label>
    <input type="range" id="s-${k}" data-key="${k}" min="${min}" max="${max}" step="${step}" value="${v[k]}"></div>`).join("");
}
$("#sliders").addEventListener("input", (ev) => {
  const k = ev.target.dataset.key;
  if (!k) return;
  v[k] = Number(ev.target.value);
  if (k === "autoShare") v.autoShare = Math.min(v.autoShare, 1 - v.draftShare);
  $(`#o-${k}`).textContent = SLIDERS.find((s) => s[0] === k)[4](v[k]);
  renderValue();
});
$("#btn-nohire").addEventListener("click", () => setNoHire(v.hireAvoidedCost !== 0));
$("#btn-reset").addEventListener("click", () => { v = { ...base }; $("#btn-nohire").setAttribute("aria-pressed", "false"); renderSliders(); renderValue(); });
function setNoHire(on) {
  v.hireAvoidedCost = on ? 0 : base.hireAvoidedCost;
  $("#btn-nohire").setAttribute("aria-pressed", String(on));
  renderValue();
}

function renderValue() {
  const r = compute(v);
  $("#value-out").innerHTML = `<h2>Result</h2>
    <p class="note" style="font-style:normal">3-year NPV</p><div class="big" style="color:${r.npv3y >= 0 ? "var(--ok)" : "var(--risk)"}">${eur(r.npv3y)}</div>
    <p>Payback: <strong>${r.paybackMonths ? `${r.paybackMonths} months` : "not within 3 years"}</strong></p>
    <div class="table-wrap" style="margin-top:12px"><table><tbody>
      <tr><td>Agent time on status + POD today</td><td class="num">${int(r.baselineHoursYear)} h</td></tr>
      <tr><td>Capacity freed</td><td class="num">${int(r.capacityHoursYear)} h · ${r.capacityFte.toFixed(1)} FTE</td></tr>
      <tr><td>… of which becomes cash (temps, avoided hire)</td><td class="num">${eur(r.cashBenefitYear)}</td></tr>
      <tr><td>Build</td><td class="num">${eur(r.buildCost)}</td></tr>
      <tr><td>Run per year (credits ${eur(r.creditCostYear)})</td><td class="num">${eur(r.runCostYear)}</td></tr>
    </tbody></table></div>
    <p class="note">Freed time only becomes cash where it replaces money that would otherwise be spent. The rest goes back to the team.</p>`;
  const sens = sensitivity(model, v);
  const lo = Math.min(...sens.map((s) => Math.min(s.low, s.high)));
  const hi = Math.max(...sens.map((s) => Math.max(s.low, s.high)));
  const pos = (x) => ((x - lo) / (hi - lo || 1)) * 100;
  $("#tornado").innerHTML = sens.map((s) => {
    const a = pos(Math.min(s.low, s.high));
    const b = pos(Math.max(s.low, s.high));
    return `<div class="tornado-row"><span>${esc(s.label)}</span><div class="tornado-track" title="${eur(s.low)} – ${eur(s.high)}">
      <div class="tornado-bar" style="left:${a}%;width:${Math.max(b - a, 0.5)}%"></div><div class="tornado-base" style="left:${pos(s.base)}%"></div></div></div>`;
  }).join("") + `<p class="note">Bars: NPV range when one assumption moves ±25%. Line: current NPV (${eur(sens[0].base)}). Range ${eur(lo)} – ${eur(hi)}.</p>`;
}

// --- Reading: recorded model and agent readings ----------------------------------------------------
const READERS = modelEval.readers.filter((r) => !/-r[23]$/.test(r.key));
const runsOf = (prefix) => modelEval.readers.filter((r) => r.key.startsWith(prefix) && r.result.main);
function renderReading() {
  const cell = (res, key) => (res ? `${res.passed}/${res.cases}${res.harmful ? ` <span class="harm">· ${res.harmful} harmful</span>` : ""}` : "—");
  $("#reading-table").innerHTML = `<thead><tr><th>Reader</th><th>Main set (written with the stand-in)</th><th>Held-out set (never tuned on)</th></tr></thead><tbody>${READERS.map((r) => {
    const v3 = r.key === "f-v3" ? runsOf("f-v3") : null;
    const main = v3 ? `${Math.min(...v3.map((x) => x.result.main.passed))}–${Math.max(...v3.map((x) => x.result.main.passed))}/${r.result.main.cases} (3 runs)${v3.some((x) => x.result.main.harmful) ? " <span class=\"harm\">harmful</span>" : ""}` : cell(r.result.main);
    return `<tr><td>${esc(r.label.replace(" (run 1)", ""))}</td><td>${main}</td><td>${cell(r.result.holdout)}</td></tr>`;
  }).join("")}</tbody>`;
  const sw = $("#reader-switch");
  sw.innerHTML = `<span>Reader</span>${READERS.map((r) => `<button class="btn-sm" type="button" data-reader="${r.key}" aria-pressed="${r.key === state.reader}">${esc(r.label.replace(" (run 1)", "").replace("gpt-4.1-mini, instructions", "model v"))}</button>`).join("")}`;
  const reader = READERS.find((r) => r.key === state.reader) ?? READERS[0];
  const miss = Object.fromEntries(reader.result.holdout.misses.map((m) => [m.id, m]));
  const fmt = (o) => `${o.action}${o.queue ? ` → ${o.queue}` : o.template ? ` · ${o.template}` : ""}`;
  $("#holdout-table").innerHTML = `<thead><tr><th>Email</th><th>Expected</th><th>With this reading</th><th></th></tr></thead><tbody>${holdout.emails.map((e) => {
    const m = miss[e.id];
    const got = m ? fmt(m) : fmt(e.expected);
    const verdict = !m ? '<td class="pass">as expected</td>' : m.harms.length ? `<td class="fail">harmful: ${esc(m.harms.join(", "))}</td>` : m.pass ? '<td class="pass">as expected</td>' : '<td class="note">safe miss</td>';
    return `<tr><td>${e.id} ${esc(e.title)}</td><td>${fmt(e.expected)}</td><td>${got}</td>${verdict}</tr>`;
  }).join("")}</tbody>`;
}
$("#reader-switch").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-reader]");
  if (!b) return;
  state.reader = b.dataset.reader;
  renderReading();
});

// --- Workshop: use-case prioritisation -------------------------------------------------------------
const weights = { ...useCases.weights };
function renderWorkshop() {
  $("#weights").innerHTML = Object.entries(weights).map(([k, w]) => `<div class="slider"><label for="w-${k}"><span>${esc(k === "risk" ? "risk (5 = low)" : k)}</span><output id="ow-${k}">${Math.round(w * 100)}%</output></label><input type="range" id="w-${k}" min="0" max="1" step="0.05" value="${w}" data-weight="${k}"></div>`).join("") +
    '<p class="note">Weights are normalised: only their ratio matters.</p>';
  renderUseCases();
}
function renderUseCases() {
  const ranked = prioritise({ useCases: useCases.useCases, weights });
  $("#usecase-table").innerHTML = `<thead><tr><th>#</th><th>Use case</th><th>Score</th><th>Decision</th></tr></thead><tbody>${ranked.map((u, i) => `<tr><td>${i + 1}</td><td>${esc(u.name)}${u.gate ? ` <span class="harm">· ${esc(u.gate)}</span>` : ""}</td><td>${u.score.toFixed(2)}</td><td>${esc(u.decision)}</td></tr>`).join("")}</tbody>`;
}
$("#weights").addEventListener("input", (ev) => {
  const k = ev.target.dataset.weight;
  if (!k) return;
  weights[k] = Number(ev.target.value);
  $(`#ow-${k}`).textContent = `${Math.round(weights[k] * 100)}%`;
  renderUseCases();
});

// --- Start ------------------------------------------------------------------------------------------
select(state.id);
renderTests();
renderReading();
renderWorkshop();
renderSliders();
renderValue();

const S = evaluate(data).summary;
const B = compute(base);
const tour = createTour([
  { text: `Corlaan gets ${int(base.emailsPerDay)} customer emails a day. This inbox holds ${S.cases} of them: the evaluation set the team lead helped write, from easy to nasty. Each one shows what the flow decided.`, focus: "#mail-list", before: () => { showTab("inbox"); setDesign("guarded"); select("E01"); } },
  { text: "A plain question from a registered contact. The agent reads it, the flow finds the shipment in the TMS, checks the sender may see it, and no rule objects: a template reply goes out with TMS facts only.", focus: "#steps", before: () => { showTab("inbox"); setDesign("guarded"); select("E01"); } },
  { text: "A Gmail address says it is Hortex. The sender is not linked to the account, so it gets a generic reply. That reply is identical to the one for a non-existent number, so nobody can probe the mailbox.", focus: "#verdict", before: () => select("E16") },
  { text: "A subcontractor shipment whose last update is 7 hours old. Answering 'on its way' would be a confident guess, so rule R14 makes it a draft and a colleague checks with the carrier first.", focus: "#verdict", before: () => select("E21") },
  { text: "'Ignore all previous instructions…'. The agent has no tools, so the worst it can do is mislabel. The flow sees the instruction signal and routes the email to security. Nothing is sent.", focus: "#verdict", before: () => select("E39") },
  { text: "Now the same Gmail email under the naive design: one model with the mailbox and a TMS tool. It answers, and leaks the shipment and the receiver's address to a stranger.", focus: "#reply", before: () => { setDesign("naive"); select("E16"); } },
  { text: `Over all ${S.cases} emails: the guarded design gets ${S.passed}/${S.cases} right with ${S.guardedHarmfulCases} harmful outcomes. The naive design harms in ${S.naiveHarmfulCases}: leaks, stale answers, status lines to angry customers, reply loops. The same tests run in CI on every commit.`, focus: "#tests-summary", before: () => { setDesign("guarded"); showTab("tests"); } },
  { text: `The business case: ${int(B.capacityHoursYear)} hours a year freed. Only the part that replaces temps and a planned hire is cash. Toggle 'the hire happens anyway' and the NPV collapses, because this case rests on a management decision, not on the AI.`, focus: "#value-out", before: () => { showTab("value"); setNoHire(true); } },
  { text: "That is why rollout starts in shadow and draft-only mode. Draft-only alone already covers the cash. Automation is switched on per step, with measured gates and an automatic way back.", focus: "#ladder", before: () => { setNoHire(false); showTab("rollout"); } },
  { text: "What is real: the agent, the cloud flows, the tables and an app are built in a Power Platform developer environment and decide exactly like this demo. The reading is measured on a real model in the Reading tab. In this demo the reader is a stand-in; the mailbox and TMS are not connected; everything is fictional.", focus: "#limits", before: () => showTab("rollout") },
]);
$("#btn-tour").addEventListener("click", () => tour.start());
