import { Group } from './group.js';
import { money, Money } from './money.js';

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
  if (!snapshot || typeof snapshot !== 'object' || !('version' in snapshot) || !('group' in snapshot) || !(snapshot.version === 1) || !snapshot.group) {
    throw new Error("unrecognized backup format");
  }
  
  const group = snapshot.group as Group;
  const expenses = (group.expenses || []).map((e: any) =>
    Object.assign({}, e, { amount: reviveMoney(e.amount) })
  );
  
  return Object.assign({}, group, { expenses: expenses });
}

function reviveMoney(m: any): Money {
  if (!m || typeof m.amountMinor !== "number") {
    throw new Error("cannot revive money value");
  }
  return money(Math.round(m.amountMinor), m.currency);
}