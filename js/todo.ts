// todo.ts - pure functions for todo-list state transitions (no DOM access
// here, so this file is trivially unit-testable and a natural Migration_Unit
// boundary for the Migration Swarm demo).

let nextId = 1;

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

function createTodo(text: string): Todo {
  const trimmed = String(text).trim();
  if (!trimmed) {
    throw new Error("todo text must not be empty");
  }
  return { id: nextId++, text: trimmed, done: false };
}

function addTodo(todos: Todo[], text: string): Todo[] {
  return [...todos, createTodo(text)];
}

function toggleTodo(todos: Todo[], id: number): Todo[] {
  return todos.map((t) =>
    t.id === id ? { ...t, done: !t.done } : t
  );
}

function removeTodo(todos: Todo[], id: number): Todo[] {
  return todos.filter((t) => t.id !== id);
}

function countDone(todos: Todo[]): number {
  return todos.filter((t) => t.done).length;
}