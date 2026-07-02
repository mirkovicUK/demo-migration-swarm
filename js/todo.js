// todo.js - pure functions for todo-list state transitions (no DOM access
// here, so this file is trivially unit-testable and a natural Migration_Unit
// boundary for the Migration Swarm demo).

let nextId = 1;

function createTodo(text) {
  const trimmed = String(text).trim();
  if (!trimmed) {
    throw new Error("todo text must not be empty");
  }
  return { id: nextId++, text: trimmed, done: false };
}

function addTodo(todos, text) {
  return [...todos, createTodo(text)];
}

function toggleTodo(todos, id) {
  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

function removeTodo(todos, id) {
  return todos.filter((t) => t.id !== id);
}

function countDone(todos) {
  return todos.filter((t) => t.done).length;
}
