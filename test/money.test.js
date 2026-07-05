// money.test.js — the hot module's tests. ESM + Node's built-in test runner
// (node --test). The migration converts these to Vitest.
import test from "node:test";
import assert from "node:assert/strict";

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
} from "../js/money.js";

test("fromDecimal rounds to the currency precision", () => {
  assert.equal(fromDecimal(12.34, "USD").amountMinor, 1234);
  assert.equal(fromDecimal(12.345, "USD").amountMinor, 1235); // half away from zero
  assert.equal(fromDecimal(1000, "JPY").amountMinor, 1000); // 0-minor-unit currency
});

test("toDecimal is the inverse of fromDecimal", () => {
  assert.equal(toDecimal(fromDecimal(99.99, "EUR")), 99.99);
});

test("add and subtract require the same currency", () => {
  assert.equal(add(money(100, "USD"), money(50, "USD")).amountMinor, 150);
  assert.throws(() => add(money(1, "USD"), money(1, "EUR")), /currency mismatch/);
});

test("multiply rounds to minor units", () => {
  assert.equal(multiply(money(1000, "USD"), 0.333).amountMinor, 333);
});

test("compare and equals behave", () => {
  assert.equal(compare(money(1, "USD"), money(2, "USD")), -1);
  assert.ok(equals(money(5, "USD"), money(5, "USD")));
  assert.ok(!equals(money(5, "USD"), money(5, "EUR")));
});

test("sum totals a list in one currency", () => {
  const total = sum([money(100, "USD"), money(200, "USD"), money(50, "USD")]);
  assert.equal(total.amountMinor, 350);
});

test("allocate splits exactly with no lost cents", () => {
  // 10.00 USD three ways → 3.34 / 3.33 / 3.33 (remainder to earliest)
  const parts = allocate(money(1000, "USD"), [1, 1, 1]);
  assert.deepEqual(parts.map((p) => p.amountMinor), [334, 333, 333]);
  assert.equal(sum(parts).amountMinor, 1000);
});

test("allocate respects integer weights", () => {
  const parts = allocate(money(1000, "USD"), [3, 1]); // 75% / 25%
  assert.deepEqual(parts.map((p) => p.amountMinor), [750, 250]);
});

test("allocate rejects all-zero weights", () => {
  assert.throws(() => allocate(money(100, "USD"), [0, 0]), /not all be zero|must not all be zero/);
});
