import { describe, it, assert } from 'vitest';
import {
  money,
  sum,
  zero,
  isZero,
} from '../js/money.js';
import { createExpense } from '../js/expense.js';
import {
  computeBalances,
  simplifyDebts,
  settlementSummary,
  debtMatrix,
  totalTransferred,
  validateSettlement,
} from '../js/balances.js';

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

describe("balances", () => {
  it("computeBalances nets out to zero across members", () => {
    const balances = computeBalances(scenario(), "USD");
    const total = sum(Object.keys(balances).map((k) => balances[k]), "USD");
    assert.ok(isZero(total));
  });

  it("the payer is owed the sum of the others' shares", () => {
    const balances = computeBalances(scenario(), "USD");
    assert.equal(balances.ada.amountMinor, 2000);
    assert.equal(balances.bruno.amountMinor, -1000);
    assert.equal(balances.chen.amountMinor, -1000);
  });

  it("simplifyDebts settles everyone with positive transfers", () => {
    const balances = computeBalances(scenario(), "USD");
    const transfers = simplifyDebts(balances);
    assert.equal(transfers.length, 2);
    transfers.forEach((t) => {
      assert.ok(t.amount.amountMinor > 0);
      assert.equal(t.to, "ada");
    });
    const moved = sum(transfers.map((t) => t.amount), "USD");
    assert.equal(moved.amountMinor, 2000);
  });

  it("settlementSummary bundles balances and transfers", () => {
    const summary = settlementSummary(scenario(), "USD");
    assert.equal(summary.transferCount, summary.transfers.length);
    assert.ok(summary.balances.ada.amountMinor === 2000);
  });

  it("a fully settled group needs no transfers", () => {
    const balances = { ada: zero("USD"), bruno: zero("USD") };
    assert.deepEqual(simplifyDebts(balances), []);
  });

  it("debtMatrix attributes each share to the payer", () => {
    const matrix = debtMatrix(scenario(), "USD");
    assert.equal(matrix.bruno.ada.amountMinor, 1000);
    assert.equal(matrix.chen.ada.amountMinor, 1000);
  });

  it("the simplified plan moves exactly the outstanding total and settles all", () => {
    const balances = computeBalances(scenario(), "USD");
    const transfers = simplifyDebts(balances);
    assert.equal(totalTransferred(transfers).amountMinor, 2000);
    const check = validateSettlement(balances, transfers);
    assert.ok(check.settled);
  });
});