// split.ts — turns an Expense's split rule into concrete per-participant Money
// shares that sum EXACTLY to the expense amount. Depends on money.ts (for
// allocate/multiply) and expense.ts (for the split kinds). Two import edges →
// this node sits below both in the DAG.

import { money, zero, allocate, multiply, add, equals } from "./money.js";
import type { Money } from "./money.js";
import { isSplitKind } from "./expense.js";
import type { Expense } from "./expense.js";

// Compute { [participantId]: Money } shares for an expense. Guarantees the
// shares sum back to expense.amount (no lost/created minor units), delegating
// the remainder distribution to money.allocate for equal/shares/percentage.
export function computeShares(expense: Expense): Record<string, Money> {
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
    return byShares(amount, participants, expense.split.values as Record<string, number | Money>);
  }
  if (kind === "percentage") {
    return byPercentage(amount, participants, expense.split.values as Record<string, number | Money>);
  }
  // exact
  return byExact(amount, participants, expense.split.values as Record<string, number | Money>);
}

function byEqual(amount: Money, participants: string[]): Record<string, Money> {
  const weights = participants.map(() => 1);
  const parts = allocate(amount, weights);
  return zip(participants, parts);
}

function byShares(amount: Money, participants: string[], values: Record<string, number | Money>): Record<string, Money> {
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

// Percentages can be fractional; multiply then fix any rounding drift by
// pushing the leftover minor units onto the largest share (keeps the sum exact).
function byPercentage(amount: Money, participants: string[], values: Record<string, number | Money>): Record<string, Money> {
  const shares: Record<string, Money> = {};
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

function byExact(amount: Money, participants: string[], values: Record<string, number | Money>): Record<string, Money> {
  const shares: Record<string, Money> = {};
  for (let i = 0; i < participants.length; i++) {
    const pid = participants[i];
    const v = values[pid];
    shares[pid] = isMoney(v) ? v : money(0, amount.currency);
  }
  return shares;
}

// Verify a shares map sums exactly to the expected amount (used by tests and
// balances.ts as a safety assertion).
export function sharesSumTo(shares: Record<string, Money>, expected: Money): boolean {
  let acc = zero(expected.currency);
  const keys = Object.keys(shares);
  for (let i = 0; i < keys.length; i++) {
    acc = add(acc, shares[keys[i]]);
  }
  return equals(acc, expected);
}

function zip(ids: string[], parts: Money[]): Record<string, Money> {
  const out: Record<string, Money> = {};
  for (let i = 0; i < ids.length; i++) {
    out[ids[i]] = parts[i];
  }
  return out;
}

function isMoney(x: unknown): x is Money {
  return !!x && typeof x === "object" && typeof (x as Money).amountMinor === "number";
}