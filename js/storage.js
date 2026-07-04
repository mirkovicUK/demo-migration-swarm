```typescript
// storage.ts - tiny localStorage wrapper for persisting the todo list.
// Vanilla JS, no build step, no dependencies (this is the migration source).

const STORAGE_KEY = "demo-migration-swarm.todos";

function loadTodos(): any[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveTodos(todos: any[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}
```

### Explanation of Changes

1. **File Extension Change**:
   - The file has been renamed from `storage.js` to `storage.ts` to reflect that it's now TypeScript.

2. **Type Annotations**:
   - **Function Return Types**:
     - `loadTodos()` now explicitly returns an array of `any` (`any[]`). This preserves the original behavior where it could return either a parsed array or an empty array.
     - `saveTodos(todos)` now explicitly takes an argument of type `any[]` and returns `void` since it doesn't return any value.
   - These type annotations ensure that the function signatures are clear and TypeScript can perform basic type checking.

3. **Preservation of Behavior**:
   - The core logic of both functions remains unchanged. The `try...catch` block in `loadTodos` handles potential errors during retrieval and parsing from `localStorage`.
   - The `saveTodos` function continues to serialize the array and store it under the same key.

This migration maintains the exact behavior of the original JavaScript code while adding type safety through TypeScript.