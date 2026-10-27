// Reply templates. Every fact in an automatic reply comes from a TMS field; the model never
// writes free text that goes to a customer (ADR-003). `facts` lists what was used, so tests can
// check that nothing else is in the reply.
//
// The templates are plain strings with {placeholders}. The same object is published to Power
// Platform as the environment variable crl_ReplyTemplates (power-platform/), so the cloud flow
// and this module fill exactly the same sentences.

const TZ = "Europe/Brussels";
export const PORTAL = "https://portal.corlaan.example";

export const TEMPLATES = {
  nl: {
    locale: "nl-BE",
    between: "tussen", and: "en", at: "om",
    hello: "Beste,",
    bye: "Met vriendelijke groeten,\nKlantendienst Corlaan Logistics",
    footer: "Dit antwoord werd automatisch opgesteld uit ons transportsysteem. Antwoord gewoon op deze mail om een collega te bereiken.",
    ref: "Uw zending {id}",
    refCustomer: "Uw zending {id} (uw referentie {customerReference})",
    BOOKED: "staat gepland voor ophaling op {pickupDay}. Verwachte levering: {eta}.",
    PICKED_UP: "werd opgehaald ({lastEventAt}). Verwachte levering: {eta}.",
    IN_TRANSIT: "is onderweg. Laatste update: {lastEventLocation}, {lastEventAt}. Verwachte levering: {eta}.",
    OUT_FOR_DELIVERY: "is vandaag op ronde. Verwachte aankomst: {eta}.",
    DELIVERED: "werd geleverd op {deliveredAt}.",
    podIntro: "Het afleverbewijs vindt u via deze beveiligde link (7 dagen geldig):",
    podNotYet: "Het afleverbewijs is beschikbaar zodra de zending geleverd is.",
    clarify: "Bedankt voor uw bericht. Om uw zending snel terug te vinden hebben we het zendingsnummer (bv. CL-2026-0412345), het CMR-nummer of uw eigen orderreferentie nodig. Kunt u een van die nummers bezorgen?",
    generic: `Bedankt voor uw bericht. Om de gegevens van onze klanten te beschermen delen we zendingsinformatie alleen met geregistreerde contactpersonen. U kunt de status volgen via ${PORTAL}, of uw vraag sturen vanaf het e-mailadres dat bij ons gekend is.`,
  },
  fr: {
    locale: "fr-BE",
    between: "entre", and: "et", at: "à",
    hello: "Bonjour,",
    bye: "Cordialement,\nService clientèle Corlaan Logistics",
    footer: "Cette réponse a été préparée automatiquement à partir de notre système de transport. Répondez simplement à ce message pour joindre un collègue.",
    ref: "Votre envoi {id}",
    refCustomer: "Votre envoi {id} (votre référence {customerReference})",
    BOOKED: "est planifié pour enlèvement le {pickupDay}. Livraison prévue : {eta}.",
    PICKED_UP: "a été enlevé ({lastEventAt}). Livraison prévue : {eta}.",
    IN_TRANSIT: "est en route. Dernière mise à jour : {lastEventLocation}, {lastEventAt}. Livraison prévue : {eta}.",
    OUT_FOR_DELIVERY: "est en tournée aujourd'hui. Arrivée prévue : {eta}.",
    DELIVERED: "a été livré le {deliveredAt}.",
    podIntro: "Vous trouverez la preuve de livraison via ce lien sécurisé (valable 7 jours) :",
    podNotYet: "La preuve de livraison sera disponible dès que l'envoi sera livré.",
    clarify: "Merci pour votre message. Pour retrouver rapidement votre envoi, nous avons besoin du numéro d'envoi (p. ex. CL-2026-0412345), du numéro CMR ou de votre référence de commande. Pouvez-vous nous communiquer l'un de ces numéros ?",
    generic: `Merci pour votre message. Pour protéger les données de nos clients, nous ne partageons les informations d'envoi qu'avec les contacts enregistrés. Vous pouvez suivre le statut via ${PORTAL}, ou nous écrire depuis l'adresse e-mail connue chez nous.`,
  },
  en: {
    locale: "en-GB",
    between: "between", and: "and", at: "at",
    hello: "Hello,",
    bye: "Kind regards,\nCorlaan Logistics Customer Service",
    footer: "This reply was prepared automatically from our transport system. Simply reply to this email to reach a colleague.",
    ref: "Your shipment {id}",
    refCustomer: "Your shipment {id} (your reference {customerReference})",
    BOOKED: "is planned for collection on {pickupDay}. Expected delivery: {eta}.",
    PICKED_UP: "was collected ({lastEventAt}). Expected delivery: {eta}.",
    IN_TRANSIT: "is on its way. Last update: {lastEventLocation}, {lastEventAt}. Expected delivery: {eta}.",
    OUT_FOR_DELIVERY: "is out for delivery today. Expected arrival: {eta}.",
    DELIVERED: "was delivered on {deliveredAt}.",
    podIntro: "You can download the proof of delivery via this secure link (valid for 7 days):",
    podNotYet: "The proof of delivery will be available once the shipment is delivered.",
    clarify: "Thank you for your message. To find your shipment quickly we need the shipment number (e.g. CL-2026-0412345), the CMR number or your own order reference. Could you send one of these?",
    generic: `Thank you for your message. To protect our customers' data we only share shipment information with registered contacts. You can follow the status at ${PORTAL}, or write to us from the email address we have on file.`,
  },
};

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));

