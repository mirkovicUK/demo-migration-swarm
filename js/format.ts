// format.ts — presentation helpers. Depends on money.ts (a real import edge,
// so this becomes a child of money in the migration DAG). Pure, DOM-free.

import { toDecimal, minorUnitsFor, DEFAULT_CURRENCY, Money } from "./money.js";

// Format a Money value as a localized currency string, e.g. "$12.34".
export function formatMoney(m: Money, locale?: string): string {
  const loc = locale || "en-US";
  const digits = minorUnitsFor(m.currency);
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toDecimal(m));
}

// Format a signed Money as "+$1.00" / "-$1.00" for balance displays.
export function formatSigned(m: Money, locale?: string): string {
  const s = formatMoney(m, locale);
  if (m.amountMinor > 0 && s.charAt(0) !== "+") {
    return "+" + s;
  }
  return s;
}

// Short human date, e.g. "Jan 5".
export function formatDate(value: Date | string | number, locale?: string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale || "en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

// "3 people", "1 person" — trivially handy and used across the UI.
export function pluralize(count: number | string, noun: string): string {
  const n = Number(count) || 0;
  return n + " " + noun + (n === 1 ? "" : "s");
}

export function currencyLabel(currency?: string): string {
  return (currency || DEFAULT_CURRENCY).toUpperCase();
}