// todo.ts - pure functions for todo-list state transitions (no DOM access
// here, so this file is trivially unit-testable and a natural Migration_Unit
// boundary for the Migration Swarm demo).

let nextId = 1;

export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export function createTodo(text: unknown): Todo {
  const trimmed = String(text).trim();
  if (!trimmed) {
    throw new Error("todo text must not be empty");
  }
  return { id: nextId++, text: trimmed, done: false };
}

export function addTodo(todos: Todo[], text: unknown): Todo[] {
  return [...todos, createTodo(text)];
}

export function toggleTodo(todos: Todo[], id: number): Todo[] {
  return todos.map((t) =>
    t.id === id ? { ...t, done: !t.done } : t
  );
}

export function removeTodo(todos: Todo[], id: number): Todo[] {
  return todos.filter((t) => t.id !== id);
}

export function countDone(todos: Todo[]): number {
  return todos.filter((t) => t.done).length;
}