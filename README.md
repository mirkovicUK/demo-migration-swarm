# demo-migration-swarm

**Split** — a small but real vanilla **ES-module** HTML/CSS/JavaScript
expense-splitter (think a mini Splitwise): add expenses, choose how to split
them, and see the minimal set of payments that settles the group. No build
step, no framework.

This is the **fixed demo repository** for the
[Migration Swarm](https://github.com/mirkovicUK/migration-swarm) project
(CockroachDB × AWS Hackathon — Build with Agentic Memory).

Migration Swarm's swarm of agents migrates this app into a modern
**Vite + TypeScript + Vitest** project and delivers the result as a Pull
Request on a new `migration/*` branch. Nothing on this repo's default branch is
ever written to by the swarm.

## Why this app is a good migration target

It is deliberately shaped to exercise the swarm's design rather than being a
toy:

- **A real dependency chain.** `money → expense → split → balances → group →
  app`, grounded in actual ES `import`/`export` statements, so the migration
  builds a genuine task DAG (not a flat list).
- **A shared "hot" module.** `js/money.js` is imported by almost everything.
  The swarm migrates it first, remembers *how it typed Money* (integer minor
  units + currency), and every downstream file recalls that decision via
  CockroachDB's distributed vector index — instead of each agent re-inventing
  the shared type and drifting.
- **Files big enough that context caps bite.** `money.js`, `expense.js` and
  `balances.js` are each 6 KB+, so the swarm must rely on recalled decisions,
  not just raw file content, to stay coherent.
- **A re-export barrel** (`js/index.js`) and a **dynamic `import()`**
  (`js/storage.js` → `js/backup.js`) so the import-deriver's edge cases are
  covered.
- **One deliberately ambiguous module** (`js/parse.js`): a discriminated-union
  return (`{ok:true,value}` vs `{ok:false,error}`) plus dynamic property access
  — genuinely awkward to type well.
- **A real test suite** (`test/*.test.js`) with meaningful coverage of the
  money math, validation, split strategies, and settlement — converted to
  Vitest by the migration.

## Run locally

```bash
npm start
# serves index.html at http://localhost:8080
```

## Run tests

```bash
npm test
# node --test over test/*.test.js
```

## Structure

```
index.html            page shell; loads js/app.js as <script type="module">
css/style.css         styling
js/money.js           HOT ⭐ Money value-object + arithmetic (imported everywhere)
js/format.js          currency/date formatting            (→ money)
js/expense.js         Expense model + validation          (→ money)
js/split.js           equal/exact/percentage/shares splits (→ money, expense)
js/balances.js        net balances + minimal settlement    (→ money, expense, split)
js/group.js           group/member/expense state           (→ expense, balances, money)
js/parse.js           free-text input parser (ambiguous)   (→ money)
js/backup.js          JSON export/import (lazy-loaded)      (→ money)
js/storage.js         localStorage persistence + dynamic import (→ index barrel)
js/index.js           re-export barrel                     (→ everything)
js/app.js             DOM wiring / entry module            (→ group, format, parse, storage)
test/money.test.js    money math incl. exact allocation
test/expense.test.js  expense validation
test/split.test.js    every split kind sums to the total
test/balances.test.js settlement engine end-to-end
```

## License

MIT — see [LICENSE](./LICENSE).
