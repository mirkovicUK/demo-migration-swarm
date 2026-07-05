import test from "node:test";
import assert from "node:assert/strict";

import { money, sum } from "../js/money.js";
import { createExpense } from "../js/expense.js";
import { computeShares, sharesSumTo } from "../js/split.js";

function expenseWith(split: any) {
  return createExpense({
    description: "x",
    amount: money(1000, "USD"),
    paidBy: "a",
    participants: ["a", "b", "c"],
    split: split,
  });
}

function values(shares: Record<string, any>) {
  return Object.keys(shares).map((k) => shares[k]);
}

test("equal split sums to the total and distributes the remainder", () => {
  const shares = computeShares(expenseWith({ kind: "equal" }));
  assert.equal(sum(values(shares)).amountMinor, 1000);
  assert.equal(shares.a.amountMinor, 334);
});

test("shares split uses integer weights and sums to total", () => {
  const shares = computeShares(
    expenseWith({ kind: "shares", values: { a: 2, b: 1, c: 1 } })
  );
  assert.equal(sum(values(shares)).amountMinor, 1000);
  assert.equal(shares.a.amountMinor, 500);
});

test("percentage split sums to total even with rounding drift", () => {
  const shares = computeShares(
    expenseWith({ kind: "percentage", values: { a: 33.33, b: 33.33, c: 33.34 } })
  );
  assert.ok(sharesSumTo(shares, money(1000, "USD")));
});

test("exact split preserves the provided amounts", () => {
  const shares = computeShares(
    expenseWith({
      kind: "exact",
      values: {
        a: money(500, "USD"),
        b: money(300, "USD"),
        c: money(200, "USD"),
      },
    })
  );
  assert.equal(shares.a.amountMinor, 500);
  assert.ok(sharesSumTo(shares, money(1000, "USD")));
});