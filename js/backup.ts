// backup.ts — export/import of a whole group as a portable JSON snapshot. This
// module is loaded LAZILY by storage.ts via a dynamic import() so it only ships
// when the user actually exports — exercising the migration's dynamic-import
// edge deriver. Depends on money.ts for re-hydrating amounts.

import { money, Money } from "./money.js";
import type { Group } from "./group.js";

export interface GroupSnapshot {
  version: number;
  exportedAt: string;
  group: Group;
}

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
  const s = snapshot as { version?: unknown; group?: unknown } | null | undefined;
  if (!s || (s as any).version !== 1 || !(s as any).group) {
    throw new Error("unrecognized backup format");
  }
  const group = (s as any).group as Group;
  const expenses = ((group.expenses || []) as any[]).map((e: any) =>
    Object.assign({}, e, { amount: reviveMoney(e.amount) })
  );
  return Object.assign({}, group, { expenses: expenses });
}

function reviveMoney(m: unknown): Money {
  if (!m || typeof (m as any).amountMinor !== "number") {
    throw new Error("cannot revive money value");
  }
  const raw = m as { amountMinor: number; currency?: string };
  return money(Math.round(raw.amountMinor), raw.currency);
}