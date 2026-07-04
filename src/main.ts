// src/main.ts
import './styles.css';
import App from './App';

const app = document.getElementById('app');
if (app) {
  app.appendChild(App());
}