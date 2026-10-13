// In-memory stand-in for the TMS shipment-status API (contract: api/openapi.yaml).
// The mock server in api/mock-server.mjs serves the same data over HTTP.

export function createTms({ shipments }) {
  const byId = new Map(shipments.map((s) => [s.id, s]));
  const byCmr = new Map(shipments.filter((s) => s.cmr).map((s) => [s.cmr, s]));

  // GET /shipments/{id} · GET /shipments?cmr= · GET /shipments?customerReference=&accountId=
  // A customer reference is only unique within one account, so it is never looked up without one.
  function find(ref, { accountIds = null } = {}) {
    if (ref.type === "shipment") return byId.get(ref.value) || null;
    if (ref.type === "cmr") return byCmr.get(ref.value) || null;
    if (ref.type === "customer") {
      const norm = (v) => v.replace(/[\s:#-]/g, "").toUpperCase();
      return shipments.find((s) =>
        s.customerReference && norm(s.customerReference) === norm(ref.value) &&
        (accountIds === null || accountIds.includes(s.accountId))) || null;
    }
    return null;
  }

  return { find, byId };
}
