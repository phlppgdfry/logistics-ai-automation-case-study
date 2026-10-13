// Text understanding for inbound customer emails.
//
// In production this step is done by a Copilot Studio agent (language model) that returns the
// JSON described in copilot-studio/agent-output.schema.json. This module is a deterministic
// stand-in with the same output shape, so the policy around it can be tested and demonstrated
// without a model. Keyword lists are intentionally small and readable; they are not the point.

const STOPWORDS = {
  nl: ["de", "het", "een", "mijn", "onze", "waar", "is", "niet", "nog", "wanneer", "levering", "bestelling", "zending", "graag", "alvast", "bedankt", "dank", "kunnen", "jullie", "van", "en", "ik", "wij", "we", "u", "uw", "met", "vriendelijke", "groeten"],
  fr: ["le", "la", "les", "mon", "ma", "notre", "nos", "où", "est", "pas", "encore", "quand", "livraison", "commande", "envoi", "merci", "bonjour", "vous", "nous", "de", "du", "des", "et", "pour", "cordialement", "pouvez"],
  en: ["the", "my", "our", "where", "is", "not", "yet", "when", "delivery", "order", "shipment", "please", "thanks", "thank", "hello", "you", "we", "can", "could", "of", "and", "for", "kind", "regards"],
  de: ["der", "die", "das", "und", "wo", "ist", "meine", "unsere", "lieferung", "sendung", "bitte", "danke", "noch", "nicht", "wann", "grüße", "freundlichen", "mit", "sie", "wir"],
};

export const SUPPORTED_LANGUAGES = ["nl", "fr", "en"];

