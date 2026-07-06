# tests

This directory contains the automated tests for the topola genealogy application,
written with [Jest](https://jestjs.io/) (unit tests) and
[Playwright](https://playwright.dev/) (screenshot tests). It also includes font
assets and an HTML viewer page used by the screenshot tests.

The tests fall into three groups:

1. **Unit tests** (`.spec.ts`) — exercise individual modules in isolation:
   GEDCOM parsing, date formatting, and the various chart types. They use
   `jsdom-global` to provide a minimal DOM and a `FakeRenderer` stub so the
   charts can be laid out without a real SVG renderer.
2. **Screenshot tests** — end-to-end tests that render charts in a headless
   browser via Playwright and compare the output against committed baseline
   images stored in the `screenshots.spec.ts-snapshots` subdirectory.
3. **Support files** — shared helpers (fake renderer, TypeScript declarations)
   and static assets (fonts, HTML viewer) needed by the tests.

## Files

| File | Description |
| --- | --- |
| [tests/ancestor-chart.spec.ts](tests/ancestor-chart.spec.ts) | Unit tests for the `AncestorChart`. Verifies rendering of a single-person tree and a small ancestor tree using `JsonDataProvider` and `FakeRenderer`. |
| [tests/date-format.spec.ts](tests/date-format.spec.ts) | Unit tests for the `formatDate` and `formatDateOrRange` functions in `src/date-format`. Covers simple dates, qualified dates (abt/before/after), and date ranges in English (`en`) and Czech (`cs`) locales. |
| [tests/descendant-chart.spec.ts](tests/descendant-chart.spec.ts) | Unit tests for the `DescendantChart`. Tests a single-person descendant tree and a tree with a common descendant of two siblings. |
| [tests/fake_renderer.ts](tests/fake_renderer.ts) | A stub implementation of the `Renderer` interface that assigns fixed 10×10 dimensions to nodes and returns empty anchors/CSS. Used by the Jest unit tests to lay out charts without a real SVG renderer. |
| [tests/gedcom.spec.ts](tests/gedcom.spec.ts) | Unit tests for the GEDCOM parser (`gedcomToJson`) and `getDate`. Covers date parsing (including pre-year-1000 and Julian calendar), name/maiden-name extraction, notes (with `CONT`), event parsing, image objects, and `@VOID@` reference handling. |
| [tests/jsdom-global.d.ts](tests/jsdom-global.d.ts) | Minimal TypeScript ambient declaration for the `jsdom-global` module, which has no bundled types. |
| [tests/relatives-chart.spec.ts](tests/relatives-chart.spec.ts) | Unit tests for the `RelativesChart`. Tests a single person, a family with no parents, a family with only a wife, and a regression case where an ancestor family-as-child has no parents defined. |
| [tests/screenshot-viewer.html](tests/screenshot-viewer.html) | HTML page loaded by Playwright for the screenshot tests. Preloads Montserrat fonts, includes D3 and the demo bundle, and exposes a `window.renderChart` function that the test driver calls to render a chart into the `#chart` SVG. |
| [tests/screenshots.spec.ts](tests/screenshots.spec.ts) | Playwright end-to-end tests that render each chart type (relatives, hourglass, ancestors, descendants, fancy, tudor, kinship) with various renderers and color modes, then assert the rendered SVG matches a committed baseline screenshot. |
| tests/Montserrat-Bold.woff2 | Bold weight of the Montserrat web font, preloaded by `screenshot-viewer.html` so that text rendering matches the baseline screenshots. |
| tests/Montserrat-Regular.woff2 | Regular weight of the Montserrat web font, used by the screenshot viewer for consistent text rendering. |
| tests/roboto-latin-400-normal.woff2 | Regular weight of the Roboto web font (Latin subset). |
| tests/roboto-latin-700-normal.woff2 | Bold weight of the Roboto web font (Latin subset). |
| tests/screenshots.spec.ts-snapshots/ | Directory holding the committed baseline PNG screenshots that `screenshots.spec.ts` compares against. |
