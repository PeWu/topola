# Topola – online genealogy visualization

![npm](https://img.shields.io/npm/v/topola.svg)
[![Node.js CI](https://github.com/PeWu/topola/actions/workflows/node.js.yml/badge.svg)](https://github.com/PeWu/topola/actions/workflows/node.js.yml)

Topola is a pure-ESM TypeScript/JavaScript library for embedding interactive, customizable genealogy tree visualizations on web pages. It uses [D3](https://d3js.org/) under the hood to render self-contained SVG charts that export cleanly to standalone SVG, PNG, PDF, and print.

Available chart topologies:
* **Hourglass chart** (`chart: 'hourglass'`) — shows ancestors, descendants, or both (set `maxDescendantGenerations: 0` for an ancestor chart or `maxAncestorGenerations: 0` for a descendant chart) in any direction (`'down'`, `'up'`, `'right'`, `'left'`).
* **Relatives chart** (`chart: 'relatives'`) — shows descendants, ancestors, and descendants of ancestors (including remarried direct ancestors), based on the [All-in-one report](http://genj.sourceforge.net/wiki/en/reports/graphicaltree) in GenealogyJ.

Built-in looks and styling:
* **Detailed** (`createDetailedNodePlugin`) — names, dates, places, occupations/titles, portraits, ID/sex badges, and marriage boxes.
* **Simple** (`createSimpleNodePlugin`) — compact boxes with names and lifespan years.
* **Circle** (`createCircleNodePlugin`) — circular nodes for individuals and couples.
* **Fancy tree** (`createFancyConfig`) — organic branches, foliage canopy, sky, and grass layers, inspired by https://imgur.com/a/T02Kc7X.
* **Style schemes** — `generationScheme`, `sexScheme`, and `quayScheme` (GEDCOM `QUAY` source confidence), with two-tone palettes supporting `colorTarget: 'background' | 'frame' | 'name'` (including print-friendly colored borders and names).

If you find this project useful, consider buying me a coffee.

[![buy me a coffee](https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png)](https://www.buymeacoffee.com/pewu)

## Examples

Open the StackBlitz examples to play around with the code (sources live in [`examples/`](examples/)):

* Basic usage: [StackBlitz](https://stackblitz.com/github/PeWu/topola/tree/v4/examples/basic) · [source](examples/basic/src/main.ts)
* Using GEDCOM content: [StackBlitz](https://stackblitz.com/github/PeWu/topola/tree/v4/examples/gedcom) · [source](examples/gedcom/src/main.ts)
* Displaying more data: [StackBlitz](https://stackblitz.com/github/PeWu/topola/tree/v4/examples/moredata) · [source](examples/moredata/src/main.ts)
* Animations & expanders: [StackBlitz](https://stackblitz.com/github/PeWu/topola/tree/v4/examples/animations) · [source](examples/animations/src/main.ts)
* Custom look: [StackBlitz](https://stackblitz.com/github/PeWu/topola/tree/v4/examples/custom-look) · [source](examples/custom-look/src/main.ts)

## Demo

Have a look at the [demo page](https://pewu.github.io/topola/) to see the visualization possibilities.

Try it with your own GEDCOM file: https://pewu.github.io/topola/upload

[Topola Genealogy Viewer](https://pewu.github.io/topola-viewer/) is a complete web application built around this library. It can also be used as a [Webtrees addon](https://github.com/PeWu/topola-webtrees).

## Guides

* **[Creating a Custom Look](docs/creating-a-look.md)** — customize themes, box contents, custom SVG shapes, layers, and style schemes, with step-by-step examples.
* **[Migrating from v3 to v4](docs/migrating-to-v4.md)** — summary of breaking changes, API mapping table, and a complete before/after example.

## Installation

```bash
npm install topola
```

Topola 4 is published as pure ESM (`"type": "module"`) with bundled TypeScript types and subpath exports.

## Quick Start

```ts
import { gedcomToModel } from 'topola/gedcom';
import { createModelGraph } from 'topola/model';
import { createChart, expanderKey, type ExpanderKey } from 'topola/core';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';

const model = gedcomToModel(gedcomString);
const graph = createModelGraph(model);

const start = model.indis[0];
if (!start) throw new Error('The file has no people.');
let startIndi = start.id;
let baseGeneration = 0;
const collapsed = new Set<ExpanderKey>();

const chart = createChart({
  svg: '#chart',
  config: {
    graph,
    chart: 'hourglass',
    animate: true,
    expanders: true,
    nodePlugin: createDetailedNodePlugin({ model: graph }),
    schemes: [generationScheme()],
    onPersonClick: ({ id, generation }) => {
      startIndi = id;
      baseGeneration = generation;
      chart.update({ startIndi, baseGeneration, collapsed });
    },
    onExpanderClick: ({ nodeId, slot }) => {
      const key = expanderKey(nodeId, slot);
      if (collapsed.has(key)) collapsed.delete(key);
      else collapsed.add(key);
      chart.update({ startIndi, baseGeneration, collapsed });
    },
  },
});

chart.update({ startIndi, baseGeneration, collapsed });
```

You can also compute layouts without a browser DOM using `computeLayout()` (for example with `createFixedTextMeasurer()`).

## Subpath Entry Points

* `topola` — convenience barrel re-exporting all five subpaths below.
* `topola/core` — layout engine, chart lifecycle and animation runtime, text measurement, link routing, and core plug-in contracts.
* `topola/toolkit` — reusable building blocks for authoring custom node looks, including configurable text boxes, couple assembly, animated box resizing, and scheme palette styling.
* `topola/model` — genealogy data model, graph adapter, date formatting, and source-confidence propagation.
* `topola/presets` — built-in visual looks (Detailed, Simple, Circle, and Fancy tree) and ready-made style schemes (generation, sex, and source confidence).
* `topola/gedcom` — GEDCOM parser that converts raw GEDCOM text or parsed entries into the Topola data model.

## Running Locally

To run the interactive demo locally:

```bash
npm install
npm start
```

Other useful scripts:

```bash
npm run build            # Compile TypeScript to dist/
npm test                 # Run Vitest unit tests
npm run test:screenshots # Run Playwright visual regression tests
```
