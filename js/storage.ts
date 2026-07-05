import { money } from "./index.js";

const STORAGE_KEY = "demo-migration-swarm.group";

function saveGroup(group: any): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return true;
  } catch (err) {
    return false;
  }
}

function loadGroup(): any {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const expenses = (parsed.expenses || []).map((e: any) =>
      Object.assign({}, e, {
        amount: money(Math.round(e.amount.amountMinor), e.amount.currency),
      })
    );
    return Object.assign({}, parsed, { expenses: expenses });
  } catch (err) {
    return null;
  }
}

function clearGroup(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

async function exportGroupToJSON(group: any): Promise<string> {
  const backup = await import("./backup.js");
  return JSON.stringify(backup.exportGroup(group), null, 2);
}

async function importGroupFromJSON(text: string): Promise<any> {
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