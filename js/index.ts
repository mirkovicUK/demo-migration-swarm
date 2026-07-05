// index.ts — public barrel. Re-exports the domain modules so consumers can do
// `import { money, computeShares } from "./index.js"`. The `export ... from`
// form is parsed by the migration's import-deriver as real edges, so this node
// depends on every module it re-exports.

export * from "./money";
export * from "./format";
export * from "./expense";
export * from "./split";
export * from "./balances";
export * from "./group";
export * from "./parse";