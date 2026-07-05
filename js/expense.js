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
} from "./money.js";

let nextExpenseId = 1;

// Split kinds an Expense may carry. split.js knows how to turn each of these
// into concrete per-participant Money shares.
const SPLIT_KINDS = ["equal", "exact", "percentage", "shares"];

function isSplitKind(value) {
  return SPLIT_KINDS.indexOf(value) !== -1;
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
function createExpense(input) {
  const problems = validateExpense(input);
  if (problems.length > 0) {
    const err = new Error(problems[0].message);
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

// Collect ALL validation problems (not just the first) so a UI can show them
// together. Returns an array of { code, field, message }.
function validateExpense(input) {
  const problems = [];
  if (!input || typeof input !== "object") {
    problems.push(problem("NOT_AN_OBJECT", "input", "expense must be an object"));
    return problems;
  }

  if (typeof input.description !== "string" || !input.description.trim()) {
    problems.push(
      problem("EMPTY_DESCRIPTION", "description", "description is required")
    );
  }

  if (!isMoney(input.amount)) {
    problems.push(problem("BAD_AMOUNT", "amount", "amount must be a Money"));
  } else if (!isPositive(input.amount)) {
    problems.push(
      problem("NON_POSITIVE_AMOUNT", "amount", "amount must be positive")
    );
  }

  if (typeof input.paidBy !== "string" || !input.paidBy) {
    problems.push(problem("NO_PAYER", "paidBy", "paidBy is required"));
  }

  if (!Array.isArray(input.participants) || input.participants.length === 0) {
    problems.push(
      problem("NO_PARTICIPANTS", "participants", "at least one participant")
    );
  } else {
    if (hasDuplicates(input.participants)) {
      problems.push(
        problem("DUP_PARTICIPANTS", "participants", "duplicate participant")
      );
    }
    if (input.paidBy && input.participants.indexOf(input.paidBy) === -1) {
      // The payer is allowed to not be a participant (they paid for others),
      // but it is a common mistake, so surface it as a soft warning code.
      problems.push(
        problem("PAYER_NOT_PARTICIPANT", "paidBy", "payer is not sharing", true)
      );
    }
  }

  const splitProblems = validateSplit(input.split, input.participants, input.amount);
  for (let i = 0; i < splitProblems.length; i++) {
    problems.push(splitProblems[i]);
  }

  // A soft warning must never block creation on its own; drop warnings if there
  // are no hard problems so createExpense() succeeds for the payer-not-sharing
  // case but a UI can still call validateExpense() to show them.
  const hard = problems.filter((p) => !p.warning);
  return hard.length > 0 ? hard : [];
}

function validateSplit(split, participants, amount) {
  const problems = [];
  if (!split || typeof split !== "object") {
    problems.push(problem("NO_SPLIT", "split", "split is required"));
    return problems;
  }
  if (!isSplitKind(split.kind)) {
    problems.push(problem("BAD_SPLIT_KIND", "split", "unknown split kind"));
    return problems;
  }
  if (split.kind === "equal") {
    return problems; // no per-participant values needed
  }
  if (!split.values || typeof split.values !== "object") {
    problems.push(
      problem("NO_SPLIT_VALUES", "split", split.kind + " split needs values")
    );
    return problems;
  }
  if (Array.isArray(participants)) {
    for (let i = 0; i < participants.length; i++) {
      const pid = participants[i];
      if (!(pid in split.values)) {
        problems.push(
          problem("MISSING_SPLIT_VALUE", "split", "missing value for " + pid)
        );
      }
    }
  }
  if (split.kind === "percentage") {
    const totalPct = sumValues(split.values);
    if (Math.abs(totalPct - 100) > 0.001) {
      problems.push(
        problem("PERCENT_NOT_100", "split", "percentages must sum to 100")
      );
    }
  }
  if (split.kind === "exact" && isMoney(amount)) {
    const total = sumExactValues(split.values, amount.currency);
    if (!equals(total, amount)) {
      problems.push(
        problem("EXACT_MISMATCH", "split", "exact amounts must sum to total")
      );
    }
  }
  return problems;
}

function normalizeSplit(split, participants) {
  if (split.kind === "equal") {
    return { kind: "equal" };
  }
  const values = {};
  const keys = Object.keys(split.values);
  for (let i = 0; i < keys.length; i++) {
    values[keys[i]] = split.values[keys[i]];
  }
  return { kind: split.kind, values: values };
}

// Total of a list of expenses in a currency (used by group summaries).
function totalOf(expenses, currency) {
  const cur = currency || DEFAULT_CURRENCY;
  let acc = zero(cur);
  for (let i = 0; i < expenses.length; i++) {
    acc = add(acc, expenses[i].amount);
  }
  return acc;
}

// --- small local helpers -------------------------------------------------

function problem(code, field, message, warning) {
  return { code: code, field: field, message: message, warning: !!warning };
}

function isMoney(x) {
  return (
    !!x &&
    typeof x === "object" &&
    typeof x.amountMinor === "number" &&
    typeof x.currency === "string"
  );
}

function hasDuplicates(list) {
  return new Set(list).size !== list.length;
}

function sumValues(obj) {
  let t = 0;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    t += Number(obj[keys[i]]) || 0;
  }
  return t;
}

function sumExactValues(obj, currency) {
  let acc = zero(currency);
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const v = obj[keys[i]];
    acc = add(acc, isMoney(v) ? v : money(0, currency));
  }
  return acc;
}

function normalizeDate(value) {
  if (value === undefined || value === null) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export {
  SPLIT_KINDS,
  isSplitKind,
  createExpense,
  validateExpense,
  validateSplit,
  totalOf,
};
