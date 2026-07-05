// money.ts — the "hot" shared module. Almost every other module imports Money
// and its arithmetic, so this is the natural first Migration_Unit: once the
// swarm decides how to TYPE Money (integer minor units + currency code), every
// downstream consumer must conform to that decision. This is exactly the file
// whose migration Decision the agents recall (via the distributed vector index)
// while rewriting expense.ts / split.ts / balances.ts.
//
// Design: money is stored as an integer number of MINOR units (cents) plus an
// ISO-4217-ish currency code. Never use floats for money. All arithmetic is
// pure and returns new Money objects; currency mismatches throw.

export interface Money {
  amountMinor: number;
  currency: string;
}

export type CurrencyCode = string;

export const CURRENCY_MINOR_UNITS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KWD: 3,
};

export const DEFAULT_CURRENCY: string = "USD";

export function minorUnitsFor(currency: string): number {
  const digits = CURRENCY_MINOR_UNITS[currency];
  if (digits === undefined) {
    throw new Error("unsupported currency: " + currency);
  }
  return digits;
}

// Create a Money from an integer count of minor units (cents).
export function money(amountMinor: number, currency?: string): Money {
  const cur = currency || DEFAULT_CURRENCY;
  minorUnitsFor(cur); // validate currency early
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer number of minor units");
  }
  return { amountMinor: amountMinor, currency: cur };
}

// Zero in a given currency.
export function zero(currency?: string): Money {
  return money(0, currency || DEFAULT_CURRENCY);
}

// Build a Money from a decimal major-unit amount, e.g. fromDecimal(12.34,"USD").
// Rounds half-away-from-zero to the currency's minor-unit precision.
export function fromDecimal(amountMajor: number, currency?: string): Money {
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
export function toDecimal(m: Money): number {
  assertMoney(m);
  const factor = Math.pow(10, minorUnitsFor(m.currency));
  return m.amountMinor / factor;
}

function assertMoney(m: Money): void {
  if (
    !m ||
    typeof m !== "object" ||
    typeof m.amountMinor !== "number" ||
    typeof m.currency !== "string"
  ) {
    throw new Error("not a Money value");
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  assertMoney(a);
  assertMoney(b);
  if (a.currency !== b.currency) {
    throw new Error(
      "currency mismatch: " + a.currency + " vs " + b.currency
    );
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

// Multiply money by a plain (possibly fractional) factor and round to the
// currency precision. Used by percentage splits.
export function multiply(m: Money, factor: number): Money {
  assertMoney(m);
  if (typeof factor !== "number" || !isFinite(factor)) {
    throw new Error("factor must be a finite number");
  }
  const scaled = m.amountMinor * factor;
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return money(rounded, m.currency);
}

export function negate(m: Money): Money {
  assertMoney(m);
  return money(-m.amountMinor, m.currency);
}

export function isZero(m: Money): boolean {
  assertMoney(m);
  return m.amountMinor === 0;
}

export function isNegative(m: Money): boolean {
  assertMoney(m);
  return m.amountMinor < 0;
}

export function isPositive(m: Money): boolean {
  assertMoney(m);
  return m.amountMinor > 0;
}

// Compare two Money values of the same currency: -1, 0, or 1.
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function equals(a: Money, b: Money): boolean {
  return (
    !!a &&
    !!b &&
    a.currency === b.currency &&
    a.amountMinor === b.amountMinor
  );
}

export function sum(list: Money[], currency?: string): Money {
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
// bit the tests pin down, and the reason balances.ts/split.ts lean on money.ts.
export function allocate(m: Money, weights: number[]): Money[] {
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

  const parts: number[] = [];
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
  const order: { index: number; frac: number }[] = [];
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