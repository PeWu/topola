# Migrating from Topola v3 to v4

Topola 4 is a ground-up redesign with a cleaner, modular architecture:

* **Pure ESM & typed subpath exports** (`topola/core`, `topola/model`, `topola/presets`, `topola/toolkit`, `topola/gedcom`, plus the `topola` convenience barrel).
* **Explicit `FamilyGraph`:** Build a graph once via `createModelGraph(data)` instead of passing raw JSON into every chart call.
* **Persistent `Chart` instance:** `createChart` owns the SVG scope, stylesheets, and animations. Update the view with `chart.update()`, tweak settings with `chart.patchConfig()`, or swap looks cleanly with `chart.setConfig()`.
* **No external CSS required:** Styles are generated and scoped per chart instance inside `<style>` inside the SVG, making standalone SVG/PNG/PDF exports self-contained.
* **Unified topologies & composable looks:** `HourglassChart`, `AncestorChart`, and `DescendantChart` are unified under `chart: 'hourglass'` (with `maxAncestorGenerations` / `maxDescendantGenerations`), and colors are driven by composable `StyleScheme`s with print-friendly `colorTarget` options.

---

## Complete Example: v3 vs v4

Consider an interactive GEDCOM hourglass chart with generation colors, click-to-refocus animations, expanders, and Shift-click to open an external profile page.

### Before (v3)

```ts
import * as topola from 'topola';

const json = topola.gedcomToJson(gedcomText);
let startIndi = json.indis[0].id;
let baseGeneration = 0;

const chart = topola.createChart({
  json,
  svgSelector: '#chart',
  chartType: topola.HourglassChart,
  renderer: topola.DetailedRenderer,
  colors: topola.ChartColors.COLOR_BY_GENERATION,
  animate: true,
  expanders: true,
  locale: 'en-US',
  indiCallback: (info) => {
    if (info.modifiers?.shiftKey) {
      window.open(`https://example.org/person/${info.id}`, '_blank');
      return;
    }
    startIndi = info.id;
    baseGeneration = info.generation;
    chart.render({ startIndi, baseGeneration });
  },
});

const info = chart.render({ startIndi, baseGeneration });
console.log('Chart size:', info.size, 'origin:', info.origin);
```

### After (v4)

```ts
import { gedcomToModel } from 'topola/gedcom';
import { createModelGraph } from 'topola/model';
import { createChart, expanderKey, type ExpanderKey } from 'topola/core';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';

const model = gedcomToModel(gedcomText);
const graph = createModelGraph(model);

const first = model.indis[0];
if (!first) throw new Error('The file has no people.');
let startIndi = first.id;
let baseGeneration = 0;
const collapsed = new Set<ExpanderKey>();

