// group.js — mutable-ish group state (members + expenses) on top of the pure
// domain modules. Depends on expense.js and balances.js. Kept as plain data +
// pure transition functions (each returns a new group) so it stays testable and
// mirrors the todo.js style of the original demo.

import { createExpense, totalOf, type Expense, type ExpenseInput } from "./expense.js";
import { settlementSummary, type SettlementSummary } from "./balances.js";
import { DEFAULT_CURRENCY, type Money } from "./money.js";

let nextMemberId = 1;

function createGroup(name?: string, currency?: string): import("./money.js").Money {
  return {
    id: "g" + Date.now(),
    name: name ? String(name) : "Untitled group",
    currency: currency || DEFAULT_CURRENCY,
    members: [],
    expenses: [],
  };
}

function addMember(group: import("./group.js").Group, displayName: string): import("./group.js").Group {
  const member = { id: "m" + nextMemberId++, name: String(displayName) };
  return withMembers(group, group.members.concat([member]));
}

function removeMember(group: import("./group.js").Group, memberId: string): import("./group.js").Group {
  // Refuse if the member is referenced by any expense (data integrity).
  const referenced = group.expenses.some(
    (e) => e.paidBy === memberId || e.participants.indexOf(memberId) !== -1
  );
  if (referenced) {
    const err = new Error("member is referenced by an expense");
    err.code = "MEMBER_IN_USE";
    throw err;
  }
  return withMembers(
    group,
    group.members.filter((m) => m.id !== memberId)
  );
}

function addExpense(group: import("./group.js").Group, input: ExpenseInput): import("./group.js").Group {
  const expense = createExpense(
    Object.assign({}, input, { amount: input.amount })
  );
  return withExpenses(group, group.expenses.concat([expense]));
}

function removeExpense(group: import("./group.js").Group, expenseId: number): import("./group.js").Group {
  return withExpenses(
    group,
    group.expenses.filter((e) => e.id !== expenseId)
  );
}

function memberName(group: import("./group.js").Group, memberId: string): string {
  const found = group.members.filter((m) => m.id === memberId)[0];
  return found ? found.name : memberId;
}

function groupTotal(group: import("./group.js").Group): import("./money.js").Money {
  return totalOf(group.expenses, group.currency);
}

function groupSettlement(group: import("./group.js").Group): SettlementSummary {
  return settlementSummary(group.expenses, group.currency);
}

function withMembers(group: import("./group.js").Group, members: import("./group.js").Member[]): import("./group.js").Group {
  return Object.assign({}, group, { members: members });
}

function withExpenses(group: import("./group.js").Group, expenses: import("./expense.js").Expense[]): import("./group.js").Group {
  return Object.assign({}, group, { expenses: expenses });
}

export {
  createGroup,
  addMember,
  removeMember,
  addExpense,
  removeExpense,
  memberName,
  groupTotal,
  groupSettlement,
};