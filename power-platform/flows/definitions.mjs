// Power Automate cloud flow definitions for the solution CorlaanCustomerEmail, written as code so
// they can be reviewed, diffed and re-deployed. scripts/provision-flows.mjs writes them into
// Dataverse. The decision logic mirrors runGuarded() in src/pipeline.mjs (the tested reference);
// scripts/verify.mjs compares what the real flows decided with what the reference decides.
//
//   CRL-01 Read inbound email   screen automated mail (R01), then let the agent read the email
//   CRL-02 Decide and reply     TMS look-ups, authorisation, rules R02–R18, reply from templates
//   CRL-03 Review draft         a colleague approves or rejects a held reply (Approvals)

const DVAPI = "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps";
const APAPI = "/providers/Microsoft.PowerApps/apis/shared_approvals";
const CSAPI = "/providers/Microsoft.PowerApps/apis/shared_microsoftcopilotstudio";
const AUTH = "@parameters('$authentication')";
export const AGENT = "crl_corlaanMailReader";

export const CONNECTION_REFERENCES = {
  shared_commondataserviceforapps: { runtimeSource: "embedded", connection: { connectionReferenceLogicalName: "crl_dataverse" }, api: { name: "shared_commondataserviceforapps" } },
  shared_approvals: { runtimeSource: "embedded", connection: { connectionReferenceLogicalName: "crl_approvals" }, api: { name: "shared_approvals" } },
  shared_microsoftcopilotstudio: { runtimeSource: "embedded", connection: { connectionReferenceLogicalName: "crl_copilotstudio" }, api: { name: "shared_microsoftcopilotstudio" } },
};

// option values (model.json)
export const OPT = {
  status: { BOOKED: 103450000, PICKED_UP: 103450001, IN_TRANSIT: 103450002, OUT_FOR_DELIVERY: 103450003, DELIVERED: 103450004, EXCEPTION: 103450005 },
  email: { received: 103450000, read: 103450001, decided: 103450002, error: 103450009 },
  reader: { recorded: 103450000, agent: 103450001 },
  action: { auto: 103450000, draft: 103450001, route: 103450002, ignore: 103450003 },
  reply: { sent: 103450000, review: 103450001, approved: 103450002, rejected: 103450003 },
};

const dv = (operationId, parameters, runAfter = {}) => ({ type: "OpenApiConnection", inputs: { host: { connectionName: "shared_commondataserviceforapps", operationId, apiId: DVAPI }, parameters, authentication: AUTH }, runAfter });
const trigger = (entity, message, extra = {}) => ({ type: "OpenApiConnectionWebhook", inputs: { host: { connectionName: "shared_commondataserviceforapps", operationId: "SubscribeWebhookTrigger", apiId: DVAPI }, parameters: { "subscriptionRequest/message": message, "subscriptionRequest/entityname": entity, "subscriptionRequest/scope": 4, ...extra }, authentication: AUTH } });
const compose = (inputs, runAfter = {}) => ({ type: "Compose", inputs, runAfter });
const init = (name, type, value, runAfter = {}) => ({ type: "InitializeVariable", inputs: { variables: [{ name, type, value }] }, runAfter });
const append = (name, value, runAfter = {}) => ({ type: "AppendToArrayVariable", inputs: { name, value }, runAfter });
const iff = (expression, actions, elseActions = {}, runAfter = {}) => ({ type: "If", expression, actions, else: { actions: elseActions }, runAfter });
const ok = (...names) => Object.fromEntries(names.map((n) => [n, ["Succeeded"]]));
const failed = (...names) => Object.fromEntries(names.map((n) => [n, ["Failed", "TimedOut"]]));

function definition(triggers, actions, parameters = {}) {
  return {
    $schema: "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    contentVersion: "1.0.0.0",
    parameters: { $connections: { defaultValue: {}, type: "Object" }, $authentication: { defaultValue: {}, type: "SecureObject" }, ...parameters },
    triggers,
    actions,
  };
}

// environment variables as workflow parameters
const ENV = {
  confidence: ["Minimum intent confidence (R05)", "crl_ConfidenceMin", "Float", 0.75],
  stale: ["Stale status after hours (R14)", "crl_StaleHours", "Float", 4],
  maxRefs: ["Maximum references per email (R09)", "crl_MaxReferences", "Float", 3],
  maxAuto: ["Automatic replies per sender per day (R16)", "crl_MaxAutoRepliesPerDay", "Float", 3],
  mode: ["Automation mode: graduated, draft-only or off (kill switch)", "crl_Mode", "String", "graduated"],
  clock: ["Test clock (empty = real time)", "crl_ClockOverride", "String", ""],
  freemail: ["Free-mail domains", "crl_FreemailDomains", "String", ""],
  reviewer: ["Reviewer for drafts", "crl_ReviewerEmail", "String", ""],
};
const p = (k) => `parameters('${ENV[k][0]} (${ENV[k][1]})')`;
const params = (...keys) => Object.fromEntries(keys.map((k) => [`${ENV[k][0]} (${ENV[k][1]})`, { defaultValue: ENV[k][3], type: ENV[k][2], metadata: { schemaName: ENV[k][1] } }]));

