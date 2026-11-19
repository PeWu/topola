# tests

Automated test suites for Topola 4, powered by **Vitest** (`npm test`) and **Playwright** (`npm run test:screenshots`). `npm run typecheck` type-checks the tests together with the sources (Vitest and Playwright strip types without checking them).

## Suites

| File / Directory | Description |
| --- | --- |
| [tests/architecture.spec.ts](architecture.spec.ts) | Enforces strict barrel-only cross-directory imports across `src/{core,toolkit,model,presets,gedcom}`. |
| [tests/oracle/](oracle/) | Seeded genealogical topology generator (`family-generator.ts`) and committed V3 layout oracle fixture (`v3-layout-snapshots.json`). |
| [tests/core/axes.spec.ts](core/axes.spec.ts) | Pure-Node tests for `BoxExtents` signed interval projection across all four growth directions. |
| [tests/core/oracle-layout-helpers.ts](core/oracle-layout-helpers.ts) | Shared V3 oracle node-sizing double and bounding-box overlap checker used by the `Hourglass` and `Relatives` layout suites. |
| [tests/core/hourglass-layout.spec.ts](core/hourglass-layout.spec.ts) | V3 coordinate parity across 444 `Hourglass` / `Ancestor` / `Descendant` layouts, 4-direction reflection/transposition invariants, and cycle/missing-ref resilience. |
| [tests/core/relatives-layout.spec.ts](core/relatives-layout.spec.ts) | V3 coordinate parity on clean ancestor trees, non-overlap & link invariants across 100% of generated topologies, Issue #30 remarried-ancestor tests, and parentless-family regressions. |
| [tests/core/layout-robustness.spec.ts](core/layout-robustness.spec.ts) | Layout invariants beyond coordinates: unique node and link ids (also for numeric ids), collapsing every expander of the oracle scenarios in both charts, cycles, id collisions, inconsistent host graphs, problems reported once, very large blocks, and ancestor lines thousands of generations long. |
| [tests/core/chart-contracts.spec.ts](core/chart-contracts.spec.ts) | Contracts of the `Chart` for layers, plug-ins and hosts: animation helpers under interrupting updates, layer groups, their paint order and `dispose`, geometry comparison, animated `<svg>` size, config methods and their errors, per-drawing animation, containers, scope classes and `scopeId`, keyboard access, and the text measurer of a document. |
| [tests/core/chart-animation.spec.ts](core/chart-animation.spec.ts) | Stateful `Chart` diffing, D3 transition lifecycle, mid-flight interrupt-and-glide, `.topola-<id>` style isolation, `document.fonts` auto-remeasurement, and directional expanders. |
| [tests/model/](model/) | Unit tests for locale-aware date formatting (`date-format.spec.ts`), widest-path QUAY certainty propagation (`confidence.spec.ts`), and `createModelGraph` reconciliation and problems (`graph-adapter.spec.ts`). |
| [tests/presets/](presets/) | Unit tests for `Simple`, `Detailed`, `Circle`, `Fancy` (`presets-and-toolkit.spec.ts`), two-tone `StyleScheme`s (`schemes.spec.ts`), and edge cases of the toolkit and the presets (`toolkit-robustness.spec.ts`). |
| [tests/gedcom/gedcom.spec.ts](gedcom/gedcom.spec.ts) | GEDCOM 5.5.1 parser unit tests (`parseGedcomDate`, names/maiden names, `CONC`/`CONT` notes, QUAY, `@VOID@`, and same-sex partner slots). |
| [tests/browser-contracts.spec.ts](browser-contracts.spec.ts) | Playwright Chromium verification that rendered `getBBox()` dimensions fit Stage 2 declared bounds/regions and serialized `<svg>` exports render pixel-identically in isolation. |
| [tests/animation-smoothness.spec.ts](animation-smoothness.spec.ts) | Playwright Chromium checks that nothing jumps during animations: scripted edge cases and seeded random click walks on small and large generated trees, stepped frame by frame on a virtual clock and compared with a non-animated twin chart. See [Animation smoothness](#animation-smoothness). |
| [tests/screenshots.spec.ts](screenshots.spec.ts) | Playwright Chromium visual regression tests against `tests/screenshots.spec.ts-snapshots/*.png` using [tests/screenshot-viewer.html](screenshot-viewer.html). |

## Animation smoothness

`npx playwright test animation-smoothness` runs only this suite.

Each test opens two charts with the same data: an animated one and a non-animated "twin". Clicks on people and expanders go to both. Time is stepped 16 ms at a time (32 ms on the largest charts), and after every step the position, size and opacity of every person box, family box, link and expander is compared with the step before:

- nothing may move faster than its whole journey (known from the twin) allows,
- opacity may only change as fast as a fade does,
- boxes may only appear and disappear while invisible,
- a finished animation must end exactly where the twin is, with nothing left over.

Random walks are replayable: the seed in the test name fixes the generated tree, the clicks and which clicks interrupt the previous animation. A failure lists the step, the frame and the element, for example `step 2 (person I31) frame 13: reshape link:F13:A`.

Issues that are known and not fixed yet are listed as `KNOWN_ISSUE_*` constants at the top of the file. Each has a test that pins it down and fails once it is fixed, as a reminder to remove the constant; random walks stay away from them.
