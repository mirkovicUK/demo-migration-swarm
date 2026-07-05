import type { Group } from './group.js';
import { money } from './money.js';

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
    if (!snapshot || (snapshot as GroupSnapshot).version !== 1 || !(snapshot as GroupSnapshot).group) {
        throw new Error("unrecognized backup format");
    }
    const group = (snapshot as GroupSnapshot).group;
    const expenses = (group.expenses || []).map((e: any) =>
        Object.assign({}, e, { amount: reviveMoney(e.amount) })
    );
    return Object.assign({}, group, { expenses: expenses });
}

function reviveMoney(m: any): typeof m {
    if (!m || typeof m.amountMinor !== "number") {
        throw new Error("cannot revive money value");
    }
    return money(Math.round(m.amountMinor), m.currency);
}