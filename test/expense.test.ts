import { describe, it, assert, expect } from "vitest";

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

describe("createExpense accepts a valid equal-split expense", () => {
  it("should create expense with correct properties", () => {
    const e = createExpense(baseInput());
    assert.equal(e.description, "Dinner");
    assert.equal(e.amount.amountMinor, 3000);
    assert.equal(e.split.kind, "equal");
    assert.ok(e.date instanceof Date);
  });
});

describe("createExpense rejects an empty description", () => {
  it("should throw error for empty description", () => {
    assert.throws(() => createExpense(baseInput({ description: "  " })), /description/);
  });
});

describe("createExpense rejects a non-positive amount", () => {
  it("should throw error for non-positive amount", () => {
    assert.throws(() => createExpense(baseInput({ amount: money(0, "USD") })), /positive/);
  });
});

describe("validateExpense flags percentages that do not sum to 100", () => {
  it("should detect percentage sum mismatch", () => {
    const problems = validateExpense(
      baseInput({
        split: { kind: "percentage", values: { m1: 40, m2: 40 } },
      })
    );
    assert.ok(problems.some((p) => p.code === "PERCENT_NOT_100"));
  });
});

describe("validateExpense flags exact amounts that do not sum to the total", () => {
  it("should detect exact amount sum mismatch", () => {
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
});

describe("payer-not-sharing is a soft warning, not a hard failure", () => {
  it("should allow creation with payer not in participants", () => {
    const e = createExpense(baseInput({ paidBy: "m3" }));
    assert.equal(e.paidBy, "m3");
  });
});

describe("totalOf sums expense amounts", () => {
  it("should correctly sum expense amounts", () => {
    const a = createExpense(baseInput());
    const b = createExpense(baseInput({ amount: money(1500, "USD") }));
    assert.equal(totalOf([a, b], "USD").amountMinor, 4500);
  });
});