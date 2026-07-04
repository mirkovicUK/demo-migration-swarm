// todo.test.ts - unit tests for the pure todo.ts state-transition functions.
// Run with: node --test test/
// (No test framework dependency; uses Node's built-in test runner.)

import * as test from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs";
import type { Todo } from "../js/todo";
import {
  createTodo,
  addTodo,
  toggleTodo,
  removeTodo,
  countDone,
} from "../js/todo";

const { test: testFunction } = test;

testFunction("createTodo trims text and starts not done", () => {
  const todo = createTodo("  buy milk  ");
  assert.strictEqual(todo.text, "buy milk");
  assert.strictEqual(todo.done, false);
  assert.strictEqual(typeof todo.id, "number");
});

testFunction("createTodo rejects empty text", () => {
  assert.throws(() => createTodo("   "), /must not be empty/);
});

testFunction("addTodo appends without mutating the original array", () => {
  const original: Todo[] = [];
  const next = addTodo(original, "task 1");
  assert.strictEqual(original.length, 0);
  assert.strictEqual(next.length, 1);
  assert.strictEqual(next[0].text, "task 1");
});

testFunction("toggleTodo flips done for the matching id only", () => {
  const a = createTodo("a");
  const b = createTodo("b");
  const todos = [a, b];
  const toggled = toggleTodo(todos, a.id);
  assert.strictEqual(toggled.find((t) => t.id === a.id)?.done, true);
  assert.strictEqual(toggled.find((t) => t.id === b.id)?.done, false);
});

testFunction("removeTodo drops the matching id", () => {
  const a = createTodo("a");
  const b = createTodo("b");
  const remaining = removeTodo([a, b], a.id);
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].id, b.id);
});

testFunction("countDone counts only done todos", () => {
  const a: Todo = { ...createTodo("a"), done: true };
  const b: Todo = { ...createTodo("b"), done: false };
  const c: Todo = { ...createTodo("c"), done: true };
  assert.strictEqual(countDone([a, b, c]), 2);
});