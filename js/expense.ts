import { money, zero, add, isPositive, isZero, equals, compare, DEFAULT_CURRENCY } from "./money.js";
import type { Money } from "./money.js";

let nextExpenseId = 1;

export const SPLIT_KINDS: string[] = ["equal", "exact", "percentage", "shares"];

export function isSplitKind(value: unknown): boolean {
  return SPLIT_KINDS.includes(value as string);
}

export interface SplitRule {
  kind: string;
  values?: Record<string, number | Money>;
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

export interface ValidationProblem {
  code: string;
  field: string;
  message: string;
  warning: boolean;
}

export interface ExpenseError extends Error {
  code: string;
  problems: ValidationProblem[];
}

export function createExpense(input: ExpenseInput): Expense {
  const problems = validateExpense(input);
  if (problems.length > 0) {
    const err = new Error(problems[0].message) as ExpenseError;
    err.code = problems[0].code;
    err.problems = problems;
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

  if (typeof (input as ExpenseInput).description !== "string" || !(input as ExpenseInput).description.trim()) {
    problems.push(problem("EMPTY_DESCRIPTION", "description", "description is required"));
  }

  const amount = (input as ExpenseInput).amount;
  if (!isMoney(amount)) {
    problems.push(problem("BAD_AMOUNT", "amount", "amount must be a Money"));
  } else if (!isPositive(amount)) {
    problems.push(problem("NON_POSITIVE_AMOUNT", "amount", "amount must be positive"));
  }

  const paidBy = (input as ExpenseInput).paidBy;
  if (typeof paidBy !== "string" || !paidBy) {
    problems.push(problem("NO_PAYER", "paidBy", "paidBy is required"));
  }

  const participants = (input as ExpenseInput).participants;
  if (!Array.isArray(participants) || participants.length === 0) {
    problems.push(problem("NO_PARTICIPANTS", "participants", "at least one participant"));
  } else {
    if (hasDuplicates(participants)) {
      problems.push(problem("DUP_PARTICIPANTS", "participants", "duplicate participant"));
    }
    if (paidBy && !participants.includes(paidBy)) {
      problems.push(problem("PAYER_NOT_PARTICIPANT", "paidBy", "payer is not sharing", true));
    }
  }

  const split = (input as ExpenseInput).split;
  const splitProblems = validateSplit(split, participants, amount);
  for (let i = 0; i < splitProblems.length; i++) {
    problems.push(splitProblems[i]);
  }

  const hard = problems.filter((p) => !p.warning);
  return hard.length > 0 ? hard : [];
}

export function validateSplit(split: unknown, participants: string[] | undefined, amount: unknown): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  if (!split || typeof split !== "object") {
    problems.push(problem("NO_SPLIT", "split", "split is required"));
    return problems;
  }
  if (!isSplitKind((split as SplitRule).kind)) {
    problems.push(problem("BAD_SPLIT_KIND", "split", "unknown split kind"));
    return problems;
  }
  const kind = (split as SplitRule).kind;
  if (kind === "equal") {
    return problems;
  }
  const values = (split as SplitRule).values;
  if (!values || typeof values !== "object") {
    problems.push(problem("NO_SPLIT_VALUES", "split", kind + " split needs values"));
    return problems;
  }
  if (Array.isArray(participants)) {
    for (let i = 0; i < participants.length; i++) {
      const pid = participants[i];
      if (!(pid in values)) {
        problems.push(problem("MISSING_SPLIT_VALUE", "split", "missing value for " + pid));
      }
    }
  }
  if (kind === "percentage") {
    const totalPct = sumValues(values);
    if (Math.abs(totalPct - 100) > 0.001) {
      problems.push(problem("PERCENT_NOT_100", "split", "percentages must sum to 100"));
    }
  }
  if (kind === "exact" && isMoney(amount)) {
    const total = sumExactValues(values, amount.currency);
    if (!equals(total, amount)) {
      problems.push(problem("EXACT_MISMATCH", "split", "exact amounts must sum to total"));
    }
  }
  return problems;
}

export function totalOf(expenses: Expense[], currency?: string): Money {
  const cur = currency || DEFAULT_CURRENCY;
  let acc = zero(cur);
  for (let i = 0; i < expenses.length; i++) {
    acc = add(acc, expenses[i].amount);
  }
  return acc;
}

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

function sumValues(obj: Record<string, number | Money>): number {
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

export function normalizeSplit(split: SplitRule, participants: string[]): SplitRule {
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