const t = (c) => `triggerOutputs()?['body/${c}']`;

// crl_Mode is read from Dataverse on every run. A cloud flow keeps the environment-variable value it
// had when it was last saved or switched on, so a kill switch read as a parameter would not stop a
// running flow until someone re-saves it (found while testing; see power-platform/README.md).
const readMode = (runAfter = {}) => dv("ListRecords", {
  entityName: "environmentvariabledefinitions", $select: "schemaname,defaultvalue", $filter: "schemaname eq 'crl_Mode'",
  $expand: "environmentvariabledefinition_environmentvariablevalue($select=value)",
}, runAfter);
const MODE = "toLower(coalesce(first(first(outputs('Read_mode')?['body/value'])?['environmentvariabledefinition_environmentvariablevalue'])?['value'], first(outputs('Read_mode')?['body/value'])?['defaultvalue'], 'graduated'))";
const finding = (id, effect, queue, detail) => `addProperty(addProperty(addProperty(addProperty(json('{}'), 'id', '${id}'), 'effect', '${effect}'), 'queue', ${queue === null ? "null" : `'${queue}'`}), 'detail', ${detail})`;
const when = (cond, id, effect, queue, detail) => `if(${cond}, createArray(${finding(id, effect, queue, detail)}), json('[]'))`;

