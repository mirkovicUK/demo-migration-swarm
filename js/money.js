// money.js — the "hot" shared module. Almost every other module imports Money
// and its arithmetic, so this is the natural first Migration_Unit: once the
// swarm decides how to TYPE Money (integer minor units + currency code), every
// downstream consumer must conform to that decision. This is exactly the file
// whose migration Decision the agents recall (via the distributed vector index)
// while rewriting expense.js / split.js / balances.js.
//
// Design: money is stored as an integer number of MINOR units (cents) plus an
// ISO-4217-ish currency code. Never use floats for money. All arithmetic is
// pure and returns new Money objects; currency mismatches throw.

// Supported currencies and how many minor units make one major unit.
// (A tiny table on purpose — real apps read this from a service.)
const CURRENCY_MINOR_UNITS = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KWD: 3,
};

const DEFAULT_CURRENCY = "USD";

function minorUnitsFor(currency) {
  const digits = CURRENCY_MINOR_UNITS[currency];
  if (digits === undefined) {
    throw new Error("unsupported currency: " + currency);
  }
  return digits;
}

// Create a Money from an integer count of minor units (cents).
function money(amountMinor, currency) {
  const cur = currency || DEFAULT_CURRENCY;
  minorUnitsFor(cur); // validate currency early
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer number of minor units");
  }
  return { amountMinor: amountMinor, currency: cur };
}

// Zero in a given currency.
function zero(currency) {
  return money(0, currency || DEFAULT_CURRENCY);
}

// Build a Money from a decimal major-unit amount, e.g. fromDecimal(12.34,"USD").
// Rounds half-away-from-zero to the currency's minor-unit precision.
function fromDecimal(amountMajor, currency) {
  const cur = currency || DEFAULT_CURRENCY;
  const digits = minorUnitsFor(cur);
  if (typeof amountMajor !== "number" || !isFinite(amountMajor)) {
    throw new Error("amountMajor must be a finite number");
  }
  const factor = Math.pow(10, digits);
  const scaled = amountMajor * factor;
  const rounded =
    scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return money(rounded, cur);
}

// Convert back to a decimal major-unit number (for display / formatting).
function toDecimal(m) {
  assertMoney(m);
  const factor = Math.pow(10, minorUnitsFor(m.currency));
  return m.amountMinor / factor;
}

function assertMoney(m) {
  if (
    !m ||
    typeof m !== "object" ||
    typeof m.amountMinor !== "number" ||
    typeof m.currency !== "string"
  ) {
    throw new Error("not a Money value");
  }
}

function assertSameCurrency(a, b) {
  assertMoney(a);
  assertMoney(b);
  if (a.currency !== b.currency) {
    throw new Error(
      "currency mismatch: " + a.currency + " vs " + b.currency
    );
  }
}

function add(a, b) {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

function subtract(a, b) {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

// Multiply money by a plain (possibly fractional) factor and round to the
// currency precision. Used by percentage splits.
function multiply(m, factor) {
  assertMoney(m);
  if (typeof factor !== "number" || !isFinite(factor)) {
    throw new Error("factor must be a finite number");
  }
  const scaled = m.amountMinor * factor;
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return money(rounded, m.currency);
}

function negate(m) {
  assertMoney(m);
  return money(-m.amountMinor, m.currency);
}

function isZero(m) {
  assertMoney(m);
  return m.amountMinor === 0;
}

function isNegative(m) {
  assertMoney(m);
  return m.amountMinor < 0;
}

function isPositive(m) {
  assertMoney(m);
  return m.amountMinor > 0;
}

// Compare two Money values of the same currency: -1, 0, or 1.
function compare(a, b) {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

function equals(a, b) {
  return (
    !!a &&
    !!b &&
    a.currency === b.currency &&
    a.amountMinor === b.amountMinor
  );
}

function sum(list, currency) {
  const cur = currency || (list[0] && list[0].currency) || DEFAULT_CURRENCY;
  let acc = zero(cur);
  for (let i = 0; i < list.length; i++) {
    acc = add(acc, list[i]);
  }
  return acc;
}

// Allocate a Money amount into `weights.length` parts proportional to the
// integer weights, distributing any leftover minor units one-by-one to the
// earliest parts (the classic "largest remainder" money-split so the parts sum
// EXACTLY back to the original — no cents lost or invented). This is the tricky
// bit the tests pin down, and the reason balances.js/split.js lean on money.js.
function allocate(m, weights) {
  assertMoney(m);
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new Error("weights must be a non-empty array");
  }
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (!Number.isInteger(w) || w < 0) {
      throw new Error("weights must be non-negative integers");
    }
    total += w;
  }
  if (total === 0) {
    throw new Error("weights must not all be zero");
  }

  const parts = [];
  let allocated = 0;
  for (let i = 0; i < weights.length; i++) {
    const share = Math.floor((m.amountMinor * weights[i]) / total);
    parts.push(share);
    allocated += share;
  }

  // Distribute the remainder (there are at most weights.length-1 leftover
  // units) to the parts with the largest fractional remainder, breaking ties
  // by earliest index for determinism.
  let remainder = m.amountMinor - allocated;
  const order = [];
  for (let i = 0; i < weights.length; i++) {
    const frac = (m.amountMinor * weights[i]) / total - Math.floor((m.amountMinor * weights[i]) / total);
    order.push({ index: i, frac: frac });
  }
  order.sort((x, y) => (y.frac - x.frac) || (x.index - y.index));
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    parts[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return parts.map((p) => money(p, m.currency));
}

export {
  CURRENCY_MINOR_UNITS,
  DEFAULT_CURRENCY,
  minorUnitsFor,
  money,
  zero,
  fromDecimal,
  toDecimal,
  add,
  subtract,
  multiply,
  negate,
  isZero,
  isNegative,
  isPositive,
  compare,
  equals,
  sum,
  allocate,
};
