import { fromDecimal, DEFAULT_CURRENCY, CURRENCY_MINOR_UNITS } from "./money.js";
import type { Money } from "./money.js";

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

export interface ParseSuccess {
  ok: true;
  value: { description: string; amount: Money };
}
export interface ParseFailure {
  ok: false;
  error: string;
}
export type ParseResult = ParseSuccess | ParseFailure;

export function parseExpenseLine(line: unknown): ParseResult {
  if (line == null || String(line).trim() === "") {
    return { ok: false, error: "empty input" };
  }
  const tokens = String(line).trim().split(/\s+/);

  let amountToken: string | null = null;
  let currency = DEFAULT_CURRENCY;
  const words: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const lower = raw.toLowerCase();

    const aliased =
      (CURRENCY_ALIASES[lower] as string | undefined) ||
      (CURRENCY_ALIASES[raw] as string | undefined);
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

export function toCount(value: unknown, fallback?: number): number {
  const n = Number(value);
  if (!isFinite(n) || n <= 0)
    return fallback == null ? 1 : fallback;
  return Math.floor(n);
}

function looksNumeric(token: string): boolean {
  return /^\d+(\.\d+)?$/.test(token);
}