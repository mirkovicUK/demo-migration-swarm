// todo.test.ts - unit tests for the pure todo.ts state-transition functions.
// Run with: vitest run

import { describe, it, expect } from 'vitest';
import { createTodo, addTodo, toggleTodo, removeTodo, countDone } from '../js/todo';

describe('createTodo trims text and starts not done', () => {
  it('trims text and initializes done as false', () => {
    const todo = createTodo('  buy milk  ');
    expect(todo.text).toBe('buy milk');
    expect(todo.done).toBe(false);
    expect(typeof todo.id).toBe('number');
  });
});

describe('createTodo rejects empty text', () => {
  it('throws error for empty text', () => {
    expect(() => createTodo('   ')).toThrow(/must not be empty/);
  });
});

describe('addTodo appends without mutating the original array', () => {
  it('appends new todo without mutating original array', () => {
    const original = [];
    const next = addTodo(original, 'task 1');
    expect(original.length).toBe(0);
    expect(next.length).toBe(1);
    expect(next[0].text).toBe('task 1');
  });
});

describe('toggleTodo flips done for the matching id only', () => {
  it('flips done status only for matching id', () => {
    const a = createTodo('a');
    const b = createTodo('b');
    const todos = [a, b];
    const toggled = toggleTodo(todos, a.id);
    expect(toggled.find((t) => t.id === a.id)?.done).toBe(true);
    expect(toggled.find((t) => t.id === b.id)?.done).toBe(false);
  });
});

describe('removeTodo drops the matching id', () => {
  it('removes todo with matching id', () => {
    const a = createTodo('a');
    const b = createTodo('b');
    const remaining = removeTodo([a, b], a.id);
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(b.id);
  });
});

describe('countDone counts only done todos', () => {
  it('counts only done todos', () => {
    const a = { ...createTodo('a'), done: true };
    const b = { ...createTodo('b'), done: false };
    const c = { ...createTodo('c'), done: true };
    expect(countDone([a, b, c])).toBe(2);
  });
});