// ================================================================== CRL-01 Read inbound email
export function readEmail(S) {
  const H = `json(coalesce(${t("crl_headers")}, '{}'))`;
  const h = (name) => `toLower(string(coalesce(${H}?['${name}'], '')))`;
  const from = `toLower(coalesce(${t("crl_from")}, ''))`;
  const subj = `toLower(coalesce(${t("crl_subject")}, ''))`;
  const ooo = ["automatic reply", "automatisch antwoord", "afwezig", "absence", "réponse automatique", "out of office", "abwesenheit"].map((s) => `startsWith(${subj}, '${s}')`).join(", ");
  // same order and wording as automatedMailReason() in src/text.mjs
  const reason = `if(and(not(empty(${h("Auto-Submitted")})), not(equals(${h("Auto-Submitted")}, 'no'))), concat('Auto-Submitted: ', ${h("Auto-Submitted")}),
    if(contains(createArray('bulk', 'list', 'junk'), ${h("Precedence")}), concat('Precedence: ', ${h("Precedence")}),
    if(not(empty(${h("List-Unsubscribe")})), 'List-Unsubscribe header (newsletter)',
    if(or(startsWith(${from}, 'mailer-daemon@'), startsWith(${from}, 'postmaster@'), startsWith(${from}, 'noreply@'), startsWith(${from}, 'no-reply@')), concat('system sender ', ${from}),
    if(or(${ooo}), 'out-of-office subject', '')))))`.replace(/\s*\n\s*/g, " ");
  const input = `@{string(addProperty(addProperty(addProperty(addProperty(json('{}'), 'subject', coalesce(${t("crl_subject")}, '')), 'freshText', coalesce(${t("crl_freshtext")}, '')), 'quotedText', coalesce(${t("crl_quotedtext")}, '')), 'senderDomain', last(split(${from}, '@'))))}`;
  // the agent answers with JSON; tolerate a code fence around it
  const answer = `trim(replace(replace(variables('Answer'), '\`\`\`json', ''), '\`\`\`', ''))`;
  const SAFE = '{"language":"unknown","intent":"unknown","confidence":0,"references":[],"referencesFromQuoted":false,"sensitive":[],"instructionSignals":[]}';
  const BLOCKED = '{"blocked":true,"blockedBy":["content filter (Copilot Studio)"]}';
  return definition(
    // one email at a time: parallel agent calls in a developer environment hit the generative AI rate limit (GenAITool errors)
    { Email_received: { ...trigger("crl_inboundemail", 1), runtimeConfiguration: { concurrency: { runs: 1 } } } },
    {
      // kill switch: with crl_Mode = off nothing happens; the email stays in the inbox for the team
      Read_mode: readMode(),
      Kill_switch: iff({ equals: [`@${MODE}`, "off"] }, { Stop_automation_is_off: { type: "Terminate", inputs: { runStatus: "Cancelled" } } }, {}, ok("Read_mode")),
      Answer_init: init("Answer", "string", "", ok("Kill_switch")),
      Attempt_init: init("Attempt", "integer", 0, ok("Answer_init")),
      Automated_mail: compose(`@${reason}`, ok("Attempt_init")),
      Screen: iff({ not: { equals: ["@outputs('Automated_mail')", ""] } },
        {
          Ignore_R01: dv("UpdateOnlyRecord", {
            entityName: S.crl_inboundemail, recordId: `@${t("crl_inboundemailid")}`,
            "item/crl_status": OPT.email.decided, "item/crl_action": OPT.action.ignore, "item/crl_rules": "R01",
            "item/crl_findings": `@{string(createArray(${finding("R01", "ignore", null, "outputs('Automated_mail')")}))}`,
          }),
        },
        {
          Which_reader: iff({ equals: [`@${t("crl_reader")}`, OPT.reader.agent] },
            {
              // ask the agent; on the generative-AI rate limit wait a minute and ask again (max. 5 attempts)
              Ask_until_answered: {
                type: "Until",
                expression: `@or(not(contains(variables('Answer'), 'RateLimitReached')), greaterOrEquals(variables('Attempt'), 5))`,
                limit: { count: 6, timeout: "PT20M" },
                actions: {
                  Count_attempt: { type: "IncrementVariable", inputs: { name: "Attempt", value: 1 } },
                  Agent_reads_the_email: {
                    type: "OpenApiConnectionWebhook",
                    inputs: { host: { connectionName: "shared_microsoftcopilotstudio", operationId: "ExecuteCopilotAsyncV2", apiId: CSAPI }, parameters: { Copilot: AGENT, "body/message": input }, authentication: AUTH },
                    limit: { timeout: "PT5M" },
                    runAfter: ok("Count_attempt"),
                  },
                  // an agent that fails or times out leaves 'AGENT_FAILED': not JSON → safe reading below
                  Keep_answer: { type: "SetVariable", inputs: { name: "Answer", value: "@{if(equals(actions('Agent_reads_the_email')?['status'], 'Succeeded'), coalesce(body('Agent_reads_the_email')?['lastResponse'], ''), 'AGENT_FAILED')}" }, runAfter: { Agent_reads_the_email: ["Succeeded", "Failed", "TimedOut"] } },
                  Wait_on_rate_limit: iff({ and: [{ contains: ["@variables('Answer')", "RateLimitReached"] }, { less: ["@variables('Attempt')", 5] }] },
                    { Wait_a_minute: { type: "Wait", inputs: { interval: { count: 1, unit: "Minute" } } } }, {}, ok("Keep_answer")),
                },
              },
              Reading: compose(`@if(startsWith(${answer}, '{'), ${answer}, if(contains(${answer}, 'ContentFiltered'), '${BLOCKED}', '${SAFE}'))`, ok("Ask_until_answered")),
              Store_reading: dv("UpdateOnlyRecord", {
                entityName: S.crl_inboundemail, recordId: `@${t("crl_inboundemailid")}`,
                "item/crl_agentoutput": "@{outputs('Reading')}", "item/crl_status": OPT.email.read,
                "item/crl_error": `@{if(startsWith(${answer}, '{'), null, concat(if(contains(${answer}, 'ContentFiltered'), 'Refused by the content filter, routed to security: ', 'Agent answer was not JSON, safe reading used: '), substring(${answer}, 0, min(length(${answer}), 500))))}`,
              }, ok("Reading")),
            },
            {
              // recorded reading (evaluation replay): the reading is already on the row
              Reading_on_record: dv("UpdateOnlyRecord", { entityName: S.crl_inboundemail, recordId: `@${t("crl_inboundemailid")}`, "item/crl_status": OPT.email.read }),
            }),
        }, ok("Automated_mail")),
    },
  );
}

