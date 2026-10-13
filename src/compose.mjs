// Reply templates. Every fact in an automatic reply comes from a TMS field; the model never
// writes free text that goes to a customer (ADR-003). `facts` lists what was used, so tests can
// check that nothing else is in the reply.

const TZ = "Europe/Brussels";
const LOCALE = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };
export const PORTAL = "https://portal.corlaan.example";

function day(iso, lang) {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}
function time(iso, lang) {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function windowText(w, lang) {
  const sameDay = day(w.from, lang) === day(w.to, lang);
  const to = sameDay ? time(w.to, lang) : `${day(w.to, lang)} ${time(w.to, lang)}`;
  const between = { nl: ["tussen", "en"], fr: ["entre", "et"], en: ["between", "and"] }[lang];
  return `${day(w.from, lang)} ${between[0]} ${time(w.from, lang)} ${between[1]} ${to}`;
}
function when(iso, lang) {
  const at = { nl: "om", fr: "à", en: "at" }[lang];
  return `${day(iso, lang)} ${at} ${time(iso, lang)}`;
}

const T = {
  nl: {
    hello: "Beste,",
    bye: "Met vriendelijke groeten,\nKlantendienst Corlaan Logistics",
    footer: "Dit antwoord werd automatisch opgesteld uit ons transportsysteem. Antwoord gewoon op deze mail om een collega te bereiken.",
    ref: (s) => `Uw zending ${s.id}${s.customerReference ? ` (uw referentie ${s.customerReference})` : ""}`,
    BOOKED: (s, l) => `staat gepland voor ophaling op ${day(s.pickupDate, l)}. Verwachte levering: ${windowText(s.eta, l)}.`,
    PICKED_UP: (s, l) => `werd opgehaald (${when(s.lastEvent.at, l)}). Verwachte levering: ${windowText(s.eta, l)}.`,
    IN_TRANSIT: (s, l) => `is onderweg. Laatste update: ${s.lastEvent.location}, ${when(s.lastEvent.at, l)}. Verwachte levering: ${windowText(s.eta, l)}.`,
    OUT_FOR_DELIVERY: (s, l) => `is vandaag op ronde. Verwachte aankomst: ${windowText(s.eta, l)}.`,
    DELIVERED: (s, l) => `werd geleverd op ${when(s.deliveredAt, l)}.`,
    podIntro: "Het afleverbewijs vindt u via deze beveiligde link (7 dagen geldig):",
    podNotYet: "Het afleverbewijs is beschikbaar zodra de zending geleverd is.",
    clarify: "Bedankt voor uw bericht. Om uw zending snel terug te vinden hebben we het zendingsnummer (bv. CL-2026-0412345), het CMR-nummer of uw eigen orderreferentie nodig. Kunt u een van die nummers bezorgen?",
    generic: `Bedankt voor uw bericht. Om de gegevens van onze klanten te beschermen delen we zendingsinformatie alleen met geregistreerde contactpersonen. U kunt de status volgen via ${PORTAL}, of uw vraag sturen vanaf het e-mailadres dat bij ons gekend is.`,
  },
  fr: {
    hello: "Bonjour,",
    bye: "Cordialement,\nService clientèle Corlaan Logistics",
    footer: "Cette réponse a été préparée automatiquement à partir de notre système de transport. Répondez simplement à ce message pour joindre un collègue.",
    ref: (s) => `Votre envoi ${s.id}${s.customerReference ? ` (votre référence ${s.customerReference})` : ""}`,
    BOOKED: (s, l) => `est planifié pour enlèvement le ${day(s.pickupDate, l)}. Livraison prévue : ${windowText(s.eta, l)}.`,
    PICKED_UP: (s, l) => `a été enlevé (${when(s.lastEvent.at, l)}). Livraison prévue : ${windowText(s.eta, l)}.`,
    IN_TRANSIT: (s, l) => `est en route. Dernière mise à jour : ${s.lastEvent.location}, ${when(s.lastEvent.at, l)}. Livraison prévue : ${windowText(s.eta, l)}.`,
    OUT_FOR_DELIVERY: (s, l) => `est en tournée aujourd'hui. Arrivée prévue : ${windowText(s.eta, l)}.`,
    DELIVERED: (s, l) => `a été livré le ${when(s.deliveredAt, l)}.`,
    podIntro: "Vous trouverez la preuve de livraison via ce lien sécurisé (valable 7 jours) :",
    podNotYet: "La preuve de livraison sera disponible dès que l'envoi sera livré.",
    clarify: "Merci pour votre message. Pour retrouver rapidement votre envoi, nous avons besoin du numéro d'envoi (p. ex. CL-2026-0412345), du numéro CMR ou de votre référence de commande. Pouvez-vous nous communiquer l'un de ces numéros ?",
    generic: `Merci pour votre message. Pour protéger les données de nos clients, nous ne partageons les informations d'envoi qu'avec les contacts enregistrés. Vous pouvez suivre le statut via ${PORTAL}, ou nous écrire depuis l'adresse e-mail connue chez nous.`,
  },
  en: {
    hello: "Hello,",
    bye: "Kind regards,\nCorlaan Logistics Customer Service",
    footer: "This reply was prepared automatically from our transport system. Simply reply to this email to reach a colleague.",
    ref: (s) => `Your shipment ${s.id}${s.customerReference ? ` (your reference ${s.customerReference})` : ""}`,
    BOOKED: (s, l) => `is planned for collection on ${day(s.pickupDate, l)}. Expected delivery: ${windowText(s.eta, l)}.`,
    PICKED_UP: (s, l) => `was collected (${when(s.lastEvent.at, l)}). Expected delivery: ${windowText(s.eta, l)}.`,
    IN_TRANSIT: (s, l) => `is on its way. Last update: ${s.lastEvent.location}, ${when(s.lastEvent.at, l)}. Expected delivery: ${windowText(s.eta, l)}.`,
    OUT_FOR_DELIVERY: (s, l) => `is out for delivery today. Expected arrival: ${windowText(s.eta, l)}.`,
    DELIVERED: (s, l) => `was delivered on ${when(s.deliveredAt, l)}.`,
    podIntro: "You can download the proof of delivery via this secure link (valid for 7 days):",
    podNotYet: "The proof of delivery will be available once the shipment is delivered.",
    clarify: "Thank you for your message. To find your shipment quickly we need the shipment number (e.g. CL-2026-0412345), the CMR number or your own order reference. Could you send one of these?",
    generic: `Thank you for your message. To protect our customers' data we only share shipment information with registered contacts. You can follow the status at ${PORTAL}, or write to us from the email address we have on file.`,
  },
};

export function replyLanguage(lang) {
  return T[lang] ? lang : "en";
}

function factsFor(s, template) {
  const f = [["id", s.id], ["status", s.status]];
  if (s.customerReference) f.push(["customerReference", s.customerReference]);
  if (s.status === "DELIVERED") f.push(["deliveredAt", s.deliveredAt]);
  else f.push(["eta", s.eta]);
  if (s.status === "BOOKED") f.push(["pickupDate", s.pickupDate]);
  if (["PICKED_UP", "IN_TRANSIT"].includes(s.status)) f.push(["lastEvent", s.lastEvent]);
  if (template === "pod" && s.status === "DELIVERED") f.push(["podLink", `${PORTAL}/pod/${s.id}`]);
  return f.map(([field, value]) => ({ shipment: s.id, field, value }));
}

// template: "status" | "pod" | "clarify" | "generic"
export function compose({ template, lang, shipments = [] }) {
  const l = replyLanguage(lang);
  const t = T[l];
  const parts = [t.hello, ""];
  const facts = [];
  if (template === "clarify") parts.push(t.clarify);
  else if (template === "generic") parts.push(t.generic);
  else {
    for (const s of shipments) {
      parts.push(`${t.ref(s)} ${t[s.status](s, l)}`);
      if (template === "pod") {
        parts.push(s.status === "DELIVERED" ? `${t.podIntro}\n${PORTAL}/pod/${s.id}` : t.podNotYet);
      }
      parts.push("");
      facts.push(...factsFor(s, template));
    }
    if (parts[parts.length - 1] === "") parts.pop();
  }
  parts.push("", t.bye, "", `— ${t.footer}`);
  return { lang: l, text: parts.join("\n"), facts };
}

// What an unconstrained assistant tends to write: helpful, complete, and too much.
export function composeNaive({ lang, shipments }) {
  const l = replyLanguage(lang);
  const t = T[l];
  if (shipments.length === 0) return { lang: l, text: `${t.hello}\n\n${t.clarify}\n\n${t.bye}` };
  const lines = shipments.map((s) => {
    const extra = [
      s.consignee ? `${s.consignee.name}, ${s.consignee.address}` : null,
      s.exception ? `${s.exception.code}: ${s.exception.note}` : null,
      s.receivedBy ? `signed by ${s.receivedBy}` : null,
      s.carrier === "subcontractor" ? `carrier ${s.carrierName}` : null,
    ].filter(Boolean).join(" · ");
    const status = T[l][s.status] ? T[l][s.status](s, l) : s.status;
    return `${t.ref(s)} ${status}${extra ? ` [${extra}]` : ""}`;
  });
  return { lang: l, text: `${t.hello}\n\n${lines.join("\n\n")}\n\n${t.bye}` };
}
