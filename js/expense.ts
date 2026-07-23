// expense.js — the Expense domain model. Depends on money.js (import edge →
// child of money in the DAG). An Expense records who paid, how much, for which
// participants, and a split rule. This file is intentionally sizeable (lots of
// validation branches) so it exceeds the per-file context cap and forces the
// swarm to lean on recalled Decisions about how Money was typed rather than
// re-deriving it.

import {
  money,
  zero,
  add,
  isPositive,
  isZero,
  equals,
  compare,
  DEFAULT_CURRENCY,
  type Money
} from "./money.js";

let nextExpenseId = 1;

// Split kinds an Expense may carry. split.js knows how to turn each of these
// into concrete per-participant Money shares.
export const SPLIT_KINDS = ["equal", "exact", "percentage", "shares"] as const;

export function isSplitKind(value: unknown): value is (typeof SPLIT_KINDS)[number] {
  return SPLIT_KINDS.includes(value as string);
}

// Create a validated Expense. `input` shape:
//   {
//     description: string,
//     amount: Money,
//     paidBy: string,            // member id
//     participants: string[],    // member ids sharing the cost
//     split: { kind, values? },  // values keyed by member id for non-equal
//     date?: Date | string | number,
//     category?: string,
//   }
// Throws an Error with a `.code` on the first validation failure.
export function createExpense(input: ExpenseInput): Expense {
  const problems = validateExpense(input);
  if (problems.length > 0) {
    const err = new Error(problems[0].message);
    (err as any).code = problems[0].code;
    (err as any).problems = problems;
    throw err;
  }
  const when = normalizeDate(input.date);
  return {
    id: nextExpenseId++,
    description: input.description.trim(),
    amount: input.amount,
    paidBy: input.paidBy,
    participants: input.participants.slice(),
    split: normalizeSplit(input.split, input.participants),
    date: when,
    category: input.category ? String(input.category) : "general",
  };
}

// Collect ALL validation problems (not just the first) so a UI can show them
// together. Returns an array of { code, field, message }.
export function validateExpense(input: unknown): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  if (!input || typeof input !== "object") {
    problems.push(problem("NOT_AN_OBJECT", "input", "expense must be an object"));
    return problems;
  }

  if (typeof (input as any).description !== "string" || !(input as any).description.trim()) {
    problems.push(
      problem("EMPTY_DESCRIPTION", "description", "description is required")
    );
  }

  if (!isMoney(input as Money)) {
    problems.push(problem("BAD_AMOUNT", "amount", "amount must be a Money"));
  } else if (!isPositive(input as Money)) {
    problems.push(
      problem("NON_POSITIVE_AMOUNT", "amount", "amount must be positive")
    );
  }

  if (typeof (input as any).paidBy !== "string" || !(input as any).paidBy) {
    problems.push(problem("NO_PAYER", "paidBy", "paidBy is required"));
  }

  if (!Array.isArray((input as any).participants) || (input as any).participants.length === 0) {
    problems.push(
      problem("NO_PARTICIPANTS", "participants", "at least one participant")
    );
  } else {
    if (hasDuplicates((input as any).participants)) {
      problems.push(
        problem("DUP_PARTICIPANTS", "participants", "duplicate participant")
      );
    }
    if ((input as any).paidBy && (input as any).participants.indexOf((input as any).paidBy) === -1) {
      // The payer is allowed to not be a participant (they paid for others),
      // but it is a common mistake, so surface it as a soft warning code.
      problems.push(
        problem("PAYER_NOT_PARTICIPANT", "paidBy", "payer is not sharing", true)
      );
    }
  }

  const splitProblems = validateSplit((input as any).split, (input as any).participants, (input as any).amount);
  for (let i = 0; i < splitProblems.length; i++) {
    problems.push(splitProblems[i]);
  }

  // A soft warning must never block creation on its own; drop warnings if there
  // are no hard problems so createExpense() succeeds for the payer-not-sharing
  // case but a UI can still call validateExpense() to show them.
  const hard = problems.filter((p) => !p.warning);
  return hard.length > 0 ? hard : [];
}

export function validateSplit(split: unknown, participants: unknown, amount: unknown): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  if (!split || typeof split !== "object") {
    problems.push(problem("NO_SPLIT", "split", "split is required"));
    return problems;
  }
  if (!isSplitKind(split)) {
    problems.push(problem("BAD_SPLIT_KIND", "split", "unknown split kind"));
    return problems;
  }
  if ((split as Split).kind === "equal") {
    return problems; // no per-participant values needed
  }
  if (!((split as any).values) || typeof (split as any).values !== "object") {
    problems.push(
      problem("NO_SPLIT_VALUES", "split", (split as Split).kind + " split needs values")
    );
    return problems;
  }
  if (Array.isArray(participants)) {
    for (let i = 0; i < (participants as string[]).length; i++) {
      const pid = (participants as string[])[i];
      if (!(pid in (split as SplitValued).values)) {
        problems.push(
          problem("MISSING_SPLIT_VALUE", "split", "missing value for " + pid)
        );
      }
    }
  }
  if ((split as Split).kind === "percentage") {
    const totalPct = sumValues((split as SplitValued).values);
    if (Math.abs(totalPct - 100) > 0.001) {
      problems.push(
        problem("PERCENT_NOT_100", "split", "percentages must sum to 100")
      );
    }
  }
  if ((split as Split).kind === "exact" && isMoney(amount)) {
    const total = sumExactValues((split as SplitValued).values, (amount as Money).currency);
    if (!equals(total, amount as Money)) {
      problems.push(
        problem("EXACT_MISMATCH", "split", "exact amounts must sum to total")
      );
    }
  }
  return problems;
}

function normalizeSplit(split: Split, participants: string[]): Split {
  if (split.kind === "equal") {
    return { kind: "equal" };
  }
  const values: Record<string, number | Money> = {};
  const keys = Object.keys(split.values);
  for (let i = 0; i < keys.length; i++) {
    values[keys[i]] = split.values[keys[i]];
  }
  return { kind: split.kind, values: values };
}

// Total of a list of expenses in a currency (used by group summaries).
export function totalOf(expenses: Expense[], currency?: string): Money {
  const cur = currency || DEFAULT_CURRENCY;
  let acc = zero(cur);
  for (let i = 0; i < expenses.length; i++) {
    acc = add(acc, expenses[i].amount);
  }
  return acc;
}

// --- small local helpers -------------------------------------------------

function problem(code: string, field: string, message: string, warning?: boolean): ValidationProblem {
  return { code: code, field: field, message: message, warning: !!warning };
}

function isMoney(x: unknown): x is Money {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Money).amountMinor === "number" &&
    typeof (x as Money).currency === "string"
  );
}

function hasDuplicates(list: string[]): boolean {
  return new Set(list).size !== list.length;
}

function sumValues(obj: Record<string, number>): number {
  let t = 0;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    t += Number(obj[keys[i]]) || 0;
  }
  return t;
}

function sumExactValues(obj: Record<string, number | Money>, currency: string): Money {
  let acc = zero(currency);
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const v = obj[keys[i]];
    acc = add(acc, isMoney(v) ? v : money(0, currency));
  }
  return acc;
}

function normalizeDate(value: Date | string | number | undefined): Date {
  if (value === undefined || value === null) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}