// ================================================================== CRL-02 Decide and reply
export function decideAndReply(S) {
  const A = "outputs('Agent_reading')";
  const lang = `coalesce(${A}?['language'], 'unknown')`;
  const intent = `coalesce(${A}?['intent'], 'unknown')`;
  const conf = `float(coalesce(${A}?['confidence'], 0))`;
  const min = p("confidence");
  const injection = `or(equals(${A}?['blocked'], true), greater(length(coalesce(${A}?['instructionSignals'], json('[]'))), 0))`;
  const sender = `toLower(coalesce(${t("crl_from")}, ''))`;
  const domain = `last(split(${sender}, '@'))`;
  const freemail = `contains(split(toLower(${p("freemail")}), ','), ${domain})`;
  const dmarcPass = `equals(toLower(coalesce(${t("crl_dmarc")}, '')), 'pass')`;
  const refs = "body('References')";
  const nrefs = `length(${refs})`;
  const inScope = `contains(createArray('wismo', 'pod'), ${intent})`;
  const inRange = `and(greater(${nrefs}, 0), lessOrEquals(${nrefs}, ${p("maxRefs")}))`;
  const now = `if(empty(${p("clock")}), utcNow(), ${p("clock")})`;
  const STATUS = `json('${JSON.stringify(Object.fromEntries(Object.entries(OPT.status).map(([k, v]) => [String(v), k])))}')`;

  // reference normalisation, like fromAgentOutput()/extractReferences() in src/text.mjs
  const raw = "toUpper(string(item()?['value']))";
  const squeeze = (x) => `replace(replace(replace(replace(${x}, ' ', ''), '-', ''), ':', ''), '#', '')`;
  const shipDigits = squeeze(`replace(${raw}, 'CL', '')`);
  const cust = squeeze(raw);
  const custLen = `if(or(startsWith(${cust}, 'ORD'), startsWith(${cust}, 'REF'), startsWith(${cust}, 'BST'), startsWith(${cust}, 'CMD')), 3, 2)`;
  const normValue = `if(equals(item()?['type'], 'shipment'), if(equals(length(${shipDigits}), 11), concat('CL-', substring(${shipDigits}, 0, 4), '-', substring(${shipDigits}, 4, 7)), ${raw}),
    if(equals(item()?['type'], 'cmr'), ${squeeze(`replace(${raw}, 'CMR', '')`)}, concat(substring(${cust}, 0, ${custLen}), ' ', substring(${cust}, ${custLen}))))`.replace(/\s*\n\s*/g, " ");

  // inside the look-up loop
  const s = "first(outputs('Find_shipment')?['body/value'])";
  const found = `not(equals(${s}, null))`;
  const st = `${STATUS}?[string(${s}?['crl_status'])]`;
  const level = `if(not(${dmarcPass}), 'none',
    if(greater(length(body('Contact_of_this_account')), 0), 'contact',
    if(and(not(${freemail}), contains(split(toLower(coalesce(first(body('Account_of_this_shipment'))?['crl_domains'], '')), ','), ${domain})), 'domain',
    if(equals(toLower(coalesce(${s}?['crl_consigneeemail'], '')), ${sender}), 'consignee', 'none'))))`.replace(/\s*\n\s*/g, " ");
  const hoursSince = `div(float(sub(ticks(${now}), ticks(${s}?['crl_lasteventat']))), 36000000000.0)`;
  const shipRules = [
    when(`and(equals(${intent}, 'pod'), equals(${st}, 'DELIVERED'), not(equals(outputs('Level'), 'contact')))`, "R12", "draft", null, `concat('POD asked by ', outputs('Level'), ' for ', ${s}?['crl_shipmentno'])`),
    when(`and(equals(${intent}, 'pod'), not(equals(${st}, 'DELIVERED')), not(equals(${st}, 'EXCEPTION')))`, "R17", "auto", null, `concat(${s}?['crl_shipmentno'], ' not delivered yet: status instead of POD')`),
    when(`equals(${st}, 'EXCEPTION')`, "R13", "route", "customer-service", `concat(${s}?['crl_shipmentno'], ': ', coalesce(${s}?['crl_exceptioncode'], ''))`),
    // and() evaluates every argument; if() does not, so null dates are guarded with if()
    when(`if(or(not(contains(createArray('PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'), ${st})), equals(${s}?['crl_lasteventat'], null)), false, greater(${hoursSince}, ${p("stale")}))`, "R14", "draft", null, `concat(${s}?['crl_shipmentno'], ': last event ', if(equals(${s}?['crl_lasteventat'], null), '?', string(${hoursSince})), ' h ago')`),
    when(`if(or(equals(${s}?['crl_etato'], null), equals(${s}?['crl_promisedto'], null), equals(${st}, 'DELIVERED')), false, greater(ticks(${s}?['crl_etato']), ticks(${s}?['crl_promisedto'])))`, "R15", "draft", null, `concat(${s}?['crl_shipmentno'], ': ETA ends after the promised slot')`),
  ];

  // after the loop
  const L = "variables('Lookups')";
  const nFound = "length(body('Found'))", nAllowed = "length(body('Allowed'))", nNone = "length(body('Not_allowed'))", nMissing = "length(body('Missing'))";
  const knownContact = `and(${dmarcPass}, greater(length(outputs('Sender_as_contact')?['body/value']), 0))`;
  const outOfScope = `json('{"slot_change":"planning","invoice":"finance","cancel":"customer-service"}')?[${intent}]`;
  const general = [
    when(injection, "R02", "route", "security", "'the email tries to instruct the system or redirect data'"),
    when(`and(not(equals(${outOfScope}, null)), greaterOrEquals(${conf}, ${min}))`, "R04", "route", null, `concat('intent ', ${intent})`).replace("'queue', null", `'queue', ${outOfScope}`),
    when(`less(${conf}, ${min})`, "R05", "draft", null, `concat('intent ', ${intent}, ', confidence ', string(${conf}))`),
    when(`not(contains(createArray('nl', 'fr', 'en'), ${lang}))`, "R06", "draft", null, `concat('language ', ${lang})`),
    when(`and(equals(${nrefs}, 0), ${inScope}, greaterOrEquals(${conf}, ${min}))`, "R07", "auto", null, "'no usable reference'"),
    when(`greater(${nrefs}, ${p("maxRefs")})`, "R09", "draft", null, `concat(string(${nrefs}), ' references')`),
    when(`and(${inRange}, equals(${A}?['referencesFromQuoted'], true))`, "R08", "draft", null, "'reference only in the quoted thread'"),
    when(`and(${inRange}, equals(${nAllowed}, 0), equals(${nFound}, 0), ${knownContact})`, "R10", "draft", null, "'not found; sender is a registered contact'"),
    when(`and(${inRange}, equals(${nAllowed}, 0), equals(${nFound}, 0), not(${knownContact}))`, "R10", "auto", null, "'not found; generic reply'"),
    when(`and(${inRange}, equals(${nAllowed}, 0), greater(${nFound}, 0))`, "R11", "auto", null, "'sender not authorised'"),
    when(`and(${inRange}, greater(${nAllowed}, 0), greater(${nMissing}, 0))`, "R10", "draft", null, `concat(string(${nMissing}), ' of ', string(${nrefs}), ' references not found')`),
    when(`and(${inRange}, greater(${nAllowed}, 0), greater(${nNone}, 0))`, "R11", "draft", null, "'not authorised for one of the shipments'"),
    when(`greater(coalesce(${t("crl_autorepliestoday")}, 0), ${p("maxAuto")})`, "R16", "draft", null, `concat(string(${t("crl_autorepliestoday")}), ' automatic replies already today')`),
  ];
  const F = "outputs('Findings')";
  const has = (effect) => `contains(string(${F}), '"effect":"${effect}"')`;
  const strongest = `if(${has("ignore")}, 'ignore', if(${has("route")}, 'route', if(${has("draft")}, 'draft', if(and(equals(length(${F}), 0), equals(${nAllowed}, 0)), 'draft', 'auto'))))`;
  const draftOnly = `and(equals(outputs('Strongest'), 'auto'), equals(${MODE}, 'draft-only'))`;
  const action = `if(${draftOnly}, 'draft', outputs('Strongest'))`;
  const queues = ["security", "team-lead", "claims", "customer-service", "planning", "finance"];
  const routeQ = (q) => `contains(string(${F}), '"effect":"route","queue":"${q}"')`;
  const queue = `if(equals(outputs('Action'), 'route'), ${queues.reduceRight((acc, q) => `if(${routeQ(q)}, '${q}', ${acc})`, "null")}, null)`;
  const fired = (id, effect) => `contains(string(${F}), '"id":"${id}","effect":"${effect}"')`;
  const anyDelivered = `contains(string(body('Allowed')), '"status":"DELIVERED"')`;
  const template = `if(${fired("R07", "auto")}, 'clarify', if(or(${fired("R10", "auto")}, ${fired("R11", "auto")}), 'generic', if(and(equals(${intent}, 'pod'), ${anyDelivered}), 'pod', 'status')))`;
  const answerable = `or(contains(createArray('clarify', 'generic'), outputs('Template')), greater(${nAllowed}, 0))`;

  // reply text, like compose() in src/compose.mjs, from the template row of the reply language
  const T = "outputs('Templates')";
  // .NET writes Dutch month abbreviations with a period ("okt."), Intl in src/compose.mjs without ("okt")
  const day = (x) => `if(equals(${T}?['locale'], 'nl-BE'), replace(formatDateTime(convertFromUtc(${x}, 'Romance Standard Time'), 'ddd d MMM', 'nl-BE'), '.', ''), formatDateTime(convertFromUtc(${x}, 'Romance Standard Time'), 'ddd d MMM', ${T}?['locale']))`;
  const time = (x) => `formatDateTime(convertFromUtc(${x}, 'Romance Standard Time'), 'HH:mm')`;
  const at = (x) => `concat(${day(x)}, ' ', ${T}?['at'], ' ', ${time(x)})`;
  const sh = (f) => `item()?['shipment']?['${f}']`;
  const win = `concat(${day(sh("etaFrom"))}, ' ', ${T}?['between'], ' ', ${time(sh("etaFrom"))}, ' ', ${T}?['and'], ' ', if(equals(${day(sh("etaFrom"))}, ${day(sh("etaTo"))}), ${time(sh("etaTo"))}, concat(${day(sh("etaTo"))}, ' ', ${time(sh("etaTo"))})))`;
  const safe = (f, expr) => `if(equals(${sh(f)}, null), '', ${expr})`;
  const fill = (text) => `replace(replace(replace(replace(replace(replace(replace(${text}, '{id}', ${sh("id")}), '{customerReference}', coalesce(${sh("customerReference")}, '')), '{pickupDay}', ${safe("pickupDate", day(sh("pickupDate")))}), '{lastEventAt}', ${safe("lastEventAt", at(sh("lastEventAt")))}), '{lastEventLocation}', coalesce(${sh("lastEventLocation")}, '')), '{eta}', ${safe("etaTo", win)}), '{deliveredAt}', ${safe("deliveredAt", at(sh("deliveredAt")))})`;
  const line = `concat(${fill(`if(empty(coalesce(${sh("customerReference")}, '')), ${T}?['ref'], ${T}?['refCustomer'])`)}, ' ', ${fill(`coalesce(${T}?[${sh("status")}], '')`)})`;
  const podPart = `if(equals(outputs('Template'), 'pod'), concat(decodeUriComponent('%0A'), if(equals(${sh("status")}, 'DELIVERED'), concat(${T}?['podIntro'], decodeUriComponent('%0A'), 'https://portal.corlaan.example/pod/', ${sh("id")}), ${T}?['podNotYet'])), '')`;
  const NL = "decodeUriComponent('%0A')";
  const body = `if(equals(outputs('Template'), 'clarify'), ${T}?['clarify'], if(equals(outputs('Template'), 'generic'), ${T}?['generic'], join(body('Status_lines'), concat(${NL}, ${NL}))))`;
  const text = `concat(${T}?['hello'], ${NL}, ${NL}, ${body}, ${NL}, ${NL}, ${T}?['bye'], ${NL}, ${NL}, '— ', ${T}?['footer'])`;
  const replyLang = `if(contains(createArray('nl', 'fr', 'en'), ${lang}), ${lang}, 'en')`;

  const shipmentFields = `addProperty(addProperty(addProperty(addProperty(addProperty(addProperty(addProperty(addProperty(addProperty(addProperty(json('{}'),
    'id', ${s}?['crl_shipmentno']), 'status', ${st}), 'customerReference', ${s}?['crl_customerref']), 'pickupDate', ${s}?['crl_pickupdate']), 'lastEventAt', ${s}?['crl_lasteventat']),
    'lastEventLocation', ${s}?['crl_lasteventlocation']), 'etaFrom', ${s}?['crl_etafrom']), 'etaTo', ${s}?['crl_etato']), 'deliveredAt', ${s}?['crl_deliveredat']), 'accountId', ${s}?['_crl_account_value'])`.replace(/\s*\n\s*/g, " ");

  return definition(
    { Email_read: trigger("crl_inboundemail", 3, { "subscriptionRequest/filteringattributes": "crl_status", "subscriptionRequest/filterexpression": `crl_status eq ${OPT.email.read}` }) },
    {
      Read_mode: readMode(),
      Agent_reading: compose(`@json(coalesce(${t("crl_agentoutput")}, '{}'))`, ok("Read_mode")),
      References: { type: "Select", inputs: { from: `@coalesce(${A}?['references'], json('[]'))`, select: { type: "@item()?['type']", value: `@${normValue}` } }, runAfter: ok("Agent_reading") },
      Lookups_init: init("Lookups", "array", [], ok("References")),
      Shipment_findings_init: init("ShipmentFindings", "array", [], ok("Lookups_init")),
      Accounts: dv("ListRecords", { entityName: S.crl_customeraccount, $select: "crl_customeraccountid,crl_code,crl_domains" }, ok("Shipment_findings_init")),
      Contacts: dv("ListRecords", { entityName: S.crl_customercontact, $select: "crl_email,_crl_account_value" }, ok("Accounts")),
      Sender_as_contact: dv("ListRecords", { entityName: S.crl_customercontact, $filter: `crl_email eq '@{replace(${sender}, '''', '''''')}'`, $top: 1 }, ok("Contacts")),
      Accounts_in_scope: { type: "Query", inputs: { from: "@outputs('Accounts')?['body/value']", where: `@and(not(${freemail}), contains(split(toLower(coalesce(item()?['crl_domains'], '')), ','), ${domain}))` }, runAfter: ok("Sender_as_contact") },
      Scope_terms: { type: "Select", inputs: { from: "@body('Accounts_in_scope')", select: "@concat('_crl_account_value eq ', item()?['crl_customeraccountid'])" }, runAfter: ok("Accounts_in_scope") },
      Scope_filter: compose(`@if(empty(body('Scope_terms')), '_crl_account_value eq 00000000-0000-0000-0000-000000000000', join(body('Scope_terms'), ' or '))`, ok("Scope_terms")),
      Look_up_references: iff({ and: [{ greater: [`@${nrefs}`, 0] }, { lessOrEquals: [`@${nrefs}`, `@${p("maxRefs")}`] }] }, {
        For_each_reference: {
          type: "Foreach", foreach: `@${refs}`, runtimeConfiguration: { concurrency: { repetitions: 1 } },
          actions: {
            Find_shipment: dv("ListRecords", {
              entityName: S.crl_shipment, $top: 1,
              $filter: `@{if(equals(item()?['type'], 'shipment'), concat('crl_shipmentno eq ''', item()?['value'], ''''), if(equals(item()?['type'], 'cmr'), concat('crl_cmr eq ''', item()?['value'], ''''), concat('crl_customerref eq ''', item()?['value'], ''' and (', outputs('Scope_filter'), ')')))}`,
            }),
            Account_of_this_shipment: { type: "Query", inputs: { from: "@outputs('Accounts')?['body/value']", where: `@equals(item()?['crl_customeraccountid'], ${s}?['_crl_account_value'])` }, runAfter: ok("Find_shipment") },
            Contact_of_this_account: { type: "Query", inputs: { from: "@outputs('Contacts')?['body/value']", where: `@and(equals(item()?['_crl_account_value'], ${s}?['_crl_account_value']), equals(toLower(item()?['crl_email']), ${sender}))` }, runAfter: ok("Account_of_this_shipment") },
            Level: compose(`@if(${found}, ${level}, 'none')`, ok("Contact_of_this_account")),
            Record_lookup: append("Lookups", `@addProperty(addProperty(addProperty(json('{}'), 'ref', items('For_each_reference')?['value']), 'found', ${found}), 'level', outputs('Level'))`, ok("Level")),
            When_allowed: iff({ and: [{ equals: [`@${found}`, true] }, { not: { equals: ["@outputs('Level')", "none"] } }] }, {
              Shipment_record: append("Lookups", `@addProperty(addProperty(json('{}'), 'shipment', ${shipmentFields}), 'allowed', true)`),
              Shipment_rules: compose(`@union(${shipRules.join(", ")})`, ok("Shipment_record")),
              For_each_shipment_finding: { type: "Foreach", foreach: "@outputs('Shipment_rules')", actions: { Add_shipment_finding: append("ShipmentFindings", "@item()") }, runAfter: ok("Shipment_rules") },
            }, {}, ok("Record_lookup")),
          },
        },
      }, {}, ok("Scope_filter")),
      Found: { type: "Query", inputs: { from: `@${L}`, where: "@equals(item()?['found'], true)" }, runAfter: ok("Look_up_references") },
      Allowed_lookups: { type: "Query", inputs: { from: `@${L}`, where: "@equals(item()?['allowed'], true)" }, runAfter: ok("Found") },
      Allowed: { type: "Select", inputs: { from: "@body('Allowed_lookups')", select: "@item()?['shipment']" }, runAfter: ok("Allowed_lookups") },
      Allowed_ids: { type: "Select", inputs: { from: "@body('Allowed')", select: "@item()?['id']" }, runAfter: ok("Allowed") },
      Not_allowed: { type: "Query", inputs: { from: "@body('Found')", where: "@equals(item()?['level'], 'none')" }, runAfter: ok("Allowed_ids") },
      Missing: { type: "Query", inputs: { from: `@${L}`, where: "@and(equals(item()?['found'], false), not(equals(item()?['ref'], null)))" }, runAfter: ok("Not_allowed") },
      Sensitive_findings: { type: "Select", inputs: { from: `@coalesce(${A}?['sensitive'], json('[]'))`, select: `@${finding("R03", "route", null, "concat('sensitive: ', item())").replace("'queue', null", "'queue', if(or(equals(item(), 'damage'), equals(item(), 'dispute')), 'claims', 'team-lead')")}` }, runAfter: ok("Missing") },
      Findings: compose(`@union(${general.join(", ")}, body('Sensitive_findings'), variables('ShipmentFindings'))`, ok("Sensitive_findings")),
      Strongest: compose(`@${strongest}`, ok("Findings")),
      Action: compose(`@${action}`, ok("Strongest")),
      All_findings: compose(`@if(${draftOnly}, union(${F}, createArray(${finding("R18", "draft", null, "'pilot runs in draft-only mode'")})), ${F})`, ok("Action")),
      Rule_ids: { type: "Select", inputs: { from: "@outputs('All_findings')", select: "@item()?['id']" }, runAfter: ok("All_findings") },
      Queue: compose(`@${queue}`, ok("Rule_ids")),
      Template: compose(`@${template}`, ok("Queue")),
      Templates_row: dv("ListRecords", { entityName: S.crl_replytemplate, $filter: `crl_language eq '@{${replyLang}}'`, $top: 1 }, ok("Template")),
      Templates: compose("@json(first(outputs('Templates_row')?['body/value'])?['crl_templates'])", ok("Templates_row")),
      Status_lines: { type: "Select", inputs: { from: "@body('Allowed_lookups')", select: `@concat(${line}, ${podPart})` }, runAfter: ok("Templates") },
      Reply_text: compose(`@${text}`, ok("Status_lines")),
      Save_decision: dv("UpdateOnlyRecord", {
        entityName: S.crl_inboundemail, recordId: `@${t("crl_inboundemailid")}`,
        "item/crl_status": OPT.email.decided,
        "item/crl_action": `@json('${JSON.stringify(OPT.action)}')?[outputs('Action')]`,
        "item/crl_template": `@{if(contains(createArray('route', 'ignore'), outputs('Action')), null, outputs('Template'))}`,
        "item/crl_queue": "@{outputs('Queue')}",
        "item/crl_rules": "@{join(sort(union(body('Rule_ids'), body('Rule_ids'))), ',')}",
        "item/crl_findings": "@{string(outputs('All_findings'))}",
        "item/crl_shipments": "@{join(body('Allowed_ids'), ',')}",
        "item/crl_language": `@{${lang}}`, "item/crl_intent": `@{${intent}}`, "item/crl_confidence": `@${conf}`,
      }, ok("Reply_text")),
      Reply_needed: iff({ and: [{ or: [{ equals: ["@outputs('Action')", "auto"] }, { equals: ["@outputs('Action')", "draft"] }] }, { equals: [`@${answerable}`, true] }] }, {
        Create_reply: dv("CreateRecord", {
          entityName: S.crl_reply,
          "item/crl_Inboundemail@odata.bind": `@{concat('/${S.crl_inboundemail}(', ${t("crl_inboundemailid")}, ')')}`,
          "item/crl_to": `@{${sender}}`,
          "item/crl_subject": `@{concat('RE: ', coalesce(${t("crl_subject")}, ''))}`,
          "item/crl_text": "@{outputs('Reply_text')}",
          "item/crl_language": `@{${replyLang}}`,
          "item/crl_status": `@if(equals(outputs('Action'), 'auto'), ${OPT.reply.sent}, ${OPT.reply.review})`,
          "item/crl_heldby": "@{if(equals(outputs('Action'), 'draft'), join(sort(union(body('Rule_ids'), body('Rule_ids'))), ','), '')}",
        }),
      }, {}, ok("Save_decision")),
      Decision_failed: dv("UpdateOnlyRecord", {
        entityName: S.crl_inboundemail, recordId: `@${t("crl_inboundemailid")}`,
        "item/crl_status": OPT.email.error, "item/crl_error": "The decision flow failed; see the run history. Nothing was sent.",
      }, { Save_decision: ["Failed", "Skipped", "TimedOut"] }),
    },
    params("confidence", "stale", "maxRefs", "maxAuto", "clock", "freemail"),
  );
}