function day(iso, t) {
  return new Intl.DateTimeFormat(t.locale, { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}
function time(iso, t) {
  return new Intl.DateTimeFormat(t.locale, { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function windowText(w, t) {
  const sameDay = day(w.from, t) === day(w.to, t);
  const to = sameDay ? time(w.to, t) : `${day(w.to, t)} ${time(w.to, t)}`;
  return `${day(w.from, t)} ${t.between} ${time(w.from, t)} ${t.and} ${to}`;
}
const when = (iso, t) => `${day(iso, t)} ${t.at} ${time(iso, t)}`;

export function replyLanguage(lang) {
  return TEMPLATES[lang] ? lang : "en";
}

// The sentence about one shipment, e.g. "Your shipment CL-… is on its way. …"
export function statusLine(s, t) {
  const values = {
    id: s.id,
    customerReference: s.customerReference,
    pickupDay: s.pickupDate ? day(s.pickupDate, t) : "",
    lastEventAt: s.lastEvent ? when(s.lastEvent.at, t) : "",
    lastEventLocation: s.lastEvent?.location ?? "",
    eta: s.eta ? windowText(s.eta, t) : "",
    deliveredAt: s.deliveredAt ? when(s.deliveredAt, t) : "",
  };
  return `${fill(s.customerReference ? t.refCustomer : t.ref, values)} ${fill(t[s.status], values)}`;
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
  const t = TEMPLATES[l];
  const parts = [t.hello, ""];
  const facts = [];
  if (template === "clarify") parts.push(t.clarify);
  else if (template === "generic") parts.push(t.generic);
  else {
    for (const s of shipments) {
      parts.push(statusLine(s, t));
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
  const t = TEMPLATES[l];
  if (shipments.length === 0) return { lang: l, text: `${t.hello}\n\n${t.clarify}\n\n${t.bye}` };
  const lines = shipments.map((s) => {
    const extra = [
      s.consignee ? `${s.consignee.name}, ${s.consignee.address}` : null,
      s.exception ? `${s.exception.code}: ${s.exception.note}` : null,
      s.receivedBy ? `signed by ${s.receivedBy}` : null,
      s.carrier === "subcontractor" ? `carrier ${s.carrierName}` : null,
    ].filter(Boolean).join(" · ");
    const status = t[s.status] ? statusLine(s, t) : `${fill(s.customerReference ? t.refCustomer : t.ref, { id: s.id, customerReference: s.customerReference })} ${s.status}`;
    return `${status}${extra ? ` [${extra}]` : ""}`;
  });
  return { lang: l, text: `${t.hello}\n\n${lines.join("\n\n")}\n\n${t.bye}` };
}
