// parse.ts — the deliberately messy / ambiguous module. It parses free-text
// user input ("dinner 42.50 usd") into a structured draft. It uses:
//   - a CONDITIONAL-SHAPE return (a discriminated union: {ok:true,value} vs
//     {ok:false,error}) — genuinely awkward to type, and a good stress test for
//     the migration to model as a union rather than `any`;
//   - DYNAMIC PROPERTY ACCESS over a config map (aliases[token]) — under
//     non-strict TS this stays implicit-any, which is realistic;
//   - loose coercions (== , Number(...)) on purpose.
// Depends on money.ts.

import { fromDecimal, DEFAULT_CURRENCY, CURRENCY_MINOR_UNITS, Money } from "./money.js";

export interface ParseSuccess {
  ok: true;
  value: { description: string; amount: Money };
}

export interface ParseFailure {
  ok: false;
  error: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

// token aliases → canonical currency codes; accessed dynamically by user token.
export const CURRENCY_ALIASES: Record<string, string> = {
  $: "USD",
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  "€": "EUR",
  eur: "EUR",
  euro: "EUR",
  "£": "GBP",
  gbp: "GBP",
  pound: "GBP",
  yen: "JPY",
  jpy: "JPY",
};

// Parse a line like "Groceries 42.50 eur" or "12 lunch".
// Returns { ok: true, value: { description, amount } }
//      or { ok: false, error: string }.  <-- conditional shape
export function parseExpenseLine(line: unknown): ParseResult {
  if (line == null || String(line).trim() === "") {
    return { ok: false, error: "empty input" };
  }
  const tokens = String(line).trim().split(/\s+/);

  let amountToken: string | null = null;
  let currency: string = DEFAULT_CURRENCY;
  const words: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const lower = raw.toLowerCase();

    // dynamic property access on the alias map (implicit-any under non-strict TS)
    const aliased = CURRENCY_ALIASES[lower] || CURRENCY_ALIASES[raw];
    if (aliased) {
      currency = aliased;
      continue;
    }
    if (looksNumeric(raw)) {
      amountToken = raw;
      continue;
    }
    words.push(raw);
  }

  if (amountToken == null) {
    return { ok: false, error: "no amount found" };
  }
  if (!(currency in CURRENCY_MINOR_UNITS)) {
    return { ok: false, error: "unknown currency: " + currency };
  }

  const value = {
    description: words.join(" ") || "expense",
    amount: fromDecimal(Number(amountToken), currency),
  };
  return { ok: true, value: value };
}

// Coerce a possibly-messy value into a positive integer count, or a fallback.
// (Loose on purpose — mirrors real-world defensive parsing.)
export function toCount(value: unknown, fallback?: number): number {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return fallback == null ? 1 : fallback;
  return Math.floor(n);
}

function looksNumeric(token: string): boolean {
  return /^\d+(\.\d+)?$/.test(token);
}