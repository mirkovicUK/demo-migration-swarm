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

export const SPLIT_KINDS = ["equal", "exact", "percentage", "shares"] as const;

export type SplitKind = (typeof SPLIT_KINDS)[number];

export interface SplitRule { kind: SplitKind; values?: Record<string, number | Money>; }

export interface ExpenseInput { description: string; amount: Money; paidBy: string; participants: string[]; split: SplitRule; date?: Date | string | number; category?: string; }

export interface ValidationProblem { code: string; field: string; message: string; warning: boolean; }

export interface ExpenseError extends Error { code: string; problems: ValidationProblem[]; }

export interface Expense { id: number; description: string; amount: Money; paidBy: string; participants: string[]; split: SplitRule; date: Date; category: string; }

export function isSplitKind(value: unknown): value is SplitKind {
  return SPLIT_KINDS.includes(value as SplitKind);
}

function problem(code: string, field: string, message: string, warning?: boolean): ValidationProblem {
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

export function createExpense(input: ExpenseInput): Expense {
  const problems = validateExpense(input);
  if (problems.length > 0) {
    const err = new Error(problems[0].message);
    (err as ExpenseError).code = problems[0].code;
    (err as ExpenseError).problems = problems;
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

export function validateExpense(input: unknown): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  if (!input || typeof input !== "object") {
    problems.push(problem("NOT_AN_OBJECT", "input", "expense must be an object"));
    return problems;
  }

  const castedInput = input as Partial<ExpenseInput>;
  
  if (typeof castedInput.description !== "string" || !castedInput.description?.trim()) {
    problems.push(problem("EMPTY_DESCRIPTION", "description", "description is required"));
  }

  if (!isMoney(castedInput.amount)) {
    problems.push(problem("BAD_AMOUNT", "amount", "amount must be a Money"));
  } else if (!isPositive(castedInput.amount)) {
    problems.push(problem("NON_POSITIVE_AMOUNT", "amount", "amount must be positive"));
  }

  if (typeof castedInput.paidBy !== "string" || !castedInput.paidBy) {
    problems.push(problem("NO_PAYER", "paidBy", "paidBy is required"));
  }

  if (!Array.isArray(castedInput.participants) || castedInput.participants?.length === 0) {
    problems.push(problem("NO_PARTICIPANTS", "participants", "at least one participant"));
  } else {
    if (hasDuplicates(castedInput.participants!)) {
      problems.push(problem("DUP_PARTICIPANTS", "participants", "duplicate participant"));
    }
    if (
      castedInput.paidBy &&
      castedInput.participants &&
      castedInput.participants.indexOf(castedInput.paidBy) === -1
    ) {
      problems.push(problem("PAYER_NOT_PARTICIPANT", "paidBy", "payer is not sharing", true));
    }
  }

  const splitProblems = validateSplit(castedInput.split, castedInput.participants, castedInput.amount);
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
): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  if (!split || typeof split !== "object") {
    problems.push(problem("NO_SPLIT", "split", "split is required"));
    return problems;
  }
  
  const castedSplit = split as SplitRule;
  
  if (!isSplitKind(castedSplit.kind)) {
    problems.push(problem("BAD_SPLIT_KIND", "split", "unknown split kind"));
    return problems;
  }
  if (castedSplit.kind === "equal") {
    return problems;
  }
  if (!castedSplit.values || typeof castedSplit.values !== "object") {
    problems.push(
      problem("NO_SPLIT_VALUES", "split", castedSplit.kind + " split needs values")
    );
    return problems;
  }
  
  if (Array.isArray(participants)) {
    for (let i = 0; i < participants.length; i++) {
      const pid = participants[i];
      if (!(pid in castedSplit.values)) {
        problems.push(problem("MISSING_SPLIT_VALUE", "split", "missing value for " + pid));
      }
    }
  }
  if (castedSplit.kind === "percentage") {
    const totalPct = sumValues(castedSplit.values as Record<string, number>);
    if (Math.abs(totalPct - 100) > 0.001) {
      problems.push(problem("PERCENT_NOT_100", "split", "percentages must sum to 100"));
    }
  }
  if (castedSplit.kind === "exact" && isMoney(amount)) {
    const total = sumExactValues(castedSplit.values!, amount.currency);
    if (!equals(total, amount)) {
      problems.push(problem("EXACT_MISMATCH", "split", "exact amounts must sum to total"));
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
    values[keys[i]] = split.values![keys[i]];
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