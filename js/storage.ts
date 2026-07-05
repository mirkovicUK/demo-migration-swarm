// storage.ts - tiny localStorage wrapper for persisting the todo list.
// TypeScript module, no build step, no dependencies (migrated from JS).

const STORAGE_KEY = "demo-migration-swarm.todos";

export function loadTodos(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function saveTodos(todos: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}