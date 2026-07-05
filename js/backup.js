// backup.js — export/import of a whole group as a portable JSON snapshot. This
// module is loaded LAZILY by storage.js via a dynamic import() so it only ships
// when the user actually exports — exercising the migration's dynamic-import
// edge deriver. Depends on money.js for re-hydrating amounts.

import { money } from "./money.js";

// Serialize a group to a plain JSON-safe object (Money → {amountMinor,currency}
// already is JSON-safe, but we stamp a version + timestamp for portability).
function exportGroup(group) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    group: group,
  };
}

// Re-hydrate a snapshot, defensively rebuilding Money values so downstream
// arithmetic (which asserts integer minor units) never sees a malformed amount.
function importGroup(snapshot) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.group) {
    throw new Error("unrecognized backup format");
  }
  const group = snapshot.group;
  const expenses = (group.expenses || []).map((e) =>
    Object.assign({}, e, { amount: reviveMoney(e.amount) })
  );
  return Object.assign({}, group, { expenses: expenses });
}

function reviveMoney(m) {
  if (!m || typeof m.amountMinor !== "number") {
    throw new Error("cannot revive money value");
  }
  return money(Math.round(m.amountMinor), m.currency);
}

export { exportGroup, importGroup };
