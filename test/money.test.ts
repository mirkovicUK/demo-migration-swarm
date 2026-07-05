// test/money.test.ts — the hot module's tests. Vitest tests for money functionality.
import { describe, it, expect } from 'vitest';

import {
  money,
  zero,
  fromDecimal,
  toDecimal,
  add,
  subtract,
  multiply,
  compare,
  equals,
  sum,
  allocate,
} from '../js/money';

describe('fromDecimal rounds to the currency precision', () => {
  it('converts decimal amounts to minor units with proper rounding', () => {
    expect(fromDecimal(12.34, "USD").amountMinor).toBe(1234);
    expect(fromDecimal(12.345, "USD").amountMinor).toBe(1235); // half away from zero
    expect(fromDecimal(1000, "JPY").amountMinor).toBe(1000); // 0-minor-unit currency
  });
});

describe('toDecimal is the inverse of fromDecimal', () => {
  it('converts minor units back to decimal amounts', () => {
    expect(toDecimal(fromDecimal(99.99, "EUR"))).toBe(99.99);
  });
});

describe('add and subtract require the same currency', () => {
  it('performs arithmetic operations on same-currency Moneys', () => {
    expect(add(money(100, "USD"), money(50, "USD")).amountMinor).toBe(150);
    expect(() => add(money(1, "USD"), money(1, "EUR"))).toThrow(/currency mismatch/);
  });
});

describe('multiply rounds to minor units', () => {
  it('scales Money amounts with proper rounding', () => {
    expect(multiply(money(1000, "USD"), 0.333).amountMinor).toBe(333);
  });
});

describe('compare and equals behave', () => {
  it('correctly compares Money values and checks equality', () => {
    expect(compare(money(1, "USD"), money(2, "USD"))).toBe(-1);
    expect(equals(money(5, "USD"), money(5, "USD"))).toBeTruthy();
    expect(equals(money(5, "USD"), money(5, "EUR"))).toBeFalsy();
  });
});

describe('sum totals a list in one currency', () => {
  it('calculates the total of Moneys in the same currency', () => {
    const total = sum([money(100, "USD"), money(200, "USD"), money(50, "USD")]);
    expect(total.amountMinor).toBe(350);
  });
});

describe('allocate splits exactly with no lost cents', () => {
  it('distributes amounts according to integer weights with proper rounding', () => {
    // 10.00 USD three ways → 3.34 / 3.33 / 3.33 (remainder to earliest)
    const parts = allocate(money(1000, "USD"), [1, 1, 1]);
    expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
    expect(sum(parts).amountMinor).toBe(1000);
  });
});

describe('allocate respects integer weights', () => {
  it('distributes amounts proportionally according to weight ratios', () => {
    const parts = allocate(money(1000, "USD"), [3, 1]); // 75% / 25%
    expect(parts.map((p) => p.amountMinor)).toEqual([750, 250]);
  });
});

describe('allocate rejects all-zero weights', () => {
  it('throws an error when all weights are zero', () => {
    expect(() => allocate(money(100, "USD"), [0, 0])).toThrow(/not all be zero|must not all be zero/);
  });
});