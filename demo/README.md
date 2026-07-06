# demo

This directory contains the demo application for the topola genealogy library.
It is a static website (no build step of its own) that loads the bundled library
(`bundle.js`, produced by `npm run build-demo`) and D3 from a CDN, then renders
several example charts using the sample datasets in [demo/data/](demo/data).

Two pages are provided:

- **`index.html`** — a showcase gallery that renders all chart types
  (relatives, hourglass, ancestors, descendants, kinship, fancy) using the
  bundled sample data.
- **`upload.html`** — an interactive viewer where the user can load their own
  GEDCOM file (from disk or URL) and explore the resulting family tree.

Both pages also offer "Download SVG" and "Print" buttons for each chart.

## Files

| File | Description |
| --- | --- |
| [demo/index.html](demo/index.html) | Showcase gallery page. Loads `data/family.ged`, `data/data.json`, `data/tudor.json`, and `data/family2.ged` and renders seven example charts: relatives (color-by-sex), hourglass (vertical), ancestors (horizontal), tree with images (Tudor), descendants (simple boxes, horizontal), kinship, and a fancy circular tree. Each chart has download-SVG and print buttons. |
| [demo/upload.html](demo/upload.html) | Interactive GEDCOM viewer page. Lets the user select a GEDCOM file from disk or load one by URL (with example links to famous family trees), parses it with `gedcomToJson`, and renders an interactive hourglass chart with smooth pan/zoom transitions. The file is processed entirely in the browser — nothing is sent to a server. |
| [demo/topola.css](demo/topola.css) | Shared stylesheet for both demo pages. Sets the Montserrat font, white SVG background with a border, page background, node cursor styling, and the `.container` layout (800×600 scrollable area) used by the upload viewer. |
| [demo/data/](demo/data/) | Subdirectory holding the sample genealogical datasets (GEDCOM and JSON) used by the demo pages and the Playwright screenshot tests. See [demo/data/README.md](demo/data/README.md) for details. |
