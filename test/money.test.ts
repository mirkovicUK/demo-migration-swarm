// money.test.ts — the hot module's tests. ESM + Node's built-in test runner
// (node --test). The migration converts these to Vitest.
import { test } from "vitest";
import { expect } from "vitest";
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
} from "../js/money";

test("fromDecimal rounds to the currency precision", () => {
  expect(fromDecimal(12.34, "USD").amountMinor).toBe(1234);
  expect(fromDecimal(12.345, "USD").amountMinor).toBe(1235); // half away from zero
  expect(fromDecimal(1000, "JPY").amountMinor).toBe(1000); // 0-minor-unit currency
});

test("toDecimal is the inverse of fromDecimal", () => {
  expect(toDecimal(fromDecimal(99.99, "EUR"))).toBe(99.99);
});

test("add and subtract require the same currency", () => {
  expect(add(money(100, "USD"), money(50, "USD")).amountMinor).toBe(150);
  expect(() => add(money(1, "USD"), money(1, "EUR"))).toThrow(/currency mismatch/);
});

test("multiply rounds to minor units", () => {
  expect(multiply(money(1000, "USD"), 0.333).amountMinor).toBe(333);
});

test("compare and equals behave", () => {
  expect(compare(money(1, "USD"), money(2, "USD"))).toBe(-1);
  expect(equals(money(5, "USD"), money(5, "USD"))).toBe(true);
  expect(equals(money(5, "USD"), money(5, "EUR"))).toBe(false);
});

test("sum totals a list in one currency", () => {
  const total = sum([money(100, "USD"), money(200, "USD"), money(50, "USD")]);
  expect(total.amountMinor).toBe(350);
});

test("allocate splits exactly with no lost cents", () => {
  // 10.00 USD three ways → 3.34 / 3.33 / 3.33 (remainder to earliest)
  const parts = allocate(money(1000, "USD"), [1, 1, 1]);
  expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
  expect(sum(parts).amountMinor).toBe(1000);
});

test("allocate respects integer weights", () => {
  const parts = allocate(money(1000, "USD"), [3, 1]); // 75% / 25%
  expect(parts.map((p) => p.amountMinor)).toEqual([750, 250]);
});

test("allocate rejects all-zero weights", () => {
  expect(() => allocate(money(100, "USD"), [0, 0])).toThrow(
    /not all be zero|must not all be zero/
  );
});