// group.js — mutable-ish group state (members + expenses) on top of the pure
// domain modules. Depends on expense.js and balances.js. Kept as plain data +
// pure transition functions (each returns a new group) so it stays testable and
// mirrors the todo.js style of the original demo.

import { createExpense, totalOf, type Expense, type ExpenseInput } from "./expense.js";
import { settlementSummary, type SettlementSummary } from "./balances.js";
import { DEFAULT_CURRENCY, type Money } from "./money.js";

let nextMemberId = 1;

export interface Member {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  expenses: Expense[];
}

export interface GroupError extends Error {
  code: string;
}

export function createGroup(name?: string, currency?: string): Group {
  return {
    id: "g" + Date.now(),
    name: name ? String(name) : "Untitled group",
    currency: currency || DEFAULT_CURRENCY,
    members: [],
    expenses: [],
  };
}

export function addMember(group: Group, displayName: string): Group {
  const member = { id: "m" + nextMemberId++, name: String(displayName) };
  return withMembers(group, group.members.concat([member]));
}

export function removeMember(group: Group, memberId: string): Group {
  // Refuse if the member is referenced by any expense (data integrity).
  const referenced = group.expenses.some(
    (e) => e.paidBy === memberId || e.participants.indexOf(memberId) !== -1
  );
  if (referenced) {
    const err = new Error("member is referenced by an expense");
    err.name = "GroupError";
    (err as GroupError).code = "MEMBER_IN_USE";
    throw err;
  }
  return withMembers(
    group,
    group.members.filter((m) => m.id !== memberId)
  );
}

export function addExpense(group: Group, input: ExpenseInput): Group {
  const expense = createExpense(
    Object.assign({}, input, { amount: input.amount })
  );
  return withExpenses(group, group.expenses.concat([expense]));
}

export function removeExpense(group: Group, expenseId: number): Group {
  return withExpenses(
    group,
    group.expenses.filter((e) => e.id !== expenseId)
  );
}

export function memberName(group: Group, memberId: string): string {
  const found = group.members.filter((m) => m.id === memberId)[0];
  return found ? found.name : memberId;
}

export function groupTotal(group: Group): Money {
  return totalOf(group.expenses, group.currency);
}

export function groupSettlement(group: Group): SettlementSummary {
  return settlementSummary(group.expenses, group.currency);
}

function withMembers(group: Group, members: Member[]): Group {
  return Object.assign({}, group, { members: members });
}

function withExpenses(group: Group, expenses: Expense[]): Group {
  return Object.assign({}, group, { expenses: expenses });
}