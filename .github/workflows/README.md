# .github/workflows

This directory contains [GitHub Actions](https://docs.github.com/en/actions)
workflow definitions for continuous integration and publishing of the topola
project.

The workflows automate three concerns:

1. **CI build & test** — on every push or pull request to `master`, install
   dependencies, build the library, and run the unit tests.
2. **Screenshot tests** — on every push or pull request to `master`, build the
   library and demo, install Playwright, and run the visual regression
   (screenshot) tests.
3. **Publishing** — manually triggered workflow that builds the package and
   publishes it to the npm registry using provenance (OIDC).

## Files

| File | Description |
| --- | --- |
| [.github/workflows/node.js.yml](.github/workflows/node.js.yml) | **Node.js CI** workflow. Triggered on push and pull request to `master`. Checks out the repository, sets up Node.js (matrix on version 16.x), installs dependencies with `npm ci`, builds the library (`npm run build`), and runs the unit tests (`npm test`). |
| [.github/workflows/publish.yml](.github/workflows/publish.yml) | **Publish Package** workflow. Manually triggered (`workflow_dispatch`). Checks out the repository, sets up Node.js 24 with the npm cache, installs dependencies, runs tests, builds the package, and publishes it to npm with `id-token: write` permissions for provenance-backed publishing. |
| [.github/workflows/screenshots.yml](.github/workflows/screenshots.yml) | **Screenshot Tests** workflow. Triggered on push and pull request to `master`. Builds the library and demo (`npm run build-demo`), installs the Playwright Chromium browser with dependencies, runs the screenshot tests (`npm run test:screenshots`), and uploads the `test-results/` directory as an artifact if the job fails (retained for 30 days). |
