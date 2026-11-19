# Project Structure

This is the root directory of **topola** (version 4), a pure-ESM TypeScript library for interactive genealogy family-tree visualization on the web.

Topola 4 separates data parsing, genealogical records, browser-free layout computation, node/box toolkits, and visual presets into five subpath entry points inside a single `topola` package:

1. **`topola/core`** (`src/core/`) — Charts Core: tree building, browser-free layout (`computeLayout`), `Chart` painter/animator (`createChart`), directional expanders, and scoped CSS generation (zero knowledge of personal fields or dates).
2. **`topola/toolkit`** (`src/toolkit/`) — Node Toolkit: reusable `createTextBox` and `createCoupleAssembler` helpers.
3. **`topola/model`** (`src/model/`) — Genealogical Model: JSON-compatible `ModelData`, `createModelGraph` with one-sided pointer reconciliation, locale-aware date formatting, and widest-path QUAY confidence propagation.
4. **`topola/presets`** (`src/presets/`) — Built-in Presets & Style Schemes: `Simple`, `Detailed`, `Circle`, `Fancy`, `sexScheme`, `generationScheme`, and `quayScheme`.
5. **`topola/gedcom`** (`src/gedcom/`) — GEDCOM 5.5.1 parser (`gedcomToModel`, `gedcomEntriesToModel`, `parseGedcomDate`).

A convenience root barrel (`src/index.ts`, imported as `topola`) re-exports all five entry points.

## Files

| File | Description |
| --- | --- |
| [package.json](package.json) | Pure-ESM npm package manifest (`"type": "module"`, `"exports"` for `.`, `./core`, `./toolkit`, `./model`, `./presets`, `./gedcom`, `"files": ["dist"]`). |
| [tsconfig.base.json](tsconfig.base.json) | Shared TypeScript 5.7+ `NodeNext` strict configuration inherited by composite sub-projects. |
| [tsconfig.json](tsconfig.json) | Root composite TypeScript project referencing `tsconfig.{core,toolkit,model,presets,gedcom}.json`. |
| [tsconfig.tests.json](tsconfig.tests.json) | Non-composite, non-emitting TypeScript project over `src/`, `tests/` and the config files, used by `npm run typecheck` (`tsc -p tsconfig.tests.json`). It type-checks everything from source in one program; `tsc -b tsconfig.json --noEmit` cannot (TS6310 for referenced projects). |
| [vitest.config.ts](vitest.config.ts) | Vitest configuration for fast headless unit, oracle parity, and architecture boundary tests. |
| [playwright.config.ts](playwright.config.ts) | Playwright Chromium configuration for visual regression (`screenshots.spec.ts`), browser contract (`browser-contracts.spec.ts`), and animation smoothness (`animation-smoothness.spec.ts`) suites. |
| [TOPOLA4_DESIGN.md](TOPOLA4_DESIGN.md) | Architectural design document for Topola 4. |
| [README.md](README.md) | Overview, quick-start examples, entry-point guide, and 4.0 migration notes. |

## Subdirectories

| Directory | Description |
| --- | --- |
| [src/](src/) | Library source organized into `core/`, `toolkit/`, `model/`, `presets/`, and `gedcom/`. See [src/README.md](src/README.md). |
| [demo/](demo/) | Static showcase gallery (`index.html`) and interactive GEDCOM/JSON viewer (`upload.html`). See [demo/README.md](demo/README.md). |
| [tests/](tests/) | Vitest unit/oracle suites and Playwright Chromium visual & browser-contract tests. See [tests/README.md](tests/README.md). |
| [.github/](.github/) | GitHub Actions workflows for CI, Playwright screenshots, and npm publishing. |
