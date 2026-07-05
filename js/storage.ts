// storage.ts - tiny localStorage wrapper for persisting the todo list.
// TypeScript module, no build step, no dependencies.

const STORAGE_KEY = "demo-migration-swarm.todos";

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

import { Todo } from './todo';