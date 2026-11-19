# demo

This directory contains the static demo website for Topola 4 (`bundle.js`, built by `npm run build-demo`).

Two pages are provided:

- **`index.html`** — showcase gallery rendering `relatives`, `hourglass` (vertical and horizontal), print-friendly colored borders (`colorTarget: 'frame'`), Tudor portraits (`tudor.json`), simple descendant boxes, and the multi-layer `Fancy` tree.
- **`upload.html`** — interactive GEDCOM/JSON viewer with animated node navigation and `[+]` / `[-]` branch expanders.

## Files

| File | Description |
| --- | --- |
| [demo/index.html](index.html) | Showcase gallery using Topola 4's `createChart`, presets (`Detailed`, `Simple`, `Circle`, `Fancy`), and style schemes (`sexScheme`, `generationScheme`). |
| [demo/upload.html](upload.html) | Interactive browser-only GEDCOM/JSON viewer with D3 v7 scroll transitions and expanders. |
| [demo/topola.css](topola.css) | Page layout styles for the demo pages (`svg` border and `.container` viewport). Chart box/link styles are self-contained inside each `<svg>`. |
| [demo/data/](data/) | Sample genealogical datasets (`family.ged`, `family2.ged`, `data.json`, `tudor.json`). |
