// backup.ts — export/import of a whole group as a portable JSON snapshot. This
// module is loaded LAZILY by storage.ts via a dynamic import() so it only ships
// when the user actually exports — exercising the migration's dynamic-import
// edge deriver. Depends on money.js for re-hydrating amounts.

import { money } from "./money.js";
import type { Group } from "./group.js";

// Serialize a group to a plain JSON-safe object (Money → {amountMinor,currency}
// already is JSON-safe, but we stamp a version + timestamp for portability).
export function exportGroup(group: Group): GroupSnapshot {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    group: group,
  };
}

// Re-hydrate a snapshot, defensively rebuilding Money values so downstream
// arithmetic (which asserts integer minor units) never sees a malformed amount.
export function importGroup(snapshot: unknown): Group {
  if (!snapshot || (snapshot as GroupSnapshot).version !== 1 || !(snapshot as GroupSnapshot).group) {
    throw new Error("unrecognized backup format");
  }
  const group = (snapshot as GroupSnapshot).group;
  const expenses = (group.expenses || []).map((e) =>
    Object.assign({}, e, { amount: reviveMoney(e.amount) })
  );
  return Object.assign({}, group, { expenses: expenses });
}

function reviveMoney(m: { amountMinor: number; currency: string }): { amountMinor: number; currency: string } {
  if (!m || typeof m.amountMinor !== "number") {
    throw new Error("cannot revive money value");
  }
  return money(Math.round(m.amountMinor), m.currency);
}

export interface GroupSnapshot {
  version: 1;
  exportedAt: string;
  group: Group;
}