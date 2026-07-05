// storage.js — localStorage persistence for a group, plus lazy export/import.
// Imports Money from the barrel (index.js) so it participates in the re-export
// edge, and uses a DYNAMIC import() to pull in backup.js only when needed.

import { money } from "./index.js";

const STORAGE_KEY = "demo-migration-swarm.group";

function saveGroup(group) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return true;
  } catch (err) {
    return false;
  }
}

function loadGroup() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Rebuild amounts so integer-minor-unit invariants hold after a reload.
    const expenses = (parsed.expenses || []).map((e) =>
      Object.assign({}, e, {
        amount: money(Math.round(e.amount.amountMinor), e.amount.currency),
      })
    );
    return Object.assign({}, parsed, { expenses: expenses });
  } catch (err) {
    return null;
  }
}

function clearGroup() {
  window.localStorage.removeItem(STORAGE_KEY);
}

// Lazily load the backup module and export the group as a downloadable blob.
async function exportGroupToJSON(group) {
  const backup = await import("./backup.js");
  return JSON.stringify(backup.exportGroup(group), null, 2);
}

async function importGroupFromJSON(text) {
  const backup = await import("./backup.js");
  return backup.importGroup(JSON.parse(text));
}

export {
  STORAGE_KEY,
  saveGroup,
  loadGroup,
  clearGroup,
  exportGroupToJSON,
  importGroupFromJSON,
};
