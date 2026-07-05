// storage.ts - tiny localStorage wrapper for persisting the todo list.
// Vanilla JS, no build step, no dependencies (this is the migration source).

const STORAGE_KEY = "demo-migration-swarm.todos";

export function loadTodos(): Array<any> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function saveTodos(todos: Array<any>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}