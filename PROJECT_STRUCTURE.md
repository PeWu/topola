# Project Structure

This is the root directory of **topola**, an online genealogy visualization
library. The project reads genealogical data (GEDCOM files or its own JSON
format), builds hierarchical tree structures, and renders interactive
family-tree charts to SVG using D3. It is published to npm as the `topola`
package and also includes a static demo website.

The project has four main components:

1. **Library source** (`src/`) — the TypeScript source of the charting library,
   including GEDCOM/JSON data parsing, six chart types (ancestor, descendant,
   hourglass, relatives, kinship, fancy), and three renderers (detailed, simple,
   circle).
2. **Demo** (`demo/`) — a static website showcasing all chart types with sample
   data, plus an interactive GEDCOM file viewer.
3. **Tests** (`tests/`) — Jest unit tests for parsing and chart logic, plus
   Playwright screenshot tests for visual regression.
4. **CI/CD** (`.github/`) — GitHub Actions workflows for CI builds, screenshot
   tests, and npm publishing, plus Dependabot configuration.

## Files

| File | Description |
| --- | --- |
| [package.json](package.json) | npm package manifest. Defines project metadata, scripts (`build`, `build-demo`, `test`, `test:screenshots`, `start`, `deploy`), dependencies (D3, `parse-gedcom`, `d3-flextree`), and dev dependencies (Jest, Playwright, esbuild, TypeScript). |
| [tsconfig.json](tsconfig.json) | TypeScript compiler configuration. Targets ES5 with strict null checks, outputs to `dist/` with declarations, and includes all files under `src/`. |
| [tslint.json](tslint.json) | TSLint configuration extending Google's `gts` ruleset, with the `switch-default` rule disabled. |
| [jest.config.js](jest.config.js) | Jest test configuration. Uses `ts-jest` for TypeScript transpilation, runs in the Node environment, excludes the screenshot test file, and maps D3 modules to their built JS for testing. |
| [playwright.config.ts](playwright.config.ts) | Playwright test configuration. Runs screenshot tests from `tests/` in headless Chromium against a local HTTP server on port 8080. |
| [.gitignore](.gitignore) | Git ignore rules. Excludes `dist/`, `node_modules/`, `demo/bundle.js`, `test-results/`, `playwright-report/`, and editor config. |
| [.npmignore](.npmignore) | npm publish ignore rules. Excludes `demo/`, `src/`, `tests/`, and `tsconfig.json` from the published package, leaving only the compiled `dist/` output. |
| [LICENSE](LICENSE) | Apache License 2.0. |
| [README.md](README.md) | Project README with an overview, usage examples, and links to the demo. |

## Subdirectories

| Directory | Description |
| --- | --- |
| [src/](src/) | Library source code — data parsing, chart layouts, and SVG renderers. See [src/README.md](src/README.md). |
| [demo/](demo/) | Static demo website with sample datasets and an interactive GEDCOM viewer. See [demo/README.md](demo/README.md). |
| [tests/](tests/) | Jest unit tests and Playwright screenshot tests. See [tests/README.md](tests/README.md). |
| [.github/](.github/) | GitHub configuration: CI/CD workflows and Dependabot. See [.github/workflows/README.md](.github/workflows/README.md). |
