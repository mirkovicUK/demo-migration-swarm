// app.js - wires the DOM to the pure todo.js functions + storage.js
// persistence. Vanilla JS, no framework, no build step (this is the
// migration source; the target is Vite + TypeScript + Vitest).

(function () {
  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const list = document.getElementById("todo-list");
  const countEl = document.getElementById("todo-count");
  const doneCountEl = document.getElementById("todo-done-count");

  let todos = loadTodos();

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

  form.addEventListener("submit", (event) => {
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
