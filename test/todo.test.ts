// todo.test.ts - unit tests for the pure todo.ts state-transition functions.
// Run with: vitest run test/

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
  assert.strictEqual(todo.text, "buy milk");
  assert.strictEqual(todo.done, false);
  assert.strictEqual(typeof todo.id, "number");
});

test("createTodo rejects empty text", () => {
  assert.throws(() => createTodo("   "), /must not be empty/);
});

test("addTodo appends without mutating the original array", () => {
  const original = [];
  const next = addTodo(original, "task 1");
  assert.strictEqual(original.length, 0);
  assert.strictEqual(next.length, 1);
  assert.strictEqual(next[0].text, "task 1");
});

test("toggleTodo flips done for the matching id only", () => {
  const a = createTodo("a");
  const b = createTodo("b");
  const todos = [a, b];
  const toggled = toggleTodo(todos, a.id);
  assert.strictEqual(toggled.find((t) => t.id === a.id).done, true);
  assert.strictEqual(toggled.find((t) => t.id === b.id).done, false);
});

test("removeTodo drops the matching id", () => {
  const a = createTodo("a");
  const b = createTodo("b");
  const remaining = removeTodo([a, b], a.id);
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].id, b.id);
});

test("countDone counts only done todos", () => {
  const a = { ...createTodo("a"), done: true };
  const b = { ...createTodo("b"), done: false };
  const c = { ...createTodo("c"), done: true };
  assert.strictEqual(countDone([a, b, c]), 2);
});