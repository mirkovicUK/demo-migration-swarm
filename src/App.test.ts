// src/App.test.ts
import { JSDOM } from 'jsdom';
import App from './App';

const { window } = new JSDOM(`
  <html>
    <head><title>Test</title></head>
    <body>
      <div id="app"></div>
    </body>
  </html>
`);

// Set the window on the global object
global.window = window;
global.document = window.document;
global.Element = window.Element;
global.HTMLDivElement = window.HTMLDivElement;
global.Node = window.Node;

describe('App component', () => {
  test('renders hello world', () => {
    const container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    
    const app = App();
    container.appendChild(app);
    
    expect(container.innerHTML).toContain('<h1>Hello World</h1>');
  });
});