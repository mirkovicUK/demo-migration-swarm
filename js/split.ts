import { money, zero, allocate, multiply, add, equals, type Money } from "./money.js";
import type { Expense } from "./expense.js";

export type SharesMap = Record<string, Money>;

function computeShares(expense: Expense): SharesMap {
  const kind = expense.split.kind;
  if (!isSplitKind(kind)) {
    throw new Error("unknown split kind: " + kind);
  }
  const participants = expense.participants;
  const amount = expense.amount;

  if (kind === "equal") {
    return byEqual(amount, participants);
  }
  if (kind === "shares") {
    return byShares(amount, participants, expense.split.values ?? {});
  }
  if (kind === "percentage") {
    return byPercentage(amount, participants, expense.split.values ?? {});
  }
  // exact
  return byExact(amount, participants, expense.split.values ?? {});
}

function byEqual(amount: Money, participants: string[]): SharesMap {
  const weights = participants.map(() => 1);
  const parts = allocate(amount, weights);
  return zip(participants, parts);
}

function byShares(amount: Money, participants: string[], values: Record<string, unknown>): SharesMap {
  const weights = participants.map((pid) => {
    const w = Number(values[pid]);
    if (!Number.isInteger(w) || w < 0) {
      throw new Error("share weights must be non-negative integers");
    }
    return w;
  });
  const parts = allocate(amount, weights);
  return zip(participants, parts);
}

function byPercentage(amount: Money, participants: string[], values: Record<string, unknown>): SharesMap {
  const shares: SharesMap = {};
  let allocated = zero(amount.currency);
  let maxId = participants[0];
  let maxMinor = -Infinity;
  for (let i = 0; i < participants.length; i++) {
    const pid = participants[i];
    const pct = Number(values[pid]) || 0;
    const part = multiply(amount, pct / 100);
    shares[pid] = part;
    allocated = add(allocated, part);
    if (part.amountMinor > maxMinor) {
      maxMinor = part.amountMinor;
      maxId = pid;
    }
  }
  const drift = amount.amountMinor - allocated.amountMinor;
  if (drift !== 0) {
    shares[maxId] = money(shares[maxId].amountMinor + drift, amount.currency);
  }
  return shares;
}

function byExact(amount: Money, participants: string[], values: Record<string, unknown>): SharesMap {
  const shares: SharesMap = {};
  for (let i = 0; i < participants.length; i++) {
    const pid = participants[i];
    const v = values[pid];
    shares[pid] = isMoney(v) ? v : money(0, amount.currency);
  }
  return shares;
}

function sharesSumTo(shares: SharesMap, expected: Money): boolean {
  let acc = zero(expected.currency);
  const keys = Object.keys(shares);
  for (let i = 0; i < keys.length; i++) {
    acc = add(acc, shares[keys[i]]);
  }
  return equals(acc, expected);
}

function zip(ids: string[], parts: Money[]): SharesMap {
  const out: SharesMap = {};
  for (let i = 0; i < ids.length; i++) {
    out[ids[i]] = parts[i];
  }
  return out;
}

function isMoney(x: unknown): x is Money {
  return !!x && typeof x === "object" && typeof (x as Money).amountMinor === "number";
}

function isSplitKind(value: unknown): value is "equal" | "exact" | "percentage" | "shares" {
  return ["equal", "exact", "percentage", "shares"].includes(value as string);
}

export { computeShares, sharesSumTo };