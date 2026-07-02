# demo-migration-swarm

A small, vanilla HTML/CSS/JavaScript todo-list app with no build step and no
framework. This is the **fixed demo repository** for the
[Migration Swarm](https://github.com/mirkovicUK/migration-swarm) project
(CockroachDB × AWS Hackathon — Build with Agentic Memory).

Migration Swarm's swarm of agents migrates this app into a modern
**Vite + TypeScript + modern CSS** project (with tests converted to Vitest)
and delivers the result as a Pull Request on a new branch. Nothing in this
repo's default branch is ever written to by the swarm — only a new
`migration/*` branch, reviewed here as a PR.

## Run locally

```bash
npm start
# serves index.html at http://localhost:8080
```

## Run tests

```bash
npm test
```

## Structure

- `index.html` — the page shell.
- `css/style.css` — styling.
- `js/storage.js` — `localStorage` persistence.
- `js/todo.js` — pure state-transition functions (add/toggle/remove/count).
- `js/app.js` — DOM wiring.
- `test/todo.test.js` — unit tests for `js/todo.js` (Node's built-in test
  runner, no external test framework).

## License

MIT — see [LICENSE](./LICENSE).
