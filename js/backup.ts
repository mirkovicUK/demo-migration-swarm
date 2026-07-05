import { money } from "./money.js";
import { Money } from "./money.js";
import { Group } from "./group.js";

export interface GroupSnapshot {
  version: number;
  exportedAt: string;
  group: Group;
}

export function exportGroup(group: Group): GroupSnapshot {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    group: group,
  };
}

export function importGroup(snapshot: unknown): Group {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    (snapshot as GroupSnapshot).version !== 1 ||
    !(snapshot as GroupSnapshot).group
  ) {
    throw new Error("unrecognized backup format");
  }
  const raw = snapshot as GroupSnapshot;
  const group = raw.group;
  const expenses = (group.expenses || []).map((e) =>
    Object.assign({}, e, { amount: reviveMoney(e.amount) })
  );
  return Object.assign({}, group, { expenses: expenses }) as Group;
}

function reviveMoney(m: unknown): Money {
  if (!m || typeof (m as Money).amountMinor !== "number") {
    throw new Error("cannot revive money value");
  }
  const mon = m as Money;
  return money(Math.round(mon.amountMinor), mon.currency);
}