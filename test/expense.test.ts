// expense.test.ts — validation coverage for the Expense model.
import { describe, it, expect } from "vitest";

import { money } from "../js/money";
import {
  createExpense,
  validateExpense,
  totalOf,
  type ExpenseInput,
} from "../js/expense";

function baseInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    description: "Dinner",
    amount: money(3000, "USD"),
    paidBy: "m1",
    participants: ["m1", "m2"],
    split: { kind: "equal" },
    ...overrides,
  };
}

describe("createExpense accepts a valid equal-split expense", () => {
  it("creates an expense with correct properties", () => {
    const e = createExpense(baseInput());
    expect(e.description).toBe("Dinner");
    expect(e.amount.amountMinor).toBe(3000);
    expect(e.split.kind).toBe("equal");
    expect(e.date instanceof Date).toBe(true);
  });
});

describe("createExpense rejects an empty description", () => {
  it("throws an error for empty description", () => {
    expect(() => createExpense(baseInput({ description: "  " }))).toThrow(
      /description/
    );
  });
});

describe("createExpense rejects a non-positive amount", () => {
  it("throws an error for zero amount", () => {
    expect(() =>
      createExpense(baseInput({ amount: money(0, "USD") }))
    ).toThrow(/positive/);
  });
});

describe("validateExpense flags percentages that do not sum to 100", () => {
  it("detects percentage split that doesn't sum to 100", () => {
    const problems = validateExpense(
      baseInput({
        split: { kind: "percentage", values: { m1: 40, m2: 40 } },
      })
    );
    expect(
      problems.some((p) => p.code === "PERCENT_NOT_100")
    ).toBeTruthy();
  });
});

describe("validateExpense flags exact amounts that do not sum to the total", () => {
  it("detects exact split that doesn't sum to total", () => {
    const problems = validateExpense(
      baseInput({
        split: {
          kind: "exact",
          values: { m1: money(1000, "USD"), m2: money(1000, "USD") },
        },
      })
    );
    expect(problems.some((p) => p.code === "EXACT_MISMATCH")).toBeTruthy();
  });
});

describe("payer-not-sharing is a soft warning, not a hard failure", () => {
  it("allows creation when payer is not a participant", () => {
    const e = createExpense(baseInput({ paidBy: "m3" }));
    expect(e.paidBy).toBe("m3");
  });
});

describe("totalOf sums expense amounts", () => {
  it("correctly sums expenses in the same currency", () => {
    const a = createExpense(baseInput());
    const b = createExpense(baseInput({ amount: money(1500, "USD") }));
    expect(totalOf([a, b], "USD").amountMinor).toBe(4500);
  });
});