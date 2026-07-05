// format.js — presentation helpers. Depends on money.js (a real import edge,
// so this becomes a child of money in the migration DAG). Pure, DOM-free.

import { toDecimal, minorUnitsFor, DEFAULT_CURRENCY } from "./money.js";

// Format a Money value as a localized currency string, e.g. "$12.34".
function formatMoney(m, locale) {
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
function formatSigned(m, locale) {
  const s = formatMoney(m, locale);
  if (m.amountMinor > 0 && s.charAt(0) !== "+") {
    return "+" + s;
  }
  return s;
}

// Short human date, e.g. "Jan 5".
function formatDate(value, locale) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale || "en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

// "3 people", "1 person" — trivially handy and used across the UI.
function pluralize(count, noun) {
  const n = Number(count) || 0;
  return n + " " + noun + (n === 1 ? "" : "s");
}

function currencyLabel(currency) {
  return (currency || DEFAULT_CURRENCY).toUpperCase();
}

export { formatMoney, formatSigned, formatDate, pluralize, currencyLabel };
