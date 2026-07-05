// expense.ts — the Expense domain model. Depends on money.ts (import edge →
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
  type Money,
} from "./money.js";

let nextExpenseId = 1;

// Split kinds an Expense may carry. split.ts knows how to turn each of these
// into concrete per-participant Money shares.
export const SPLIT_KINDS = ["equal", "exact", "percentage", "shares"] as const;

export type SplitKind = (typeof SPLIT_KINDS)[number];

export interface SplitRule {
  kind: SplitKind;
  values?: Record<string, number | Money>;
}

export interface ExpenseProblem {
  code: string;
  field: string;
  message: string;
  warning: boolean;
}

export interface ExpenseInput {
  description: string;
  amount: Money;
  paidBy: string;
  participants: string[];
  split: SplitRule;
  date?: Date | string | number;
  category?: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: Money;
  paidBy: string;
  participants: string[];
  split: SplitRule;
  date: Date;
  category: string;
}

export function isSplitKind(value: unknown): value is SplitKind {
  return SPLIT_KINDS.includes(value as SplitKind);
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
    (err as ExpenseProblem & { code: string; problems: ExpenseProblem[] }).code =
      problems[0].code;
    (err as ExpenseProblem & { code: string; problems: ExpenseProblem[] }).problems =
      problems;
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
export function validateExpense(input: unknown): ExpenseProblem[] {
  const problems: ExpenseProblem[] = [];
  if (!input || typeof input !== "object") {
    problems.push(
      problem("NOT_AN_OBJECT", "input", "expense must be an object")
    );
    return problems;
  }

  if (
    typeof (input as ExpenseInput).description !== "string" ||
    !(input as ExpenseInput).description?.trim()
  ) {
    problems.push(
      problem("EMPTY_DESCRIPTION", "description", "description is required")
    );
  }

  if (!isMoney(input as ExpenseInput)) {
    problems.push(problem("BAD_AMOUNT", "amount", "amount must be a Money"));
  } else if (!isPositive(input as ExpenseInput)) {
    problems.push(
      problem("NON_POSITIVE_AMOUNT", "amount", "amount must be positive")
    );
  }

  if (
    typeof (input as ExpenseInput).paidBy !== "string" ||
    !(input as ExpenseInput).paidBy
  ) {
    problems.push(problem("NO_PAYER", "paidBy", "paidBy is required"));
  }

  if (
    !Array.isArray((input as ExpenseInput).participants) ||
    (input as ExpenseInput).participants.length === 0
  ) {
    problems.push(
      problem("NO_PARTICIPANTS", "participants", "at least one participant")
    );
  } else {
    if (hasDuplicates((input as ExpenseInput).participants)) {
      problems.push(
        problem("DUP_PARTICIPANTS", "participants", "duplicate participant")
      );
    }
    if (
      (input as ExpenseInput).paidBy &&
      (input as ExpenseInput).participants.indexOf(
        (input as ExpenseInput).paidBy
      ) === -1
    ) {
      // The payer is allowed to not be a participant (they paid for others),
      // but it is a common mistake, so surface it as a soft warning code.
      problems.push(
        problem(
          "PAYER_NOT_PARTICIPANT",
          "paidBy",
          "payer is not sharing",
          true
        )
      );
    }
  }

  const splitProblems = validateSplit(
    (input as ExpenseInput).split,
    (input as ExpenseInput).participants,
    (input as ExpenseInput).amount
  );
  for (let i = 0; i < splitProblems.length; i++) {
    problems.push(splitProblems[i]);
  }

  // A soft warning must never block creation on its own; drop warnings if there
  // are no hard problems so createExpense() succeeds for the payer-not-sharing
  // case but a UI can still call validateExpense() to show them.
  const hard = problems.filter((p) => !p.warning);
  return hard.length > 0 ? hard : [];
}

export function validateSplit(
  split: unknown,
  participants: string[] | undefined,
  amount: unknown
): ExpenseProblem[] {
  const problems: ExpenseProblem[] = [];
  if (!split || typeof split !== "object") {
    problems.push(problem("NO_SPLIT", "split", "split is required"));
    return problems;
  }
  if (!isSplitKind(split as SplitRule)) {
    problems.push(problem("BAD_SPLIT_KIND", "split", "unknown split kind"));
    return problems;
  }
  if ((split as SplitRule).kind === "equal") {
    return problems; // no per-participant values needed
  }
  if (
    !(split as SplitRule).values ||
    typeof (split as SplitRule).values !== "object"
  ) {
    problems.push(
      problem(
        "NO_SPLIT_VALUES",
        "split",
        `${(split as SplitRule).kind} split needs values`
      )
    );
    return problems;
  }
  if (Array.isArray(participants)) {
    for (let i = 0; i < participants.length; i++) {
      const pid = participants[i];
      if (!((split as SplitRule).values?.hasOwnProperty(pid))) {
        problems.push(
          problem(
            "MISSING_SPLIT_VALUE",
            "split",
            `missing value for ${pid}`
          )
        );
      }
    }
  }
  if ((split as SplitRule).kind === "percentage") {
    const totalPct = sumValues((split as SplitRule).values || {});
    if (Math.abs(totalPct - 100) > 0.001) {
      problems.push(
        problem("PERCENT_NOT_100", "split", "percentages must sum to 100")
      );
    }
  }
  if ((split as SplitRule).kind === "exact" && isMoney(amount)) {
    const total = sumExactValues(
      (split as SplitRule).values || {},
      (amount as Money).currency
    );
    if (!equals(total, amount as Money)) {
      problems.push(
        problem(
          "EXACT_MISMATCH",
          "split",
          "exact amounts must sum to total"
        )
      );
    }
  }
  return problems;
}

function normalizeSplit(split: SplitRule, participants: string[]): SplitRule {
  if (split.kind === "equal") {
    return { kind: "equal" };
  }
  const values: Record<string, number | Money> = {};
  const keys = Object.keys(split.values || {});
  for (let i = 0; i < keys.length; i++) {
    values[keys[i]] = (split.values && split.values[keys[i]]) || 0;
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

function problem(
  code: string,
  field: string,
  message: string,
  warning?: boolean
): ExpenseProblem {
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