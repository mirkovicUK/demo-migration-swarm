import { describe, it, expect } from 'vitest';
import { money, sum } from '../js/money.js';
import { createExpense } from '../js/expense.js';
import { computeShares, sharesSumTo } from '../js/split.js';

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

describe("split tests", () => {
  it("equal split sums to the total and distributes the remainder", () => {
    const shares = computeShares(expenseWith({ kind: "equal" }));
    expect(sum(values(shares)).amountMinor).toBe(1000);
    expect(shares.a.amountMinor).toBe(334);
  });

  it("shares split uses integer weights and sums to total", () => {
    const shares = computeShares(
      expenseWith({ kind: "shares", values: { a: 2, b: 1, c: 1 } })
    );
    expect(sum(values(shares)).amountMinor).toBe(1000);
    expect(shares.a.amountMinor).toBe(500);
  });

  it("percentage split sums to total even with rounding drift", () => {
    const shares = computeShares(
      expenseWith({ kind: "percentage", values: { a: 33.33, b: 33.33, c: 33.34 } })
    );
    expect(sharesSumTo(shares, money(1000, "USD"))).toBeTruthy();
  });

  it("exact split preserves the provided amounts", () => {
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
    expect(shares.a.amountMinor).toBe(500);
    expect(sharesSumTo(shares, money(1000, "USD"))).toBeTruthy();
  });
});