# Topola – online genealogy visualization

![npm](https://img.shields.io/npm/v/topola.svg)
[![Node.js CI](https://github.com/PeWu/topola/actions/workflows/node.js.yml/badge.svg)](https://github.com/PeWu/topola/actions/workflows/node.js.yml)

Topola is a pure-ESM TypeScript/JavaScript library for rendering customizable, self-contained SVG family tree charts on the web.

## Features

- **Chart topologies:** `hourglass` (supporting ancestor-only `maxDescendantGenerations: 0`, descendant-only `maxAncestorGenerations: 0`, and custom generation limits across `'down' | 'up' | 'right' | 'left'` directions) and `relatives` (all-relatives staircase layout including remarried direct ancestors).
- **Built-in presets:** `Detailed` (events, places, symbols, portraits, badges), `Simple`, `Circle`, and `Fancy` (organic branches, foliage canopy, sky/grass/trunk layers).
- **Style schemes & print-friendly targets:** `sexScheme`, `generationScheme`, and `quayScheme` with two-tone palettes supporting `colorTarget: 'background' | 'frame' | 'name'`.
- **Browser-free layout & self-contained exports:** `computeLayout()` runs without a DOM; `createChart()` scopes plain CSS per chart instance so serialized SVGs export cleanly to standalone SVG, PNG, print, and `jsPDF`/`canvg`.

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

## Subpath Entry Points

- `topola` — Convenience barrel re-exporting all five modules below
- `topola/core` — `computeLayout`, `createChart`, `createCanvasTextMeasurer`, `createFixedTextMeasurer`, `createLinkRouter`, `createDefaultLinkLayer`, `normalizeMargin`, `isHorizontalDirection`, `expanderKey`, `SLOTS`, `ANIMATION_FADE_MS` / `ANIMATION_MOVE_MS`, core plug-in contracts
- `topola/toolkit` — `createTextBox`, `createCoupleAssembler`, `drawBoxParts`, `resizeBoxParts`, `paletteCss`
- `topola/model` — `createModelGraph`, `formatDate`, `formatDateOrRange`, `computeConfidenceMap`
- `topola/presets` — `createSimpleNodePlugin`, `createDetailedNodePlugin`, `createCircleNodePlugin`, `createFancyConfig`, `DEFAULT_FANCY_THEME`, `sexScheme`, `generationScheme`, `quayScheme`
- `topola/gedcom` — `gedcomToModel`, `gedcomEntriesToModel`, `parseGedcomDate`

## Working with a Chart

- **Follow the layout:** `onLayout(layout, { animated })` in the config is called after every layout the chart draws—after `update()`, after a config change, and when the chart remeasures itself because its fonts have loaded. Use it to size or scroll the surrounding view. `ANIMATION_FADE_MS` and `ANIMATION_MOVE_MS` give the timing to animate along.
- **Change the config:** `chart.patchConfig(patch)` changes the given fields (a field given as `undefined` goes back to its default); `chart.setConfig(config)` replaces everything, so nothing of a previous look stays behind. Both take a view state as an optional second argument to refocus in the same step, and return what `update()` returns (the layout and `finished`) when they draw the chart.
- **Animate one drawing:** `update(viewState, { animate })` decides for that drawing alone, whatever `animate` the config has, e.g. to jump to new data and glide to a new start person. `patchConfig` and `setConfig` take the same options as a third argument.
- **Change the data:** the chart draws a node again when its people, its generation, the `graph` object or the look change; it does not look into the records. After changing records, build the graph, the node plug-in and the schemes again and pass them with `setConfig` (or `patchConfig`). After an edit that leaves the families as they are (a name, a date), `chart.remeasure()` draws everything again at once, without animation.
- **Fold branches:** with `expanders: true` the chart draws [+] / [-] and reports clicks to `onExpanderClick`. Keep a set of `expanderKey(nodeId, slot)` keys, pass it as `collapsed` in the view state, and call `update()`.
- **Keyboard and assistive technology:** `keyboard: true` (off by default) makes the expanders and the regions with a click callback tab stops with the role `button`; Enter and Space act as a click, and expanders tell whether they are expanded and carry the name `expanderLabel({ nodeId, slot, state, node })` (`ExpanderLabelInfo`) returns. Label the `<svg>` itself in the host page (`role="img"` with `aria-label`, or a `<title>`): the chart may only own a `<g>` of it.
- **Export:** the chart writes its styles into a `<style>` element inside its container, so a serialized SVG carries them. Charts are told apart by a number that starts at 1 on every page; pass a `scopeId` that is unique beyond the page (`createChart({ svg, config, scopeId })`) to charts whose SVG may be embedded inline next to exports of other sessions.
- **Keep generations stable:** pass `baseGeneration` on every `update()` (as in the Quick Start). Nodes are redrawn when their generation changes, and generation colors would shift.
- **Override styles:** start rules in `overrideCss` with `{scope}`, e.g. `{scope} .link { stroke: gray; }`. It is replaced with the selector of the chart, so the rule stays inside this chart and wins over the generated rules.

## Problems and Errors

Data that is wrong is drawn as far as it goes and reported, not thrown. Nothing is logged.

- **Thrown:** `createChart` throws for a container that is missing or is not an SVG `<svg>` or `<g>`; `createChart`, `setConfig`, `patchConfig` and `computeLayout` throw for a config without a `FamilyGraph` (plain `{ indis, fams }` data has to go through `createModelGraph`) or without a node plug-in; `gedcomToModel` throws `Invalid GEDCOM: …` for text that is not GEDCOM. What a plug-in, a layer or a callback of the host throws while the chart draws is passed on to the caller.
- **Reported by the data:** `createModelGraph(data).problems` lists what it has reconciled or left out when the graph was built.
- **Reported by the layout:** `chart.update(...).layout.problems` (also `computeLayout(...).problems` and the layout that `onLayout` receives) lists what the chart for this start person ran into, each problem once. Every problem has a `code`, a `message` for developers and usually an `entityId`.

| Code | From | Meaning |
| --- | --- | --- |
| `MISSING_START_PERSON` | layout | `startIndi` is not in the graph (e.g. `@I1@` instead of `I1`). The layout is empty: no nodes, size 0 × 0. |
| `MISSING_PERSON` | layout, data | A family names a partner or a child that does not exist. The person is left out. |
| `MISSING_FAMILY` | layout, data | A person names a parent or spouse family that does not exist. The link is left out. |
| `CYCLE_DETECTED` | layout | A person is their own ancestor or descendant. The branch ends where it would repeat. |
| `ASYMMETRIC_SPOUSE_LINK` | layout, data | A person names a family as a spouse and the family does not name the person, or the other way round. `createModelGraph` completes the link; the layout ignores a one-sided link of a host graph. |
| `ASYMMETRIC_CHILD_LINK` | data | A child and its family do not name each other. The link is completed. |
| `UNRESOLVED_SPOUSE_LINK` | data | A person names a family that already has two other partners. The link is ignored. |
| `DUPLICATE_ID` | data | Two records have one id. The last one is used. |
| `DUPLICATE_LINK` | data | A link is listed twice, or one person is both partners of a family. It counts once. |
| `UNKNOWN_LINE_ROLE` | layout | A text box has a line whose role the theme does not define. It is drawn with default typography. |

A `relatives` chart draws the descendants of every ancestor couple (up to `maxDescendantGenerations` below the start person, or unlimited when omitted), and a relative once for every couple they descend from. For data in which the same ancestors are reached along many lines (a complete pedigree of a closed community) it can grow to hundreds of thousands of nodes; limit `maxAncestorGenerations` (and `maxDescendantGenerations`) for such data. A single branch of about two thousand generations or more exceeds the call stack of the tidy-tree library (`RangeError`).

## Writing a Look

A look combines a node plug-in, layers and style schemes. The plug-in contracts are in [src/core/types.ts](src/core/types.ts).

- **Theme defaults:** a node plug-in or layer declares `defaultTheme` for the theme fields it adds; `createCoupleAssembler` takes a `defaultTheme` for custom boxes.
- **Trusted CSS:** theme values, palette colours, box namespaces and `overrideCss` are written into the stylesheet of the chart as they are, and a stylesheet inside an inline SVG belongs to the whole page. Pass only values the host itself wrote or checked, not text from a URL or from another user. Names, places and ids from the data are only written as text and attribute values, and an image URL is used only if it is `http(s):`, `blob:`, `data:image/` or has no scheme.
- **Layers** receive the layout, the theme, the style schemes, the view state, a text measurer and animation helpers. `getBounds` receives the theme and the measurer to reserve space, e.g. for a legend. Layers of one slot are painted in the order of `layers`, each into a group of its own (`id` is unique within the slot). A layer in the `links` slot replaces the default link layer; add `createDefaultLinkLayer()` to keep it, at the place in `layers` where its links are to be painted. The optional `dispose` is called when the layer leaves the config or the chart is disposed, to remove what the layer added to the shared `<defs>`.
- **Animation helpers** (`move`, `appear`, `disappear`) animate elements in step with the chart and act at once when the chart does not animate. They own the inline `opacity` of the elements passed to them. An update that comes during an animation cuts it short, so on every update `move` each element you keep to where it belongs, also when that has not changed; the chart only finishes a fade-in that was cut short.
- **Resizing:** a plug-in with the optional `resizeNode` brings a drawn node to a given geometry through the animation helpers. The chart calls it instead of `drawNode` when only the size of a node changes (its row got taller), and right after `drawNode` when content and size change together (`drawNode` then draws at the old geometry), so boxes grow and shrink with the rest of the animation. Boxes built with `createCoupleAssembler` that describe themselves as parts (`BoxPart`, `drawBoxParts`) only need a one-line `resizeBox` that calls `resizeBoxParts`, as the text box does; a box may also implement `resizeBox` by hand. A box without `resizeBox` is drawn again at once.
- **Link routes:** `createLinkRouter(layout, theme)` returns the corner points of every link as the default link layer routes them, for link layers that only change the style.
- **Boxes and schemes:** style schemes address the parts of a box by the class names in `BOX_PART_CLASSES` (`underlay`, `background`, `frame`, `name`). `paletteCss` returns the rules that apply scheme palettes to a box according to its `colorTarget`. The chart turns scheme tokens into class names with `toClassToken` (a token such as `1800` becomes the class `_1800`); CSS written for tokens by hand has to use it too.

## Migrating to 4.0

- **Pure ESM:** `topola` 4.0 ships ESM (`"type": "module"`) with typed subpath exports.
- **`startIndi`-only `ViewState`:** Charts always start from an individual ID (`{ startIndi }`), with automatic root-spouse promotion when married.
- **Click callbacks replace `<a href>` wrappers:** Handle navigation inside `onPersonClick` / `onFamilyClick` (receiving `{ id, nodeId, generation, modifiers, event }`) instead of `indiUrl` / `famUrl` (for example in integrations such as `topola-webtrees`).
- **`Hourglass` replaces `AncestorChart` / `DescendantChart`:** Pass `maxDescendantGenerations: 0` or `maxAncestorGenerations: 0` on `chart: 'hourglass'`. `KinshipChart` has been removed.

## Running the Demo Locally

```bash
npm install
npm start
```
