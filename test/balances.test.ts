import { describe, it, expect } from "vitest";

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

// Ada pays 30.00 for Ada+Bruno+Chen split equally → each owes 10.00, Ada is
// owed 20.00.
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
  it("computes balances with zero net", () => {
    const balances = computeBalances(scenario(), "USD");
    const total = sum(Object.keys(balances).map((k) => balances[k]), "USD");
    expect(isZero(total)).toBe(true);
  });
});

describe("the payer is owed the sum of the others' shares", () => {
  it("verifies payer balance and others' negative balances", () => {
    const balances = computeBalances(scenario(), "USD");
    expect(balances.ada.amountMinor).toBe(2000);
    expect(balances.bruno.amountMinor).toBe(-1000);
    expect(balances.chen.amountMinor).toBe(-1000);
  });
});

describe("simplifyDebts settles everyone with positive transfers", () => {
  it("ensures transfers are positive and correctly summed", () => {
    const balances = computeBalances(scenario(), "USD");
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBe(2);
    transfers.forEach((t) => {
      expect(t.amount.amountMinor > 0).toBe(true);
      expect(t.to).toBe("ada");
    });
    const moved = sum(transfers.map((t) => t.amount), "USD");
    expect(moved.amountMinor).toBe(2000);
  });
});

describe("settlementSummary bundles balances and transfers", () => {
  it("checks summary counts and balance amounts", () => {
    const summary = settlementSummary(scenario(), "USD");
    expect(summary.transferCount).toBe(summary.transfers.length);
    expect(summary.balances.ada.amountMinor === 2000).toBe(true);
  });
});

describe("a fully settled group needs no transfers", () => {
  it("returns empty transfers for zero balances", () => {
    const balances = { ada: zero("USD"), bruno: zero("USD") };
    expect(simplifyDebts(balances)).toEqual([]);
  });
});

describe("debtMatrix attributes each share to the payer", () => {
  it("verifies matrix entries for each participant", () => {
    const matrix = debtMatrix(scenario(), "USD");
    expect(matrix.bruno.ada.amountMinor).toBe(1000);
    expect(matrix.chen.ada.amountMinor).toBe(1000);
  });
});

describe("the simplified plan moves exactly the outstanding total and settles all", () => {
  it("confirms total transferred and settlement validity", () => {
    const balances = computeBalances(scenario(), "USD");
    const transfers = simplifyDebts(balances);
    expect(totalTransferred(transfers).amountMinor).toBe(2000);
    const check = validateSettlement(balances, transfers);
    expect(check.settled).toBe(true);
  });
});