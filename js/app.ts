// js/app.ts - wires the DOM to the pure todo.ts functions + storage.ts
// persistence. Vanilla JS, no framework, no build step (this is the
// migration source; the target is Vite + TypeScript + Vitest).

import {
  addTodo, toggleTodo, removeTodo, countDone,
} from './todo';
import { loadTodos, saveTodos } from './storage';

let todos = loadTodos();

function render(): void {
  const list = document.getElementById('todo-list') as HTMLUListElement;
  const countEl = document.getElementById('todo-count') as HTMLSpanElement;
  const doneCountEl = document.getElementById('todo-done-count') as HTMLSpanElement;

  if (!list || !countEl || !doneCountEl) {
    console.error('Required DOM elements not found');
    return;
  }

  list.innerHTML = '';

  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = todo.done ? 'done' : '';
    li.dataset.id = String(todo.id);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', () => {
      todos = toggleTodo(todos, todo.id);
      saveTodos(todos);
      render();
    });

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', () => {
      todos = removeTodo(todos, todo.id);
      saveTodos(todos);
      render();
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(removeBtn);
    list.appendChild(li);
  });

  countEl.textContent = String(todos.length);
  doneCountEl.textContent = String(countDone(todos));
}

const form = document.getElementById('todo-form') as HTMLFormElement;
const input = document.getElementById('todo-input') as HTMLInputElement;

if (!form || !input) {
  console.error('Required DOM elements not found');
} else {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    todos = addTodo(todos, value);
    saveTodos(todos);
    input.value = '';
    render();
  });

  render();
}