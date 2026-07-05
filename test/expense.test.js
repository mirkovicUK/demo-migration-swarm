// expense.test.js — validation coverage for the Expense model.
import test from "node:test";
import assert from "node:assert/strict";

import { money } from "../js/money.js";
import { createExpense, validateExpense, totalOf } from "../js/expense.js";

function baseInput(overrides) {
  return Object.assign(
    {
      description: "Dinner",
      amount: money(3000, "USD"),
      paidBy: "m1",
      participants: ["m1", "m2"],
      split: { kind: "equal" },
    },
    overrides || {}
  );
}

test("createExpense accepts a valid equal-split expense", () => {
  const e = createExpense(baseInput());
  assert.equal(e.description, "Dinner");
  assert.equal(e.amount.amountMinor, 3000);
  assert.equal(e.split.kind, "equal");
  assert.ok(e.date instanceof Date);
});

test("createExpense rejects an empty description", () => {
  assert.throws(() => createExpense(baseInput({ description: "  " })), /description/);
});

test("createExpense rejects a non-positive amount", () => {
  assert.throws(() => createExpense(baseInput({ amount: money(0, "USD") })), /positive/);
});

test("validateExpense flags percentages that do not sum to 100", () => {
  const problems = validateExpense(
    baseInput({
      split: { kind: "percentage", values: { m1: 40, m2: 40 } },
    })
  );
  assert.ok(problems.some((p) => p.code === "PERCENT_NOT_100"));
});

test("validateExpense flags exact amounts that do not sum to the total", () => {
  const problems = validateExpense(
    baseInput({
      split: {
        kind: "exact",
        values: { m1: money(1000, "USD"), m2: money(1000, "USD") },
      },
    })
  );
  assert.ok(problems.some((p) => p.code === "EXACT_MISMATCH"));
});

test("payer-not-sharing is a soft warning, not a hard failure", () => {
  // paidBy is m3 who is not a participant → creation should still succeed.
  const e = createExpense(baseInput({ paidBy: "m3" }));
  assert.equal(e.paidBy, "m3");
});

test("totalOf sums expense amounts", () => {
  const a = createExpense(baseInput());
  const b = createExpense(baseInput({ amount: money(1500, "USD") }));
  assert.equal(totalOf([a, b], "USD").amountMinor, 4500);
});
