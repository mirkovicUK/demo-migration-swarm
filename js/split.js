// split.js — turns an Expense's split rule into concrete per-participant Money
// shares that sum EXACTLY to the expense amount. Depends on money.js (for
// allocate/multiply) and expense.js (for the split kinds). Two import edges →
// this node sits below both in the DAG.

import { money, zero, allocate, multiply, add, equals } from "./money.js";
import { isSplitKind } from "./expense.js";

// Compute { [participantId]: Money } shares for an expense. Guarantees the
// shares sum back to expense.amount (no lost/created minor units), delegating
// the remainder distribution to money.allocate for equal/shares/percentage.
function computeShares(expense) {
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
    return byShares(amount, participants, expense.split.values);
  }
  if (kind === "percentage") {
    return byPercentage(amount, participants, expense.split.values);
  }
  // exact
  return byExact(amount, participants, expense.split.values);
}

function byEqual(amount, participants) {
  const weights = participants.map(() => 1);
  const parts = allocate(amount, weights);
  return zip(participants, parts);
}

function byShares(amount, participants, values) {
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
function byPercentage(amount, participants, values) {
  const shares = {};
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

function byExact(amount, participants, values) {
  const shares = {};
  for (let i = 0; i < participants.length; i++) {
    const pid = participants[i];
    const v = values[pid];
    shares[pid] = isMoney(v) ? v : money(0, amount.currency);
  }
  return shares;
}

// Verify a shares map sums exactly to the expected amount (used by tests and
// balances.js as a safety assertion).
function sharesSumTo(shares, expected) {
  let acc = zero(expected.currency);
  const keys = Object.keys(shares);
  for (let i = 0; i < keys.length; i++) {
    acc = add(acc, shares[keys[i]]);
  }
  return equals(acc, expected);
}

function zip(ids, parts) {
  const out = {};
  for (let i = 0; i < ids.length; i++) {
    out[ids[i]] = parts[i];
  }
  return out;
}

function isMoney(x) {
  return !!x && typeof x === "object" && typeof x.amountMinor === "number";
}

export { computeShares, sharesSumTo };
