import { describe, it, expect } from "vitest";
import { money } from "../js/money";
import { createExpense, validateExpense, totalOf } from "../js/expense";

function baseInput(overrides: any) {
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

describe("createExpense", () => {
  it("accepts a valid equal-split expense", () => {
    const e = createExpense(baseInput());
    expect(e.description).toBe("Dinner");
    expect(e.amount.amountMinor).toBe(3000);
    expect(e.split.kind).toBe("equal");
    expect(e.date instanceof Date).toBe(true);
  });

  it("rejects an empty description", () => {
    expect(() => createExpense(baseInput({ description: "  " }))).toThrow(/description/);
  });

  it("rejects a non-positive amount", () => {
    expect(() => createExpense(baseInput({ amount: money(0, "USD") }))).toThrow(/positive/);
  });

  it("flags percentages that do not sum to 100", () => {
    const problems = validateExpense(
      baseInput({
        split: { kind: "percentage", values: { m1: 40, m2: 40 } },
      })
    );
    expect(problems.some((p) => p.code === "PERCENT_NOT_100")).toBe(true);
  });

  it("flags exact amounts that do not sum to the total", () => {
    const problems = validateExpense(
      baseInput({
        split: {
          kind: "exact",
          values: { m1: money(1000, "USD"), m2: money(1000, "USD") },
        },
      })
    );
    expect(problems.some((p) => p.code === "EXACT_MISMATCH")).toBe(true);
  });

  it("payer-not-sharing is a soft warning, not a hard failure", () => {
    // paidBy is m3 who is not a participant → creation should still succeed.
    const e = createExpense(baseInput({ paidBy: "m3" }));
    expect(e.paidBy).toBe("m3");
  });
});

describe("totalOf", () => {
  it("sums expense amounts", () => {
    const a = createExpense(baseInput());
    const b = createExpense(baseInput({ amount: money(1500, "USD") }));
    expect(totalOf([a, b], "USD").amountMinor).toBe(4500);
  });
});