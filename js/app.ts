// app.ts — DOM wiring for the expense splitter. Top of the dependency DAG:
// imports group (state), format (display), parse (input), storage (persistence)
// and money (amount construction). No exports — this is the entry module loaded
// by index.html via <script type="module">.

import {
  createGroup,
  addMember,
  addExpense,
  removeExpense,
  memberName,
  groupTotal,
  groupSettlement,
} from "./group.js";
import { formatMoney, formatSigned, pluralize } from "./format.js";
import { parseExpenseLine } from "./parse.js";
import { saveGroup, loadGroup } from "./storage.js";
import type { Group } from "./group.js";

let group: Group = loadGroup() || seedGroup();

function seedGroup(): Group {
  let g = createGroup("Trip to Lisbon", "EUR");
  g = addMember(g, "Ada");
  g = addMember(g, "Bruno");
  g = addMember(g, "Chen");
  return g;
}

function render(): void {
  const membersEl = document.getElementById("members");
  const expensesEl = document.getElementById("expenses");
  const settleEl = document.getElementById("settlement");
  const totalEl = document.getElementById("total");
  if (!membersEl || !expensesEl || !settleEl || !totalEl) return;

  membersEl.textContent = group.members.map((m) => m.name).join(", ");
  totalEl.textContent =
    formatMoney(groupTotal(group)) + " across " + pluralize(group.members.length, "person");

  expensesEl.innerHTML = "";
  group.expenses.forEach((e) => {
    const li = document.createElement("li");
    li.textContent =
      e.description +
      " — " +
      formatMoney(e.amount) +
      " (paid by " +
      memberName(group, e.paidBy) +
      ")";
    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.addEventListener("click", () => {
      group = removeExpense(group, e.id);
      persistAndRender();
    });
    li.appendChild(btn);
    expensesEl.appendChild(li);
  });

  const summary = groupSettlement(group);
  settleEl.innerHTML = "";
  summary.transfers.forEach((t) => {
    const li = document.createElement("li");
    li.textContent =
      memberName(group, t.from) +
      " pays " +
      memberName(group, t.to) +
      " " +
      formatSigned(t.amount);
    settleEl.appendChild(li);
  });
}

function persistAndRender(): void {
  saveGroup(group);
  render();
}

function wire(): void {
  const form = document.getElementById("expense-form");
  const input = document.getElementById("expense-input") as HTMLInputElement | null;
  if (!form || !input) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const parsed = parseExpenseLine(input.value);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    const everyone = group.members.map((m) => m.id);
    group = addExpense(group, {
      description: parsed.value.description,
      amount: parsed.value.amount,
      paidBy: everyone[0],
      participants: everyone,
      split: { kind: "equal" },
    });
    input.value = "";
    persistAndRender();
  });
}

wire();
render();