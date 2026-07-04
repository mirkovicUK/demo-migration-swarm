// src/main.ts
// Main entry point for the TypeScript application

// Example function with type annotations
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Example usage
const message: string = greet('World');
console.log(message);

// DOM manipulation example
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<h1>${message}</h1>`;
  }
});
