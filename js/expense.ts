import { Money, zero, add, isPositive, isZero, equals, compare, DEFAULT_CURRENCY } from "./money.js";

let nextExpenseId = 1;

export const SPLIT_KINDS: string[] = ["equal", "exact", "percentage", "shares"];

export function isSplitKind(value: unknown): boolean {
  return SPLIT_KINDS.indexOf(value as string) !== -1;
}

export interface SplitRule {
  kind: string;
  values?: Record<string, unknown>;
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

export function validateExpense(input: unknown): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  if (!input || typeof input !== "object") {
    problems.push(problem("NOT_AN_OBJECT", "input", "expense must be an object"));
    return problems;
  }

  const castInput = input as ExpenseInput;

  if (typeof castInput.description !== "string" || !castInput.description.trim()) {
    problems.push(problem("EMPTY_DESCRIPTION", "description", "description is required"));
  }

  if (!isMoney(castInput.amount)) {
    problems.push(problem("BAD_AMOUNT", "amount", "amount must be a Money"));
  } else if (!isPositive(castInput.amount)) {
    problems.push(problem("NON_POSITIVE_AMOUNT", "amount", "amount must be positive"));
  }

  if (typeof castInput.paidBy !== "string" || !castInput.paidBy) {
    problems.push(problem("NO_PAYER", "paidBy", "paidBy is required"));
  }

  if (!Array.isArray(castInput.participants) || castInput.participants.length === 0) {
    problems.push(problem("NO_PARTICIPANTS", "participants", "at least one participant"));
  } else {
    if (hasDuplicates(castInput.participants)) {
      problems.push(problem("DUP_PARTICIPANTS", "participants", "duplicate participant"));
    }
    if (castInput.paidBy && castInput.participants.indexOf(castInput.paidBy) === -1) {
      problems.push(problem("PAYER_NOT_PARTICIPANT", "paidBy", "payer is not sharing", true));
    }
  }

  const splitProblems = validateSplit(castInput.split, castInput.participants, castInput.amount);
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

  const castSplit = split as SplitRule;

  if (!isSplitKind(castSplit.kind)) {
    problems.push(problem("BAD_SPLIT_KIND", "split", "unknown split kind"));
    return problems;
  }

  if (castSplit.kind === "equal") {
    return problems;
  }

  if (!castSplit.values || typeof castSplit.values !== "object") {
    problems.push(problem("NO_SPLIT_VALUES", "split", castSplit.kind + " split needs values"));
    return problems;
  }

  if (Array.isArray(participants)) {
    for (let i = 0; i < participants.length; i++) {
      const pid = participants[i];
      if (!(pid in castSplit.values)) {
        problems.push(problem("MISSING_SPLIT_VALUE", "split", "missing value for " + pid));
      }
    }
  }

  if (castSplit.kind === "percentage") {
    const totalPct = sumValues(castSplit.values as Record<string, number>);
    if (Math.abs(totalPct - 100) > 0.001) {
      problems.push(problem("PERCENT_NOT_100", "split", "percentages must sum to 100"));
    }
  }

  if (castSplit.kind === "exact" && isMoney(amount)) {
    const total = sumExactValues(castSplit.values as Record<string, Money>, (amount as Money).currency);
    if (!equals(total, amount as Money)) {
      problems.push(problem("EXACT_MISMATCH", "split", "exact amounts must sum to total"));
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
    values[keys[i]] = (split.values as Record<string, unknown>)[keys[i]];
  }
  return { kind: split.kind, values: values };
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

function isMoney(x: any): x is Money {
  return (
    !!x &&
    typeof x === "object" &&
    typeof x.amountMinor === "number" &&
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

function sumExactValues(obj: Record<string, Money>, currency: string): Money {
  let acc = zero(currency);
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const v = obj[keys[i]];
    acc = add(acc, isMoney(v) ? v : zero(currency));
  }
  return acc;
}

function normalizeDate(value: Date | string | number | undefined): Date {
  if (value === undefined || value === null) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}