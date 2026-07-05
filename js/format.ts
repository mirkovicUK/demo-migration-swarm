import { toDecimal, minorUnitsFor, DEFAULT_CURRENCY, type Money } from "./money.js";

function formatMoney(m: Money, locale?: string): string {
  const loc = locale || "en-US";
  const digits = minorUnitsFor(m.currency);
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toDecimal(m));
}

function formatSigned(m: Money, locale?: string): string {
  const s = formatMoney(m, locale);
  if (m.amountMinor > 0 && s.charAt(0) !== "+") {
    return "+" + s;
  }
  return s;
}

function formatDate(value: Date | string | number, locale?: string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale || "en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

function pluralize(count: number | string, noun: string): string {
  const n = Number(count) || 0;
  return n + " " + noun + (n === 1 ? "" : "s");
}

function currencyLabel(currency?: string): string {
  return (currency || DEFAULT_CURRENCY).toUpperCase();
}

export { formatMoney, formatSigned, formatDate, pluralize, currencyLabel };