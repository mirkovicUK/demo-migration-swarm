```typescript
// todo.test.ts - unit tests for the pure todo.ts state-transition functions.
// Run with: node --test test/
// (No test framework dependency; uses Node's built-in test runner.)

import * as test from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs";

// todo.ts is written as browser globals (no module.exports), so load it into
// this test's scope the same simple way the page does: read + eval in a
// minimal sandboxed function scope. This keeps the source file itself
// framework-free, matching the "vanilla JS, no build step" migration source.
const todoSrc = fs.readFileSync(
  path.join(__dirname, "..", "ts", "todo.ts"),
  "utf8"
);
const sandbox: any = {};
new Function(
  "exports",
  todoSrc +
    "\nexports.createTodo = createTodo; exports.addTodo = addTodo; " +
    "exports.toggleTodo = toggleTodo; exports.removeTodo = removeTodo; " +
    "exports.countDone = countDone;"
)(sandbox);
const { createTodo, addTodo, toggleTodo, removeTodo, countDone } = sandbox;

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
  assert.equal(toggled.find((t: any) => t.id === a.id).done, true);
  assert.equal(toggled.find((t: any) => t.id === b.id).done, false);
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
```