const chart = createChart({
  svg: '#chart',
  config: {
    graph,
    chart: 'hourglass',
    animate: true,
    expanders: true,
    nodePlugin: createDetailedNodePlugin({
      model: graph,
      locale: 'en-US',
    }),
    schemes: [generationScheme()],
    onPersonClick: ({ id, generation, modifiers }) => {
      if (modifiers.shiftKey) {
        window.open(
          `https://example.org/person/${encodeURIComponent(id)}`,
          '_blank',
        );
        return;
      }
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
    onLayout: (layout, { animated }) => {
      console.log('Chart size:', layout.size, 'origin:', layout.origin, animated);
    },
  },
});

const { layout } = chart.update({ startIndi, baseGeneration, collapsed });
console.log('Initial size:', layout.size);
```

Key differences visible in the example:
1. `gedcomToJson(gedcom)` becomes `gedcomToModel(gedcom)` followed by `createModelGraph(model)`.
2. `svgSelector` becomes `svg` (accepts a selector string, `SVGSVGElement`, or `SVGGElement`), and options live under `config`.
3. `chartType` + `renderer` + `colors` become `chart: 'hourglass'`, `nodePlugin: createDetailedNodePlugin(...)`, and `schemes: [generationScheme()]`.
4. `indiCallback` becomes `onPersonClick` (and `famCallback` becomes `onFamilyClick`).
5. Expander state is now controlled explicitly through `ViewState.collapsed` and `onExpanderClick`.
6. `chart.render(...)` becomes `chart.update(...)`, returning `{ layout, finished }` (and `onLayout` is also called automatically if web fonts load later and trigger a remeasure).

---

## API Mapping Reference

| v3 API | v4 Equivalent | Notes |
| --- | --- | --- |
| `gedcomToJson(text)` | `gedcomToModel(text)` | Imported from `topola/gedcom` |
| `JsonGedcomData` | `ModelData` / `ModelDataInput` | Imported from `topola/model` |
| `JsonDataProvider` | `createModelGraph(data)` | Imported from `topola/model`; exposes `.problems` |
| `createChart({ svgSelector, ... })` | `createChart({ svg, config })` | Imported from `topola/core` |
| `chart.render({ startIndi, baseGeneration })` | `chart.update({ startIndi, baseGeneration, collapsed })` | Returns `{ layout, finished }` |
| `chart.setData(json)` | `chart.setConfig(newConfig, viewState)` | Rebuild `graph`, `nodePlugin`, and `schemes` |
| `HourglassChart` | `chart: 'hourglass'` | Default shows both ancestors and descendants |
| `AncestorChart` | `chart: 'hourglass', maxDescendantGenerations: 0` | Same engine, descendants disabled |
| `DescendantChart` | `chart: 'hourglass', maxAncestorGenerations: 0` | Same engine, ancestors disabled |
| `RelativesChart` | `chart: 'relatives'` | Supports `maxAncestorGenerations` |
| `FancyChart` + `CircleRenderer` | `createFancyConfig({ model: graph })` | Imported from `topola/presets`; returns a full `ChartConfig` |
| `KinshipChart` | *(removed)* | Not included in v4 |
| `DetailedRenderer` | `createDetailedNodePlugin({ model: graph, ... })` | Imported from `topola/presets` |
| `SimpleRenderer` | `createSimpleNodePlugin({ model: graph, ... })` | Imported from `topola/presets` |
| `CircleRenderer` | `createCircleNodePlugin({ model: graph, ... })` | Imported from `topola/presets` |
| `CompositeRenderer` | `createCoupleAssembler(...)` / custom `NodePlugin` | See [Creating a Custom Look](creating-a-look.md) |
| `ChartColors.NO_COLOR` | `schemes: []` | Or `[quayScheme(graph)]` to keep confidence dashes |
| `ChartColors.COLOR_BY_GENERATION` | `schemes: [generationScheme()]` | Add `theme: { colorTarget: 'frame' \| 'name' }` for print-friendly styles |
| `ChartColors.COLOR_BY_SEX` | `schemes: [sexScheme(graph)]` | Accepts optional custom palette overrides |
| `horizontal: true` | `direction: 'right'` | Also supports `'down'` (default), `'up'`, `'left'` |
| `startFam: 'F1'` | `startIndi: partnerId` | Root spouse is promoted automatically when married |
| `indiCallback` / `famCallback` | `onPersonClick` / `onFamilyClick` | Receives `{ id, nodeId, generation, modifiers, event }` |
| `indiUrl` / `famUrl` | Handle navigation inside `onPersonClick` / `onFamilyClick` | `<a href>` wrappers were removed |
| `getDate(...)` / `formatDate(...)` | `parseGedcomDate(...)` / `formatDateOrRange(...)` | `topola/gedcom` and `topola/model` |
| External `topola.css` overrides | `config.theme` and `config.overrideCss` | Use `{scope}` prefix in `overrideCss` |

---

## Common Migration Scenarios

### Ancestor-only and Descendant-only Charts

```ts
import { createChart } from 'topola/core';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';
import type { ModelGraph } from 'topola/model';

export function createAncestorAndDescendantCharts(
  graph: ModelGraph,
  startIndi: string,
) {
  // Replaces AncestorChart with horizontal: true
  const ancestors = createChart({
    svg: '#ancestors',
    config: {
      graph,
      chart: 'hourglass',
      direction: 'right',
      maxDescendantGenerations: 0,
      nodePlugin: createDetailedNodePlugin({ model: graph }),
      schemes: [generationScheme()],
    },
  });
  ancestors.update({ startIndi });

  // Replaces DescendantChart
  const descendants = createChart({
    svg: '#descendants',
    config: {
      graph,
      chart: 'hourglass',
      maxAncestorGenerations: 0,
      nodePlugin: createDetailedNodePlugin({ model: graph }),
      schemes: [generationScheme()],
    },
  });
  descendants.update({ startIndi });

  return { ancestors, descendants };
}
```

### Replacing `indiUrl` and `famUrl`

Topola 4 no longer wraps boxes in `<a href>` elements. Handle link navigation in `onPersonClick` and `onFamilyClick`, using `modifiers` if you want Ctrl/Cmd-click to open a new tab:

```ts
import type { ClickInfo } from 'topola/core';

function navigateTo(url: string, { modifiers }: ClickInfo) {
  if (modifiers.ctrlKey || modifiers.metaKey) {
    window.open(url, '_blank', 'noopener');
  } else {
    window.location.href = url;
  }
}

export const clickHandlers = {
  onPersonClick: (info: ClickInfo) =>
    navigateTo(`/person/${encodeURIComponent(info.id)}`, info),
  onFamilyClick: (info: ClickInfo) =>
    navigateTo(`/family/${encodeURIComponent(info.id)}`, info),
};
```

### Replacing `startFam`

`ViewState` always starts from `startIndi`. If the start person has a spouse, Topola automatically promotes the couple at the root. If your app only has a family ID, pick its first partner from the graph:

```ts
import type { FamilyGraph } from 'topola/core';

export function startIndiFromFamily(
  graph: FamilyGraph,
  familyId: string,
): string | undefined {
  const [partner1, partner2] = graph.getFamilyPartners(familyId);
  return partner1 ?? partner2 ?? undefined;
}
```

### Switching Looks, Options, or Data Dynamically

Keep a single `Chart` instance instead of tearing down and recreating it on every toggle:

```ts
import type { Chart, ChartConfig } from 'topola/core';
import type { ModelGraph } from 'topola/model';
import {
  createDetailedNodePlugin,
  createFancyConfig,
  sexScheme,
  type FancyTheme,
} from 'topola/presets';
import type { TextBoxTheme } from 'topola/toolkit';

export function switchChartSettings(
  chart: Chart<TextBoxTheme & FancyTheme>,
  graph: ModelGraph,
  startIndi: string,
) {
  // 1. Tweak a few fields on the current look (e.g. switch to colored borders):
  chart.patchConfig({
    schemes: [sexScheme(graph)],
    theme: { colorTarget: 'frame' },
  });

  // 2. Switch to a completely different look (Fancy tree) — use setConfig so
  //    layers/theme from the previous look do not linger:
  const fancyConfig = createFancyConfig({ model: graph });
  chart.setConfig(
    fancyConfig as ChartConfig<TextBoxTheme & FancyTheme>,
    { startIndi },
    { animate: false },
  );

  // 3. Switch back to Detailed hourglass:
  chart.setConfig(
    {
      graph,
      chart: 'hourglass',
      nodePlugin: createDetailedNodePlugin({ model: graph }),
    },
    { startIndi },
    { animate: false },
  );
}
```

### Updating Data & Cleanup

* When loading a new GEDCOM file or changing relationships, construct a new `ModelGraph`, rebuild `nodePlugin` and any model-dependent schemes (`sexScheme`, `quayScheme`), and call `chart.setConfig(newConfig, newViewState, { animate: false })`.
* When editing a person's name or date in place without changing relationships, call `chart.remeasure()`.
* Call `chart.dispose()` when unmounting your component to stop in-flight animations, remove font-load listeners, and clean up the SVG container.
