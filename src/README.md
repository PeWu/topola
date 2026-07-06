# src

This directory contains the source code of the **topola** genealogy charting
library. The library reads genealogical data (GEDCOM files or its own JSON
format), builds hierarchical tree structures, and renders family-tree charts
to SVG using D3.

The code is organized into four layers:

1. **Data & parsing** — GEDCOM parsing (`gedcom.ts`), the JSON data model and
   data provider (`data.ts`), and locale-aware date formatting (`date-format.ts`).
2. **API** — the core interfaces (`api.ts`) that define charts, renderers,
   tree nodes, and data providers, plus a simplified high-level API
   (`simple-api.ts`) with the `createChart()` entry point.
3. **Charts** — six chart types that build and lay out different family-tree
   topologies: ancestor, descendant, hourglass, relatives, kinship, and fancy.
4. **Renderers** — pluggable renderers that draw individual/family boxes:
   detailed (with images and dates), simple (names only), circle, and a shared
   composite base. The `ChartUtil` class provides the common layout, D3 data
   binding, animation, and SVG rendering logic.

## Files

| File | Description |
| --- | --- |
| [src/index.ts](src/index.ts) | Library entry point. Re-exports all public modules so consumers can import everything from a single package root. |
| [src/api.ts](src/api.ts) | Core interfaces and types: `TreeNode`, `Indi`, `Fam`, `DataProvider`, `Renderer`, `Chart`, `ChartOptions`, `ChartInfo`, `ChartColors`, `ExpanderState`, and related callback/info interfaces. Defines the contracts that chart implementations and renderers must satisfy. |
| [src/simple-api.ts](src/simple-api.ts) | Simplified high-level API. Provides `createChart()` which accepts a `SimpleChartOptions` object (JSON data, chart type, renderer, colors, etc.) and returns a `ChartHandle` supporting `render()`, `setData()`, and expander-based collapse/expand. Bridges the simple API to the lower-level `ChartOptions`. |
| [src/data.ts](src/data.ts) | JSON data model: `JsonGedcomData`, `JsonIndi`, `JsonFam`, `JsonEvent`, `JsonImage`, date interfaces, and the `IndiDetails`/`FamDetails` interfaces. Implements `JsonDataProvider` which wraps the JSON structure and provides typed accessors via `JsonIndiDetails` and `JsonFamDetails`. |
| [src/gedcom.ts](src/gedcom.ts) | GEDCOM 5.5.1 parser. Converts raw GEDCOM text into the `JsonGedcomData` structure via `gedcomToJson()`, and parses GEDCOM date strings into structured dates via `getDate()`. Handles names (including maiden names), events, notes, images, and `@VOID@` references. |
| [src/date-format.ts](src/date-format.ts) | Locale-aware date formatting. `formatDate()` and `formatDateOrRange()` format GEDCOM dates using `Intl.DateTimeFormat` with translations for date qualifiers (abt, before, after, etc.) in Bulgarian, Czech, German, French, Italian, Polish, and Russian. |
| [src/chart-util.ts](src/chart-util.ts) | Core chart layout and rendering utility. `ChartUtil` handles D3 tree layout via `d3-flextree`, node sizing, link path generation (horizontal and vertical), SVG data binding with enter/update/exit animations, expand/collapse controls, and chart dimension calculation. Also exports `getChartInfo()`, `linkId()`, and layout constants. |
| [src/ancestor-chart.ts](src/ancestor-chart.ts) | `AncestorChart` — builds a tree of ancestors (parents, grandparents, …) from a starting individual or family using a stack-based traversal. Also exports `getAncestorsTree()` used by the hourglass and relatives charts. |
| [src/descendant-chart.ts](src/descendant-chart.ts) | `DescendantChart` — builds a tree of descendants from a starting individual or family. Handles multiple marriages via a dummy root node (removed after layout). Also exports `layOutDescendants()` used by the hourglass, relatives, and fancy charts. |
| [src/hourglass-chart.ts](src/hourglass-chart.ts) | `HourglassChart` — combines an ancestor tree (above) and a descendant tree (below) for a single starting individual or family, sharing the start node between both halves. |
| [src/relatives-chart.ts](src/relatives-chart.ts) | `RelativesChart` — renders all relatives of a person: ancestors above with their descendant subtrees, plus the person's own descendants below. The most complex chart, computing per-ancestor descendant subtrees and arranging them left/right of the main line. |
| [src/kinship-chart.ts](src/kinship-chart.ts) | `KinshipChart` — delegates to the `HierarchyCreator` and `KinshipChartRenderer` in [src/kinship/](src/kinship/) to build and render a bidirectional (ancestors + descendants) kinship chart with link stubs for unexpanded relations. |
| [src/fancy-chart.ts](src/fancy-chart.ts) | `FancyChart` — a decorative descendant chart that draws stylized tree branches (organic Bézier curves), circular green "leaves" behind nodes, a two-tone sky/ground background, and a decorative trunk at the base. |
| [src/detailed-renderer.ts](src/detailed-renderer.ts) | `DetailedRenderer` — the full-featured renderer. Draws individual boxes with name, sex symbol, birth/death dates and places, images, notes, and color-coding by sex or generation. Extends `CompositeRenderer` and uses `formatDateOrRange` for date display. |
| [src/simple-renderer.ts](src/simple-renderer.ts) | `SimpleRenderer` — a lightweight renderer showing only the person's name and birth/death years. Extends `CompositeRenderer`. |
| [src/circle-renderer.ts](src/circle-renderer.ts) | `CircleRenderer` — renders individuals and couples as circles (first name only). Designed for use with the `FancyChart`. |
| [src/composite-renderer.ts](src/composite-renderer.ts) | `CompositeRenderer` — abstract base class for renderers built from individual and family boxes. Computes per-depth sizing, positions indi/spouse/family boxes, and provides anchor points. Shared by `DetailedRenderer` and `SimpleRenderer`. |
| [src/utils.ts](src/utils.ts) | Small utility helpers: `Vec2` type, `Direction` type, `nonEmpty()`, `last()`, `zip()`, and `points2pathd()` (converts a list of points to an SVG path `d` attribute). |
| [src/id-generator.ts](src/id-generator.ts) | `IdGenerator` — assigns unique IDs by appending a counter suffix when the same ID appears multiple times (e.g. a person shown in multiple places in a chart). |
| [src/d3-flextree.d.ts](src/d3-flextree.d.ts) | TypeScript ambient declaration for the `d3-flextree` library (flexible tree layout with variable node sizes), which has no bundled types. |
| [src/parse-gedcom.d.ts](src/parse-gedcom.d.ts) | TypeScript ambient declaration for the `parse-gedcom` library, defining the `GedcomEntry` interface and `parse()` function. |
| [src/kinship/](src/kinship/) | Subdirectory implementing the kinship chart's hierarchy builder and renderer. See [src/kinship/README.md](src/kinship/README.md) for details. |
