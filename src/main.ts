import './styles.css';

console.log('TypeScript + Vite app initialized');

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <h1>Hello TypeScript + Vite</h1>
    <p>This is a migrated TypeScript application using Vite.</p>
  `;
}