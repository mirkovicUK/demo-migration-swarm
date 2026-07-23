import { describe, it, expect } from 'vitest';
import { money } from '../js/money.js';
import { createExpense, validateExpense, totalOf } from '../js/expense.js';

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

describe('createExpense accepts a valid equal-split expense', () => {
  it('createExpense accepts a valid equal-split expense', () => {
    const e = createExpense(baseInput());
    expect(e.description).toBe("Dinner");
    expect(e.amount.amountMinor).toBe(3000);
    expect(e.split.kind).toBe("equal");
    expect(e.date instanceof Date).toBe(true);
  });
});

describe('createExpense rejects an empty description', () => {
  it('createExpense rejects an empty description', () => {
    expect(() => createExpense(baseInput({ description: "  " }))).toThrow(/description/);
  });
});

describe('createExpense rejects a non-positive amount', () => {
  it('createExpense rejects a non-positive amount', () => {
    expect(() => createExpense(baseInput({ amount: money(0, "USD") }))).toThrow(/positive/);
  });
});

describe('validateExpense flags percentages that do not sum to 100', () => {
  it('validateExpense flags percentages that do not sum to 100', () => {
    const problems = validateExpense(
      baseInput({
        split: { kind: "percentage", values: { m1: 40, m2: 40 } },
      })
    );
    expect(problems.some((p) => p.code === "PERCENT_NOT_100")).toBe(true);
  });
});

describe('validateExpense flags exact amounts that do not sum to the total', () => {
  it('validateExpense flags exact amounts that do not sum to the total', () => {
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
});

describe('payer-not-sharing is a soft warning, not a hard failure', () => {
  it('payer-not-sharing is a soft warning, not a hard failure', () => {
    // paidBy is m3 who is not a participant → creation should still succeed.
    const e = createExpense(baseInput({ paidBy: "m3" }));
    expect(e.paidBy).toBe("m3");
  });
});

describe('totalOf sums expense amounts', () => {
  it('totalOf sums expense amounts', () => {
    const a = createExpense(baseInput());
    const b = createExpense(baseInput({ amount: money(1500, "USD") }));
    expect(totalOf([a, b], "USD").amountMinor).toBe(4500);
  });
});