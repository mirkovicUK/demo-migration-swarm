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

export function isSplitKind(value: unknown): value is SplitKind {
  return SPLIT_KINDS.includes(value as SplitKind);
}

export interface SplitEqual {
  kind: "equal";
}

export interface SplitWithValues {
  kind: "exact" | "percentage" | "shares";
  values: Record<string, unknown>;
}

export type SplitRule = SplitEqual | SplitWithValues;

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

function problem(
  code: string,
  field: string,
  message: string,
  warning?: boolean
): ExpenseProblem {
  return { code, field, message, warning: !!warning };
}

function isMoney(x: unknown): x is Money {
  return (
    !!x &&
    typeof x === "object" &&
    "amountMinor" in x &&
    typeof x.amountMinor === "number" &&
    "currency" in x &&
    typeof x.currency === "string"
  );
}

function hasDuplicates(list: string[]): boolean {
  return new Set(list).size !== list.length;
}

function sumValues(obj: Record<string, unknown>): number {
  let t = 0;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    t += Number(obj[keys[i]]) || 0;
  }
  return t;
}

function sumExactValues(
  obj: Record<string, unknown>,
  currency: string
): Money {
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

export function validateExpense(
  input: unknown
): ExpenseProblem[] {
  const problems: ExpenseProblem[] = [];
  if (!input || typeof input !== "object") {
    problems.push(problem("NOT_AN_OBJECT", "input", "expense must be an object"));
    return problems;
  }

  const castInput = input as Partial<ExpenseInput>;

  if (
    typeof castInput.description !== "string" ||
    !castInput.description?.trim()
  ) {
    problems.push(
      problem("EMPTY_DESCRIPTION", "description", "description is required")
    );
  }

  if (!isMoney(castInput.amount)) {
    problems.push(problem("BAD_AMOUNT", "amount", "amount must be a Money"));
  } else if (!isPositive(castInput.amount)) {
    problems.push(
      problem("NON_POSITIVE_AMOUNT", "amount", "amount must be positive")
    );
  }

  if (typeof castInput.paidBy !== "string" || !castInput.paidBy) {
    problems.push(problem("NO_PAYER", "paidBy", "paidBy is required"));
  }

  if (
    !Array.isArray(castInput.participants) ||
    castInput.participants?.length === 0
  ) {
    problems.push(
      problem("NO_PARTICIPANTS", "participants", "at least one participant")
    );
  } else {
    if (hasDuplicates(castInput.participants!)) {
      problems.push(
        problem("DUP_PARTICIPANTS", "participants", "duplicate participant")
      );
    }
    if (
      castInput.paidBy &&
      castInput.participants &&
      castInput.participants.indexOf(castInput.paidBy) === -1
    ) {
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
    castInput.split,
    castInput.participants,
    castInput.amount
  );
  for (let i = 0; i < splitProblems.length; i++) {
    problems.push(splitProblems[i]);
  }

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

  const castSplit = split as Partial<SplitRule>;

  if (!isSplitKind(castSplit.kind)) {
    problems.push(problem("BAD_SPLIT_KIND", "split", "unknown split kind"));
    return problems;
  }

  if (castSplit.kind === "equal") {
    return problems;
  }

  if (
    !castSplit.values ||
    typeof castSplit.values !== "object"
  ) {
    problems.push(
      problem(
        "NO_SPLIT_VALUES",
        "split",
        `${castSplit.kind} split needs values`
      )
    );
    return problems;
  }

  if (Array.isArray(participants)) {
    for (let i = 0; i < participants.length; i++) {
      const pid = participants[i];
      if (!(pid in castSplit.values)) {
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

  if (castSplit.kind === "percentage") {
    const totalPct = sumValues(castSplit.values!);
    if (Math.abs(totalPct - 100) > 0.001) {
      problems.push(
        problem(
          "PERCENT_NOT_100",
          "split",
          "percentages must sum to 100"
        )
      );
    }
  }

  if (castSplit.kind === "exact" && isMoney(amount)) {
    const total = sumExactValues(castSplit.values!, amount.currency);
    if (!equals(total, amount)) {
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
  const values: Record<string, unknown> = {};
  const keys = Object.keys(split.values || {});
  for (let i = 0; i < keys.length; i++) {
    values[keys[i]] = split.values?.[keys[i]];
  }
  return { kind: split.kind, values };
}

export function totalOf(expenses: Expense[], currency?: string): Money {
  const cur = currency || DEFAULT_CURRENCY;
  let acc = zero(cur);
  for (let i = 0; i < expenses.length; i++) {
    acc = add(acc, expenses[i].amount);
  }
  return acc;
}