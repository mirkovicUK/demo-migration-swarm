// storage.ts - tiny localStorage wrapper for persisting the todo list.
// Vanilla TS, no build step, no dependencies (this is the migration source).

const STORAGE_KEY = "demo-migration-swarm.todos";

function loadTodos(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveTodos(todos: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}