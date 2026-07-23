import { describe, it, expect } from 'vitest';
import { money, sum, zero, isZero } from "../js/money.js";
import { createExpense } from "../js/expense.js";
import {
  computeBalances,
  simplifyDebts,
  settlementSummary,
  debtMatrix,
  totalTransferred,
  validateSettlement,
} from "../js/balances.js";

function scenario() {
  return [
    createExpense({
      description: "Dinner",
      amount: money(3000, "USD"),
      paidBy: "ada",
      participants: ["ada", "bruno", "chen"],
      split: { kind: "equal" },
    }),
  ];
}

describe("computeBalances nets out to zero across members", () => {
  it("computeBalances nets out to zero across members", () => {
    const balances = computeBalances(scenario(), "USD");
    const total = sum(Object.keys(balances).map((k) => balances[k]), "USD");
    expect(isZero(total)).toBeTruthy();
  });
});

describe("the payer is owed the sum of the others' shares", () => {
  it("the payer is owed the sum of the others' shares", () => {
    const balances = computeBalances(scenario(), "USD");
    expect(balances.ada.amountMinor).toBe(2000);
    expect(balances.bruno.amountMinor).toBe(-1000);
    expect(balances.chen.amountMinor).toBe(-1000);
  });
});

describe("simplifyDebts settles everyone with positive transfers", () => {
  it("simplifyDebts settles everyone with positive transfers", () => {
    const balances = computeBalances(scenario(), "USD");
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBe(2);
    transfers.forEach((t) => {
      expect(t.amount.amountMinor > 0).toBeTruthy();
      expect(t.to).toBe("ada");
    });
    const moved = sum(transfers.map((t) => t.amount), "USD");
    expect(moved.amountMinor).toBe(2000);
  });
});

describe("settlementSummary bundles balances and transfers", () => {
  it("settlementSummary bundles balances and transfers", () => {
    const summary = settlementSummary(scenario(), "USD");
    expect(summary.transferCount).toBe(summary.transfers.length);
    expect(summary.balances.ada.amountMinor === 2000).toBeTruthy();
  });
});

describe("a fully settled group needs no transfers", () => {
  it("a fully settled group needs no transfers", () => {
    const balances = { ada: zero("USD"), bruno: zero("USD") };
    expect(simplifyDebts(balances)).toEqual([]);
  });
});

describe("debtMatrix attributes each share to the payer", () => {
  it("debtMatrix attributes each share to the payer", () => {
    const matrix = debtMatrix(scenario(), "USD");
    expect(matrix.bruno.ada.amountMinor).toBe(1000);
    expect(matrix.chen.ada.amountMinor).toBe(1000);
  });
});

describe("the simplified plan moves exactly the outstanding total and settles all", () => {
  it("the simplified plan moves exactly the outstanding total and settles all", () => {
    const balances = computeBalances(scenario(), "USD");
    const transfers = simplifyDebts(balances);
    expect(totalTransferred(transfers).amountMinor).toBe(2000);
    const check = validateSettlement(balances, transfers);
    expect(check.settled).toBeTruthy();
  });
});