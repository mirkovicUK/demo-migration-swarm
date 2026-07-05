import type { Money } from './money.js';
import type { Expense } from './expense.js';
import { money, zero, add, subtract, negate, isZero, isPositive, isNegative, compare, DEFAULT_CURRENCY } from './money.js';
import { computeShares, sharesSumTo } from './split.js';

export interface Transfer {
  from: string;
  to: string;
  amount: Money;
}

export interface SettlementSummary {
  balances: Record<string, Money>;
  transfers: Transfer[];
  transferCount: number;
}

export interface SettlementValidation {
  settled: boolean;
  residual: Record<string, Money>;
}

function resolveCurrency(expenses: Expense[], currency?: string): string {
  if (currency) return currency;
  if (expenses.length > 0 && expenses[0].amount) {
    return expenses[0].amount.currency;
  }
  return DEFAULT_CURRENCY;
}

export function computeBalances(expenses: Expense[], currency?: string): Record<string, Money> {
  const cur = resolveCurrency(expenses, currency);
  const net: Record<string, Money> = {};

  function bump(id: string, delta: Money): void {
    if (!net[id]) net[id] = zero(cur);
    net[id] = add(net[id], delta);
  }

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const shares = computeShares(expense);
    if (!sharesSumTo(shares, expense.amount)) {
      throw new Error("shares do not sum to amount for expense " + expense.id);
    }
    bump(expense.paidBy, expense.amount);
    const ids = Object.keys(shares);
    for (let j = 0; j < ids.length; j++) {
      bump(ids[j], negate(shares[ids[j]]));
    }
  }
  return net;
}

export function simplifyDebts(balances: Record<string, Money>): Transfer[] {
  const entries = Object.keys(balances).map((id) => ({
    id: id,
    balance: balances[id],
  }));
  if (entries.length === 0) return [];

  const currency = entries[0].balance.currency;
  const creditors: { id: string; amount: Money }[] = [];
  const debtors: { id: string; amount: Money }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (isPositive(e.balance)) {
      creditors.push({ id: e.id, amount: e.balance });
    } else if (isNegative(e.balance)) {
      debtors.push({ id: e.id, amount: negate(e.balance) });
    }
  }

  creditors.sort((a, b) => compare(b.amount, a.amount));
  debtors.sort((a, b) => compare(b.amount, a.amount));

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const pay = minMoney(credit.amount, debt.amount);
    if (isPositive(pay)) {
      transfers.push({ from: debt.id, to: credit.id, amount: pay });
    }
    credit.amount = subtract(credit.amount, pay);
    debt.amount = subtract(debt.amount, pay);
    if (isZero(credit.amount)) ci++;
    if (isZero(debt.amount)) di++;
  }
  return transfers;
}

export function settlementSummary(expenses: Expense[], currency?: string): SettlementSummary {
  const balances = computeBalances(expenses, currency);
  const transfers = simplifyDebts(balances);
  return {
    balances: balances,
    transfers: transfers,
    transferCount: transfers.length,
  };
}

export function balanceFor(balances: Record<string, Money>, memberId: string): Money {
  return balances[memberId] || zero(DEFAULT_CURRENCY);
}

export function debtMatrix(expenses: Expense[], currency?: string): Record<string, Record<string, Money>> {
  const cur = resolveCurrency(expenses, currency);
  const matrix: Record<string, Record<string, Money>> = {};

  function owe(debtor: string, creditor: string, amount: Money): void {
    if (debtor === creditor) return;
    if (!matrix[debtor]) matrix[debtor] = {};
    if (!matrix[debtor][creditor]) matrix[debtor][creditor] = zero(cur);
    matrix[debtor][creditor] = add(matrix[debtor][creditor], amount);
  }

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const shares = computeShares(expense);
    const ids = Object.keys(shares);
    for (let j = 0; j < ids.length; j++) {
      owe(ids[j], expense.paidBy, shares[ids[j]]);
    }
  }
  return matrix;
}

export function totalTransferred(transfers: Transfer[]): Money {
  if (transfers.length === 0) return zero(DEFAULT_CURRENCY);
  let acc = zero(transfers[0].amount.currency);
  for (let i = 0; i < transfers.length; i++) {
    acc = add(acc, transfers[i].amount);
  }
  return acc;
}

export function validateSettlement(balances: Record<string, Money>, transfers: Transfer[]): SettlementValidation {
  const residual: Record<string, Money> = {};
  const ids = Object.keys(balances);
  for (let i = 0; i < ids.length; i++) {
    residual[ids[i]] = balances[ids[i]];
  }
  for (let i = 0; i < transfers.length; i++) {
    const t = transfers[i];
    if (!residual[t.from]) residual[t.from] = zero(t.amount.currency);
    if (!residual[t.to]) residual[t.to] = zero(t.amount.currency);
    residual[t.from] = add(residual[t.from], t.amount);
    residual[t.to] = subtract(residual[t.to], t.amount);
  }
  let settled = true;
  const rids = Object.keys(residual);
  for (let i = 0; i < rids.length; i++) {
    if (!isZero(residual[rids[i]])) {
      settled = false;
      break;
    }
  }
  return { settled: settled, residual: residual };
}

function minMoney(a: Money, b: Money): Money {
  return compare(a, b) <= 0 ? a : b;
}

export { };