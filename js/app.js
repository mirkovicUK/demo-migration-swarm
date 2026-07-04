```typescript
// app.ts - wires the DOM to the pure todo functions + storage
// persistence. Vanilla JS, no framework, no build step (this is the
// migration source; the target is Vite + TypeScript + Vitest).

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

declare function loadTodos(): Todo[];
declare function saveTodos(todos: Todo[]): void;
declare function addTodo(todos: Todo[], text: string): Todo[];
declare function toggleTodo(todos: Todo[], id: number): Todo[];
declare function removeTodo(todos: Todo[], id: number): Todo[];
declare function countDone(todos: Todo[]): number;

(() => {
  const form = document.getElementById("todo-form") as HTMLFormElement;
  const input = document.getElementById("todo-input") as HTMLInputElement;
  const list = document.getElementById("todo-list") as HTMLUListElement;
  const countEl = document.getElementById("todo-count") as HTMLSpanElement;
  const doneCountEl = document.getElementById("todo-done-count") as HTMLSpanElement;

  let todos: Todo[] = loadTodos();

  function render() {
    list.innerHTML = "";
    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.className = todo.done ? "done" : "";
      li.dataset.id = String(todo.id);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.done;
      checkbox.addEventListener("change", () => {
        todos = toggleTodo(todos, todo.id);
        saveTodos(todos);
        render();
      });

      const span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = todo.text;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "\u00d7";
      removeBtn.addEventListener("click", () => {
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

  form.addEventListener("submit", (event: Event) => {
    event.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    todos = addTodo(todos, value);
    saveTodos(todos);
    input.value = "";
    render();
  });

  render();
})();
```