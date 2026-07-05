// storage.ts - tiny localStorage wrapper for persisting the todo list.
// TypeScript module, ES modules, no dependencies.

export const STORAGE_KEY = "demo-migration-swarm.todos";

export function loadTodos(): Todo[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function saveTodos(todos: Todo[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}