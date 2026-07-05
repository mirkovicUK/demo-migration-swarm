// app.ts - wires the DOM to the pure todo functions + storage
import {
  addTodo, toggleTodo, removeTodo, countDone, type Todo
} from './todo';

function loadTodos(): Todo[] {
  const stored = localStorage.getItem('todos');
  return stored ? JSON.parse(stored) : [];
}

function saveTodos(todos: Todo[]): void {
  localStorage.setItem('todos', JSON.stringify(todos));
}

const form = document.getElementById('todo-form') as HTMLFormElement;
const input = document.getElementById('todo-input') as HTMLInputElement;
const list = document.getElementById('todo-list') as HTMLUListElement;
const countEl = document.getElementById('todo-count') as HTMLSpanElement;
const doneCountEl = document.getElementById('todo-done-count') as HTMLSpanElement;

let todos: Todo[] = loadTodos();

function render(): void {
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