// ================================================================== CRL-03 Review draft
export function reviewDraft(S) {
  const r = (c) => `triggerOutputs()?['body/${c}']`;
  return definition(
    { Draft_created: trigger("crl_reply", 1, { "subscriptionRequest/filterexpression": `crl_status eq ${OPT.reply.review}` }) },
    {
      Review: {
        type: "OpenApiConnectionWebhook",
        inputs: {
          host: { connectionName: "shared_approvals", operationId: "StartAndWaitForAnApproval", apiId: APAPI },
          parameters: {
            approvalType: "Basic",
            "WebhookApprovalCreationInput/title": `@{concat('Reply held (', ${r("crl_heldby")}, '): ', ${r("crl_subject")})}`,
            "WebhookApprovalCreationInput/assignedTo": `@${p("reviewer")}`,
            "WebhookApprovalCreationInput/details": `@{concat('To: ', ${r("crl_to")}, decodeUriComponent('%0A%0A'), 'Held by rules ', ${r("crl_heldby")}, ' (see docs/02-design/policy-rules.md). Approve to send this reply as it is; reject to answer yourself.', decodeUriComponent('%0A%0A'), '---', decodeUriComponent('%0A%0A'), ${r("crl_text")})}`,
            "WebhookApprovalCreationInput/enableNotifications": true,
            "WebhookApprovalCreationInput/enableReassignment": true,
          },
          authentication: AUTH,
        },
      },
      Record_review: dv("UpdateOnlyRecord", {
        entityName: S.crl_reply, recordId: `@${r("crl_replyid")}`,
        "item/crl_status": `@if(equals(body('Review')?['outcome'], 'Approve'), ${OPT.reply.approved}, ${OPT.reply.rejected})`,
        "item/crl_reviewedby": "@{first(body('Review')?['responses'])?['responder']?['email']}",
        "item/crl_reviewedon": "@{first(body('Review')?['responses'])?['responseDate']}",
        "item/crl_reviewcomment": "@{first(body('Review')?['responses'])?['comments']}",
      }, ok("Review")),
    },
    params("reviewer"),
  );
}

export const FLOWS = [
  { name: "CRL-01 Read inbound email", description: "Screens automated mail (R01) and lets the Copilot Studio agent Corlaan Mail Reader read the email. The agent has no tools: it only returns JSON.", build: readEmail },
  { name: "CRL-02 Decide and reply", description: "TMS look-ups in the sandbox tables, authorisation per shipment, policy rules R02–R18 and a reply from approved templates. Mirrors runGuarded() in src/pipeline.mjs.", build: decideAndReply },
  { name: "CRL-03 Review draft", description: "Sends a held reply to a colleague (Approvals). Approve = send as is; reject = the colleague answers.", build: reviewDraft },
];