export function detectLanguage(text) {
  const words = (text.toLowerCase().match(/[a-zà-öø-ÿ]+/g) || []);
  let best = "unknown";
  let bestScore = 0;
  for (const [lang, list] of Object.entries(STOPWORDS)) {
    const set = new Set(list);
    const score = words.filter((w) => set.has(w)).length;
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  return best;
}

// --- Separate the new message from quoted or forwarded history -----------------------------------

const QUOTE_START = [
  /^>/,
  /^-{2,}\s*(original message|oorspronkelijk bericht|message d'origine|forwarded message|doorgestuurd bericht|message transféré)/i,
  /^(from|van|de|von)\s?:\s.*@/i,
  /^op .+ schreef .+:\s*$/i,
  /^le .+ a écrit\s*:\s*$/i,
  /^on .+ wrote:\s*$/i,
];

export function splitQuoted(body) {
  const lines = body.split(/\r?\n/);
  const cut = lines.findIndex((line) => QUOTE_START.some((re) => re.test(line.trim())));
  if (cut === -1) return { fresh: body.trim(), quoted: "" };
  return { fresh: lines.slice(0, cut).join("\n").trim(), quoted: lines.slice(cut).join("\n").trim() };
}

// --- Automated mail (out-of-office, bounces, newsletters) -----------------------------------------

export function automatedMailReason(email) {
  const h = Object.fromEntries(Object.entries(email.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]));
  if (h["auto-submitted"] && h["auto-submitted"] !== "no") return `Auto-Submitted: ${h["auto-submitted"]}`;
  if (["bulk", "list", "junk"].includes(h.precedence)) return `Precedence: ${h.precedence}`;
  if (h["list-unsubscribe"]) return "List-Unsubscribe header (newsletter)";
  if (/^(mailer-daemon|postmaster|no-?reply)@/i.test(email.from)) return `system sender ${email.from}`;
  if (/^(automatic reply|automatisch antwoord|afwezig|absence|réponse automatique|out of office|abwesenheit)/i.test(email.subject)) {
    return "out-of-office subject";
  }
  return null;
}

// --- Instructions aimed at the system, or requests to send data elsewhere -------------------------

const INJECTION = [
  /ignore (all |any )?(the )?(previous|prior|above|earlier) instructions/i,
  /negeer (alle |de )?(vorige |voorgaande |eerdere )?instructies/i,
  /ignorez (toutes )?(les )?(instructions|consignes)/i,
  /system ?prompt|systeemprompt/i,
  /\b(you are now|je bent nu|vous êtes maintenant)\b/i,
  /(send|stuur|envoyez|forward|transférez).{0,40}\b(all|alle|toutes les|tous les|every)\b.{0,30}(shipments|orders|addresses|zendingen|leveringen|bestellingen|adressen|envois|commandes|adresses)/i,
  /(also send|forward (this|the|your) (reply|answer|email) to|stuur (dit|het|de) .{0,30}ook naar|envoyez .{0,30}aussi à)/i,
];

export function injectionSignals(text) {
  return INJECTION.filter((re) => re.test(text)).map((re) => re.source);
}

// --- Intent ----------------------------------------------------------------------------------------

const INTENTS = {
  wismo: [
    /waar blijft/, /waar (is|zijn)/, /wanneer (wordt|komt|komen|wordt er)/, /nog niet (geleverd|aangekomen|toegekomen)/, /\bstatus\b/, /\btrack/, /\bvolgen\b/, /verwacht/,
    /où en est/, /où (est|sont)/, /pas encore (été )?livr/, /\bquand\b/, /\bstatut\b/, /\bsuivi\b/,
    /where (is|are)/, /not (yet )?(been )?delivered/, /when will/, /\beta\b/, /expected/, /been delivered/, /tracking/,
  ],
  pod: [
    /afleverbewijs/, /leveringsbewijs/, /\bpod\b/, /getekende (cmr|leverbon)/, /handtekening/,
    /preuve de livraison/, /bon (de livraison )?signé/, /cmr signé/,
    /proof of delivery/, /signed (cmr|delivery note)/,
  ],
  slot_change: [
    /ander(e)? (dag|tijdslot|moment)/, /verplaats/, /uitstellen/, /nieuw tijdslot/,
    /changer (le|de) créneau/, /reporter la livraison/, /\bdécaler\b/,
    /reschedule/, /another day/, /change the (delivery )?slot/, /instead of/,
  ],
  invoice: [/factuur/, /creditnota/, /facture/, /\bavoir\b/, /invoice/, /credit note/],
  cancel: [/annuleren/, /annuleer/, /annuler/, /\bcancel/],
};

const SENSITIVE = {
  damage: [/beschadigd/, /\bschade\b/, /kapot/, /endommag/, /\bcassé/, /damaged/, /broken/],
  dispute: [/niet ontvangen/, /nooit (aangekomen|ontvangen)/, /pas reçu/, /jamais reçu/, /not received/, /never (arrived|received)/, /did ?n[o']t receive/, /have not received/],
  legal: [/advocaat/, /ingebrekestelling/, /juridisch/, /avocat/, /mise en demeure/, /juridique/, /lawyer/, /legal action/, /solicitor/],
  anger: [/onaanvaardbaar/, /schandalig/, /derde keer/, /inacceptable/, /scandaleux/, /troisième fois/, /unacceptable/, /third time/, /ridiculous/],
};

export const IN_SCOPE_INTENTS = ["wismo", "pod"];

function hits(text, patterns) {
  return patterns.filter((re) => re.test(text)).length;
}

export function classify(text) {
  const t = text.toLowerCase();
  const scores = Object.fromEntries(Object.entries(INTENTS).map(([intent, list]) => [intent, hits(t, list)]));
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topIntent, top] = ranked[0];
  const second = ranked[1][1];
  let intent = topIntent;
  let confidence;
  if (top === 0) {
    intent = "unknown";
    confidence = 0.3;
  } else if (top === second) {
    confidence = 0.55; // two intents equally present: a person should read it
  } else {
    confidence = top >= 2 ? 0.93 : 0.81;
  }
  const sensitive = Object.entries(SENSITIVE).filter(([, list]) => hits(t, list) > 0).map(([kind]) => kind);
  return { intent, confidence, scores, sensitive };
}

// --- References ------------------------------------------------------------------------------------

const RE_SHIPMENT = /\bCL[-\s]?(20\d{2})[-\s]?(\d{7})\b/gi;
const RE_CMR = /\bCMR[\s:#-]*(\d{7})\b/gi;
const RE_CUSTOMER = /\b(PO|BO|ORD|REF|BST|CMD)[\s:#-]?(\d{4,8})\b/g;

export function extractReferences(text) {
  const refs = [];
  for (const m of text.matchAll(RE_SHIPMENT)) refs.push({ type: "shipment", value: `CL-${m[1]}-${m[2]}` });
  for (const m of text.matchAll(RE_CMR)) refs.push({ type: "cmr", value: m[1] });
  for (const m of text.matchAll(RE_CUSTOMER)) refs.push({ type: "customer", value: `${m[1].toUpperCase()} ${m[2]}` });
  const seen = new Set();
  return refs.filter((r) => {
    const key = `${r.type}:${r.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// One call that produces what the agent would return (see copilot-studio/agent-output.schema.json).
export function understand(email) {
  const { fresh, quoted } = splitQuoted(email.body);
  const freshText = `${email.subject}\n${fresh}`;
  const cls = classify(freshText);
  let references = extractReferences(freshText);
  let referencesFromQuoted = false;
  if (references.length === 0 && quoted) {
    references = extractReferences(quoted);
    referencesFromQuoted = references.length > 0;
  }
  return {
    language: detectLanguage(freshText),
    intent: cls.intent,
    confidence: cls.confidence,
    intentScores: cls.scores,
    sensitive: cls.sensitive,
    references,
    referencesFromQuoted,
    injection: injectionSignals(`${email.subject}\n${email.body}`),
    automated: automatedMailReason(email),
    freshText: fresh,
  };
}

// The same reading in the shape the Copilot Studio agent returns (copilot-studio/agent-output.schema.json).
export function toAgentOutput(u) {
  return {
    language: u.language,
    intent: u.intent,
    confidence: u.confidence,
    references: u.references,
    referencesFromQuoted: u.referencesFromQuoted,
    sensitive: u.sensitive,
    instructionSignals: u.injection,
  };
}
