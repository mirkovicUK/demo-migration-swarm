import { money } from "./money.js";
import type { Group } from "./group.js";

const STORAGE_KEY = "demo-migration-swarm.group";

export function saveGroup(group: Group): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGroup(): Group | null {
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

export function clearGroup(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function exportGroupToJSON(group: Group): Promise<string> {
  const backup = await import("./backup.js");
  return JSON.stringify(backup.exportGroup(group), null, 2);
}

export async function importGroupFromJSON(text: string): Promise<Group> {
  const backup = await import("./backup.js");
  return backup.importGroup(JSON.parse(text));
}

export { STORAGE_KEY };