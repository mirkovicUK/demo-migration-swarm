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
} from '../js/money';

describe('fromDecimal rounds to the currency precision', () => {
  it('rounds correctly for USD', () => {
    expect(fromDecimal(12.34, 'USD').amountMinor).toBe(1234);
    expect(fromDecimal(12.345, 'USD').amountMinor).toBe(1235); // half away from zero
  });

  it('handles JPY (0-minor-unit currency)', () => {
    expect(fromDecimal(1000, 'JPY').amountMinor).toBe(1000);
  });
});

describe('toDecimal is the inverse of fromDecimal', () => {
  it('converts back correctly', () => {
    expect(toDecimal(fromDecimal(99.99, 'EUR'))).toBe(99.99);
  });
});

describe('add and subtract require the same currency', () => {
  it('adds correctly with same currency', () => {
    expect(add(money(100, 'USD'), money(50, 'USD')).amountMinor).toBe(150);
  });

  it('throws on currency mismatch', () => {
    expect(() => add(money(1, 'USD'), money(1, 'EUR'))).toThrow(/currency mismatch/);
  });
});

describe('multiply rounds to minor units', () => {
  it('rounds correctly', () => {
    expect(multiply(money(1000, 'USD'), 0.333).amountMinor).toBe(333);
  });
});

describe('compare and equals behave', () => {
  it('compares correctly', () => {
    expect(compare(money(1, 'USD'), money(2, 'USD'))).toBe(-1);
    expect(equals(money(5, 'USD'), money(5, 'USD'))).toBe(true);
    expect(equals(money(5, 'USD'), money(5, 'EUR'))).toBe(false);
  });
});

describe('sum totals a list in one currency', () => {
  it('sums correctly', () => {
    const total = sum([money(100, 'USD'), money(200, 'USD'), money(50, 'USD')]);
    expect(total.amountMinor).toBe(350);
  });
});

describe('allocate splits exactly with no lost cents', () => {
  it('splits correctly with equal weights', () => {
    const parts = allocate(money(1000, 'USD'), [1, 1, 1]);
    expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
    expect(sum(parts).amountMinor).toBe(1000);
  });
});

describe('allocate respects integer weights', () => {
  it('splits with weighted distribution', () => {
    const parts = allocate(money(1000, 'USD'), [3, 1]); // 75% / 25%
    expect(parts.map((p) => p.amountMinor)).toEqual([750, 250]);
  });
});

describe('allocate rejects all-zero weights', () => {
  it('throws on all-zero weights', () => {
    expect(() => allocate(money(100, 'USD'), [0, 0])).toThrow(/not all be zero|must not all be zero/);
  });
});