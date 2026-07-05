// group.js — mutable-ish group state (members + expenses) on top of the pure
// domain modules. Depends on expense.js and balances.js. Kept as plain data +
// pure transition functions (each returns a new group) so it stays testable and
// mirrors the todo.js style of the original demo.

import { createExpense, totalOf } from "./expense.js";
import { settlementSummary } from "./balances.js";
import { DEFAULT_CURRENCY } from "./money.js";

let nextMemberId = 1;

function createGroup(name, currency) {
  return {
    id: "g" + Date.now(),
    name: name ? String(name) : "Untitled group",
    currency: currency || DEFAULT_CURRENCY,
    members: [],
    expenses: [],
  };
}

function addMember(group, displayName) {
  const member = { id: "m" + nextMemberId++, name: String(displayName) };
  return withMembers(group, group.members.concat([member]));
}

function removeMember(group, memberId) {
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

function addExpense(group, input) {
  const expense = createExpense(
    Object.assign({}, input, { amount: input.amount })
  );
  return withExpenses(group, group.expenses.concat([expense]));
}

function removeExpense(group, expenseId) {
  return withExpenses(
    group,
    group.expenses.filter((e) => e.id !== expenseId)
  );
}

function memberName(group, memberId) {
  const found = group.members.filter((m) => m.id === memberId)[0];
  return found ? found.name : memberId;
}

function groupTotal(group) {
  return totalOf(group.expenses, group.currency);
}

function groupSettlement(group) {
  return settlementSummary(group.expenses, group.currency);
}

function withMembers(group, members) {
  return Object.assign({}, group, { members: members });
}

function withExpenses(group, expenses) {
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
