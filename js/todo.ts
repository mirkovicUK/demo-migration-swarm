// todo.ts - pure functions for todo-list state transitions (no DOM access
// here, so this file is trivially unit-testable and a natural Migration_Unit
// boundary for the Migration Swarm demo).

let nextId = 1;

function createTodo(text: string): { id: number; text: string; done: boolean } {
  const trimmed = String(text).trim();
  if (!trimmed) {
    throw new Error("todo text must not be empty");
  }
  return { id: nextId++, text: trimmed, done: false };
}

function addTodo(todos: Array<{ id: number; text: string; done: boolean }>, text: string): Array<{ id: number; text: string; done: boolean }> {
  return [...todos, createTodo(text)];
}

function toggleTodo(todos: Array<{ id: number; text: string; done: boolean }>, id: number): Array<{ id: number; text: string; done: boolean }> {
  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

function removeTodo(todos: Array<{ id: number; text: string; done: boolean }>, id: number): Array<{ id: number; text: string; done: boolean }> {
  return todos.filter((t) => t.id !== id);
}

function countDone(todos: Array<{ id: number; text: string; done: boolean }>): number {
  return todos.filter((t) => t.done).length;
}

export { createTodo, addTodo, toggleTodo, removeTodo, countDone };