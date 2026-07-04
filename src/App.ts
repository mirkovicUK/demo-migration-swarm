// src/App.ts
export default function App(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>Hello World</h1>
    <p>This is a TypeScript + Vite app</p>
  `;
  return container;
}