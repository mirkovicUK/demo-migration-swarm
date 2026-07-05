// test/money.test.ts — the hot module's tests. ESM + Vitest
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
} from '../js/money.js';

describe('fromDecimal rounds to the currency precision', () => {
  it('USD rounds correctly', () => {
    expect(fromDecimal(12.34, 'USD').amountMinor).toBe(1234);
    expect(fromDecimal(12.345, 'USD').amountMinor).toBe(1235); // half away from zero
  });

  it('JPY handles zero-minor-unit currency', () => {
    expect(fromDecimal(1000, 'JPY').amountMinor).toBe(1000);
  });
});

describe('toDecimal is the inverse of fromDecimal', () => {
  it('EUR conversion is accurate', () => {
    expect(toDecimal(fromDecimal(99.99, 'EUR'))).toBe(99.99);
  });
});

describe('add and subtract require the same currency', () => {
  it('USD addition works', () => {
    expect(add(money(100, 'USD'), money(50, 'USD')).amountMinor).toBe(150);
  });

  it('Throws on currency mismatch', () => {
    expect(() => add(money(1, 'USD'), money(1, 'EUR'))).toThrow(/currency mismatch/);
  });
});

describe('multiply rounds to minor units', () => {
  it('USD multiplication is correct', () => {
    expect(multiply(money(1000, 'USD'), 0.333).amountMinor).toBe(333);
  });
});

describe('compare and equals behave', () => {
  it('USD comparison works', () => {
    expect(compare(money(1, 'USD'), money(2, 'USD'))).toBe(-1);
  });

  it('Equals checks both value and currency', () => {
    expect(equals(money(5, 'USD'), money(5, 'USD'))).toBe(true);
    expect(equals(money(5, 'USD'), money(5, 'EUR'))).toBe(false);
  });
});

describe('sum totals a list in one currency', () => {
  it('USD summation is correct', () => {
    const total = sum([money(100, 'USD'), money(200, 'USD'), money(50, 'USD')]);
    expect(total.amountMinor).toBe(350);
  });
});

describe('allocate splits exactly with no lost cents', () => {
  it('USD allocation with equal weights', () => {
    const parts = allocate(money(1000, 'USD'), [1, 1, 1]);
    expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
    expect(sum(parts).amountMinor).toBe(1000);
  });
});

describe('allocate respects integer weights', () => {
  it('USD allocation with weighted distribution', () => {
    const parts = allocate(money(1000, 'USD'), [3, 1]); // 75% / 25%
    expect(parts.map((p) => p.amountMinor)).toEqual([750, 250]);
  });
});

describe('allocate rejects all-zero weights', () => {
  it('Throws on invalid weight distribution', () => {
    expect(() => allocate(money(100, 'USD'), [0, 0])).toThrow(/not all be zero|must not all be zero/);
  });
});