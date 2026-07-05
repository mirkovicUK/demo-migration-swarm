// todo.test.ts - unit tests for the pure todo.ts state-transition functions.
// Run with: vitest run

import { test, assert } from "vitest";
import {
  createTodo,
  addTodo,
  toggleTodo,
  removeTodo,
  countDone,
} from "../js/todo";

test("createTodo trims text and starts not done", () => {
  const todo = createTodo("  buy milk  ");
  assert.equal(todo.text, "buy milk");
  assert.equal(todo.done, false);
  assert.equal(typeof todo.id, "number");
});

test("createTodo rejects empty text", () => {
  assert.throws(() => createTodo("   "), /must not be empty/);
});

test("addTodo appends without mutating the original array", () => {
  const original = [];
  const next = addTodo(original, "task 1");
  assert.equal(original.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0].text, "task 1");
});

test("toggleTodo flips done for the matching id only", () => {
  const a = createTodo("a");
  const b = createTodo("b");
  const todos = [a, b];
  const toggled = toggleTodo(todos, a.id);
  assert.equal(toggled.find((t) => t.id === a.id).done, true);
  assert.equal(toggled.find((t) => t.id === b.id).done, false);
});

test("removeTodo drops the matching id", () => {
  const a = createTodo("a");
  const b = createTodo("b");
  const remaining = removeTodo([a, b], a.id);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, b.id);
});

test("countDone counts only done todos", () => {
  const a = { ...createTodo("a"), done: true };
  const b = { ...createTodo("b"), done: false };
  const c = { ...createTodo("c"), done: true };
  assert.equal(countDone([a, b, c]), 2);
});