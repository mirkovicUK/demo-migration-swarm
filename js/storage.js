```typescript
// storage.ts - tiny localStorage wrapper for persisting the todo list.
// TypeScript version, preserves exact behavior from original JavaScript.

const STORAGE_KEY = "demo-migration-swarm.todos";

/**
 * Loads todos from localStorage
 * @returns {Todo[]} Array of todos or empty array if error occurs or no data found
 */
function loadTodos(): Todo[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Saves todos to localStorage
 * @param {Todo[]} todos - Array of todos to persist
 */
function saveTodos(todos: Todo[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}
```

**Important Implementation Details:**

1. **Type Definitions**: You'll need to define or import the `Todo` type/interface. Add this at the top of the file:

```typescript
interface Todo {
  // Define your todo properties here
  id: string;
  text: string;
  completed: boolean;
  // ... other properties
}
```

2. **Usage**: The functions can now be used with proper TypeScript type checking:

```typescript
// Example usage
const todos = loadTodos();
saveTodos(todos);
```

3. **Dependencies**: This implementation maintains the original vanilla JS approach with no build step or dependencies required.

The core functionality remains identical to the original JavaScript version while gaining type safety and better IDE support.