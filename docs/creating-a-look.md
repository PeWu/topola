# Creating a Custom Look in Topola 4

In Topola 4, **layout topology** (`hourglass` vs `relatives`) is completely decoupled from **visual appearance** (a *look*). A look combines up to four building blocks:

1. **Theme** (`theme`) — spacing, fonts, colors, and look-specific settings.
2. **Style schemes** (`schemes`) — classify people, families, and links into CSS classes and two-tone palettes.
3. **Node plug-in** (`nodePlugin`) — measures and draws each person/couple node (using `topola/toolkit` or custom SVG).
4. **Layers** (`layers`) — draw behind (`back`), with (`links`), or in front of (`front`) the nodes.

You only need to write as much as your design requires. This guide walks through five progressively deeper ways to customize or create a look.

---

## Level 1: Theme, Schemes, and `overrideCss`

Before writing any rendering code, check whether theme properties, style schemes, or `overrideCss` already achieve what you want.

```ts
import { createChart } from 'topola/core';
import { createModelGraph, type ModelData } from 'topola/model';
import {
  createDetailedNodePlugin,
  quayScheme,
  sexScheme,
} from 'topola/presets';

export function mountPrintFriendlyChart(data: ModelData) {
  const graph = createModelGraph(data);

  const chart = createChart({
    svg: '#chart',
    config: {
      graph,
      chart: 'hourglass',
      nodePlugin: createDetailedNodePlugin({
        model: graph,
        showOccupations: true,
        showTitles: true,
      }),
      schemes: [
        sexScheme(graph, {
          male: { fill: '#e3f2fd', accent: '#0d47a1' },
          female: { fill: '#fce4ec', accent: '#880e4f' },
        }),
        quayScheme(graph),
      ],
      theme: {
        fontFamily: 'Georgia, serif',
        colorTarget: 'frame', // 'background' | 'frame' | 'name'
        cornerRadius: 8,
        boxStrokeWidth: 2,
        generationSpacing: 40,
        linkColor: '#455a64',
      },
      // Always prefix selectors with {scope} so rules stay isolated to this chart.
      overrideCss: `
        {scope} .expander rect { rx: 6; ry: 6; }
        {scope} .link.additional-marriage { stroke: #90a4ae; }
      `,
    },
  });

  chart.update({ startIndi: data.indis[0]!.id });
  return chart;
}
```

---

## Level 2: Customizing Box Content on a Built-in Preset

Both `createDetailedNodePlugin` and `createSimpleNodePlugin` accept a content function that returns a `BoxContent` object (`lines`, `symbolLines`, `badges`, and `imageUrl`). Topola handles text measurement, row alignment, portrait clipping, badges, and smooth resize animations for you.

```ts
import { createChart } from 'topola/core';
import { createModelGraph, formatDateOrRange, type ModelData } from 'topola/model';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';
import type { BoxContent, SymbolLine } from 'topola/toolkit';

export function mountCompactCards(data: ModelData) {
  const graph = createModelGraph(data);

  const nodePlugin = createDetailedNodePlugin({
    model: graph,
    personContent: ({ person, personId }): BoxContent => {
      if (!person) {
        return { lines: [{ role: 'name', text: personId }] };
      }

      const fullName = [person.firstName, person.lastName]
        .filter(Boolean)
        .join(' ');
      const symbolLines: SymbolLine[] = [];

      const birthDate = person.birth
        ? formatDateOrRange(person.birth, 'en-US')
        : '';
      if (birthDate) {
        symbolLines.push({ role: 'details', symbol: '*', text: birthDate });
      }
      const deathDate = person.death
        ? formatDateOrRange(person.death, 'en-US')
        : '';
      if (deathDate) {
        symbolLines.push({ role: 'details', symbol: '+', text: deathDate });
      }

      return {
        lines: [{ role: 'name', text: fullName || '(unknown)' }],
        symbolLines,
        badges: [{ role: 'id', position: 'left', text: `#${person.id}` }],
        imageUrl: person.images?.[0]?.url,
      };
    },
    // Return null to omit marriage boxes completely.
    familyContent: () => null,
  });

  const chart = createChart({
    svg: '#chart',
    config: {
      graph,
      chart: 'hourglass',
      nodePlugin,
      schemes: [generationScheme()],
    },
  });

  chart.update({ startIndi: data.indis[0]!.id });
  return chart;
}
```

> **Tip:** Every `role` string in `lines`, `symbolLines`, or `badges` must exist in `theme.roles` (`name`, `details`, `id` in the Detailed preset). Unknown roles fall back to default typography and are reported as `UNKNOWN_LINE_ROLE` in `layout.problems`.

---

## Level 3: Building a Custom Text-Box Look with `topola/toolkit`

When you want your own typography roles, spacing, and defaults, build person and family boxes with `createTextBox` and combine them with `createCoupleAssembler`.

`createCoupleAssembler` takes care of:
* Equalizing box heights across each generation row (`rowId`),
* Placing spouses side by side and hanging the optional marriage box beneath their seam,
* Computing link anchors and expander anchors for all four directions (`down`, `up`, `right`, `left`),
* Marking clickable/stylable person and family regions (`helpers.markPerson` / `markFamily`),
* Smoothly animating box resizes during chart updates.

```ts
import type { NodePlugin } from 'topola/core';
import { formatDateOrRange, type ModelGraph } from 'topola/model';
import {
  createCoupleAssembler,
  createTextBox,
  type FamilyBoxContext,
  type PersonBoxContext,
  type TextBoxSpecificTheme,
  type TextBoxTheme,
} from 'topola/toolkit';

const ARCHIVAL_PERSON_THEME: TextBoxSpecificTheme = {
  colorTarget: 'frame',
  boxFill: '#faf6ee',
  boxStroke: '#6d5d4b',
  boxStrokeWidth: 1.5,
  underlayFill: '#faf6ee',
  textColor: '#2c241b',
  cornerRadius: 2,
  minWidth: 120,
  minHeight: 46,
  padding: { top: 8, right: 10, bottom: 8, left: 10 },
  symbolColumnWidth: 14,
  badgeGap: 10,
  imageWidth: 0,
  imageMinHeight: 0,
  roles: {
    name: {
      fontSize: 13,
      fontWeight: 700,
      lineHeight: 16,
      align: 'center',
    },
    dates: {
      fontSize: 11,
      fontStyle: 'italic',
      lineHeight: 14,
      align: 'center',
      color: '#5f5244',
    },
  },
};

const ARCHIVAL_MARRIAGE_THEME: TextBoxSpecificTheme = {
  ...ARCHIVAL_PERSON_THEME,
  minWidth: 0,
  minHeight: 0,
  padding: { top: 4, right: 8, bottom: 4, left: 8 },
};

export function createArchivalNodePlugin(
  graph: ModelGraph,
): NodePlugin<TextBoxTheme> {
  const personBox = createTextBox<PersonBoxContext, TextBoxTheme>({
    namespace: 'archival',
    defaultTheme: ARCHIVAL_PERSON_THEME,
    content: ({ personId }) => {
      const person = graph.getPerson(personId);
      const name = [person?.firstName, person?.lastName]
        .filter(Boolean)
        .join(' ');
      const birth = person?.birth?.date?.year;
      const death = person?.death?.date?.year;
      const span =
        birth !== undefined || death !== undefined
          ? `${birth ?? '?'} – ${death ?? ''}`
          : '';

      return {
        lines: [
          { role: 'name', text: name || personId },
          ...(span ? [{ role: 'dates', text: span }] : []),
        ],
      };
    },
  });

  const familyBox = createTextBox<FamilyBoxContext, TextBoxTheme>({
    namespace: 'archival',
    defaultTheme: ARCHIVAL_MARRIAGE_THEME,
    suppressWhenEmpty: true,
    content: ({ familyId }) => {
      const marriage = graph.getFamily(familyId)?.marriage;
      const dateText = marriage ? formatDateOrRange(marriage) : '';
      if (!dateText) return null;
      return {
        lines: [{ role: 'dates', text: `m. ${dateText}` }],
      };
    },
  });

  return createCoupleAssembler<TextBoxTheme>({
    personBox,
    familyBox,
    defaultTheme: {
      fontFamily: 'Georgia, serif',
      generationSpacing: 36,
      linkColor: '#6d5d4b',
    },
  });
}
```

---

## Level 4: Writing a Custom `BoxPlugin` (Custom SVG Geometry + Smooth Resize)

If you want shapes beyond `createTextBox` (for example, a pill with a left accent stripe, custom icons, or station badges), implement `BoxPlugin` and plug it into `createCoupleAssembler`.

Two toolkit helpers make custom boxes much easier:
* **`paletteCss`** generates scoped CSS rules for all active `StyleScheme` palettes. Give your SVG elements the standard part classes `.underlay`, `.background`, `.frame`, and `.name` so `generationScheme`, `sexScheme`, and `quayScheme` work automatically.
* **`drawBoxParts` + `resizeBoxParts`** let you describe your box once as a list of `BoxPart` entries (separating `fixed` attributes from `sized` attributes). When a row grows or shrinks during animation, `resizeBox` becomes a one-liner that animates cleanly.

```ts
import type { CoreTheme, NodePlugin, StyleScheme } from 'topola/core';
import type { ModelGraph } from 'topola/model';
import {
  createCoupleAssembler,
  drawBoxParts,
  paletteCss,
  resizeBoxParts,
  type BoxPart,
  type BoxPlugin,
  type ColorTarget,
  type PersonBoxContext,
} from 'topola/toolkit';

export interface PillTheme extends CoreTheme {
  colorTarget?: ColorTarget;
  pillFill: string;
  pillStroke: string;
  accentWidth: number;
}

const DEFAULT_PILL_THEME: Partial<PillTheme> = {
  colorTarget: 'frame',
  pillFill: '#ffffff',
  pillStroke: '#334155',
  accentWidth: 6,
};

export function createPillNodePlugin(graph: ModelGraph): NodePlugin<PillTheme> {
  const buildParts = (
    name: string,
    width: number,
    height: number,
    theme: PillTheme,
  ): BoxPart[] => {
    const r = Math.min(12, height / 2);
    return [
      {
        tag: 'rect',
        fixed: { class: 'underlay', x: 0, y: 0, rx: r, ry: r },
        sized: { width, height },
      },
      {
        tag: 'rect',
        fixed: { class: 'background', x: 0, y: 0, rx: r, ry: r },
        sized: { width, height },
      },
      {
        tag: 'rect',
        fixed: { class: 'accent', x: 0, y: 0, width: theme.accentWidth },
        sized: { height },
      },
      {
        tag: 'text',
        fixed: { class: 'name', 'dominant-baseline': 'central' },
        sized: { x: theme.accentWidth + 10, y: height / 2 },
        text: name,
      },
      {
        tag: 'rect',
        fixed: { class: 'frame', x: 0, y: 0, rx: r, ry: r },
        sized: { width, height },
      },
    ];
  };

  const getName = (personId: string): string => {
    const p = graph.getPerson(personId);
    return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || personId;
  };

  const personBox: BoxPlugin<PersonBoxContext, PillTheme> = {
    namespace: 'pill-box',
    defaultTheme: DEFAULT_PILL_THEME,

    getCss(scopeSelector, theme, schemes: readonly StyleScheme[]) {
      const prefix = `${scopeSelector} .pill-box`;
      return [
        `${prefix} .underlay { fill: #ffffff; stroke: none; }`,
        `${prefix} .background { fill: ${theme.pillFill}; stroke: none; }`,
        `${prefix} .accent { fill: ${theme.pillStroke}; stroke: none; }`,
        `${prefix} .frame { fill: none; stroke: ${theme.pillStroke}; stroke-width: 1.5px; pointer-events: none; }`,
        `${prefix} .name { font-family: ${theme.fontFamily}; font-size: 12px; font-weight: 600; fill: #0f172a; }`,
        ...paletteCss({ prefix, schemes, colorTarget: theme.colorTarget }),
      ].join('\n');
    },

    measureBox({ personId }, { theme, measurer }) {
      const textWidth = measurer.measureWidth(getName(personId), {
        fontFamily: theme.fontFamily,
        fontSize: 12,
        fontWeight: 600,
      });
      return {
        width: Math.max(90, theme.accentWidth + 20 + textWidth),
        height: 34,
      };
    },

    drawBox(group, { personId }, width, height, { theme }) {
      drawBoxParts(group, buildParts(getName(personId), width, height, theme));
    },

    resizeBox(group, { personId }, width, height, { theme, animation }) {
      resizeBoxParts(
        group,
        buildParts(getName(personId), width, height, theme),
        animation,
      );
    },
  };

  return createCoupleAssembler<PillTheme>({
    personBox,
    defaultTheme: DEFAULT_PILL_THEME,
  });
}
```

> **Non-box nodes:** If a node is not made of rectangular boxes at all (for example, a single circle containing both spouses), implement `NodePlugin` directly instead of calling `createCoupleAssembler`. See [src/presets/circle.ts](../src/presets/circle.ts) for a complete reference. Remember to give all nodes sharing a `rowId` the same `extents.alongBefore` so rows never overlap.

---

## Level 5: Custom Style Schemes and Layers

### Writing a Custom `StyleScheme`

A `StyleScheme` assigns tokens to people, families, or links. Topola turns each token into a CSS class on the marked element and exposes `palette` entries to `paletteCss`. You can also emit extra scoped rules via `getCss`.

```ts
import type { StyleScheme } from 'topola/core';
import type { ModelGraph } from 'topola/model';

/** Highlights people with no recorded death date as living. */
export function livingHighlightScheme(graph: ModelGraph): StyleScheme {
  return {
    id: 'living',
    palette: {
      living: { fill: '#e8f5e9', accent: '#2e7d32' },
    },
    classifyPerson({ personId }) {
      const person = graph.getPerson(personId);
      return person && !person.death ? 'living' : undefined;
    },
    getCss(scopeSelector) {
      return `${scopeSelector} .living .frame { stroke-width: 2.5px; }`;
    },
  };
}
```

> **Note:** Keep scheme tokens valid CSS identifiers (letters, digits, `-`, `_`, starting with a letter). Tokens that start with a digit (like `'1800'`) are prefixed with `_` (producing `._1800`) when turned into class names; `paletteCss` handles this automatically.

### Writing Custom `Layer`s

A `Layer` draws into one of three slots:
* `'back'` — behind everything (e.g. backgrounds, generation bands, grids).
* `'links'` — where links are drawn. **Adding any layer in the `'links'` slot replaces the default link layer.** Include `createDefaultLinkLayer()` in `config.layers` if you want to keep the standard orthogonal links alongside your own `links` layer.
* `'front'` — on top of nodes (e.g. titles, legends, annotations).

Use `getBounds` to reserve extra chart space (so legends or titles are never clipped), `createLinkRouter` to reuse Topola's orthogonal link geometry with custom styling, `ctx.animation` (`move`, `appear`, `disappear`) to stay in sync with chart animations, and `dispose` to remove any elements added to `svgDefs`.

Here is a complete example combining a `'back'` generation-band layer and a `'links'` rounded-corner link layer:

```ts
import {
  createChart,
  createLinkRouter,
  type BoundingBox,
  type CoreTheme,
  type Layer,
  type Point,
} from 'topola/core';
import type { ModelGraph } from 'topola/model';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Draws a header banner at the top of the chart and reserves space for it. */
export function createTitleBannerLayer(title: string): Layer<CoreTheme> {
  const BANNER_HEIGHT = 44;

  return {
    id: 'title-banner',
    slot: 'front',

    getBounds(layout): BoundingBox | null {
      if (layout.nodes.length === 0) return null;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      for (const n of layout.nodes) {
        minX = Math.min(minX, n.x + n.bounds.x);
        maxX = Math.max(maxX, n.x + n.bounds.x + n.bounds.width);
        minY = Math.min(minY, n.y + n.bounds.y);
      }
      return {
        x: minX,
        y: minY - BANNER_HEIGHT,
        width: maxX - minX,
        height: BANNER_HEIGHT,
      };
    },

    getCss(scopeSelector, theme) {
      return `${scopeSelector} .title-banner-text {
        font-family: ${theme.fontFamily};
        font-size: 18px;
        font-weight: 700;
        fill: #1e293b;
      }`;
    },

    render({ group, layout, animation }) {
      const doc = group.ownerDocument;
      let label = group.querySelector('text') as SVGTextElement | null;
      if (layout.nodes.length === 0) {
        if (label) animation.disappear(label);
        return;
      }

      const [width] = layout.size;
      const [originX, originY] = layout.origin;
      const x = -originX + width / 2;
      const y = -originY + 28;

      if (!label) {
        label = doc.createElementNS(SVG_NS, 'text');
        label.setAttribute('class', 'title-banner-text');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('x', String(x));
        label.setAttribute('y', String(y));
        label.textContent = title;
        group.appendChild(label);
        animation.appear(label);
      } else {
        label.textContent = title;
        // Always move kept elements to their target even if unchanged, so an
        // interrupted animation finishes cleanly at the right coordinates.
        animation.move(label, { x, y });
      }
    },
  };
}

/** Converts orthogonal corner points into an SVG path with rounded bends. */
function roundedPath(points: readonly Point[], radius: number): string {
  if (points.length < 2) return '';
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;
    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    const p1x = curr.x - ((curr.x - prev.x) / d1) * r;
    const p1y = curr.y - ((curr.y - prev.y) / d1) * r;
    const p2x = curr.x + ((next.x - curr.x) / d2) * r;
    const p2y = curr.y + ((next.y - curr.y) / d2) * r;
    d += ` L ${p1x} ${p1y} Q ${curr.x} ${curr.y} ${p2x} ${p2y}`;
  }
  const last = points[points.length - 1]!;
  return `${d} L ${last.x} ${last.y}`;
}

/** Replaces the default orthogonal links with rounded-corner links. */
export function createRoundedLinkLayer(radius = 8): Layer<CoreTheme> {
  return {
    id: 'rounded-links',
    slot: 'links',
    render({ group, layout, theme, animation }) {
      const doc = group.ownerDocument;
      const route = createLinkRouter(layout, theme);

      const existing = new Map<string, SVGPathElement>();
      for (const el of Array.from(group.children)) {
        const id = el.getAttribute('data-link-id');
        if (id) existing.set(id, el as SVGPathElement);
      }

      const activeIds = new Set<string>();
      for (const link of layout.links) {
        const d = roundedPath(route(link), radius);
        if (!d) continue;
        activeIds.add(link.id);

        let path = existing.get(link.id);
        const cls =
          link.kind === 'additionalMarriage'
            ? 'link additional-marriage'
            : 'link';

        if (!path) {
          path = doc.createElementNS(SVG_NS, 'path');
          path.setAttribute('data-link-id', link.id);
          path.setAttribute('class', cls);
          path.setAttribute('d', d);
          group.appendChild(path);
          animation.appear(path);
        } else {
          path.setAttribute('class', cls);
          animation.move(path, { d });
        }
      }

      for (const [id, el] of existing) {
        if (!activeIds.has(id)) {
          animation.disappear(el);
        }
      }
    },
  };
}

export function mountCustomLook(graph: ModelGraph, startIndi: string) {
  const chart = createChart({
    svg: '#chart',
    config: {
      graph,
      chart: 'hourglass',
      animate: true,
      nodePlugin: createDetailedNodePlugin({ model: graph }),
      schemes: [generationScheme()],
      layers: [
        createRoundedLinkLayer(10),
        createTitleBannerLayer('Family Tree'),
      ],
    },
  });
  chart.update({ startIndi });
  return chart;
}
```

---

## Real-World Examples & Guidelines

* **Interactive StackBlitz example:** Try the complete pill-cards + rounded-links + title-banner custom look live on [StackBlitz](https://stackblitz.com/github/PeWu/topola/tree/v4/examples/custom-look) ([`examples/custom-look`](../examples/custom-look/src/main.ts)).
* **Built-in multi-layer look:** [src/presets/fancy.ts](../src/presets/fancy.ts) combines `createCircleNodePlugin` with custom sky/grass, foliage canopy, organic branches, and tree trunk layers.
* **External look built purely on public APIs:** See `transit_look.ts` in [Topola Genealogy Viewer](https://github.com/PeWu/topola-viewer) for a full metro-map look using a custom `BoxPlugin`, all three layer slots, `svgDefs`, `createLinkRouter`, and custom themes.
* **Animation helper contract:** `move`, `appear`, and `disappear` own the inline `opacity` of elements passed to them and act immediately when `animate` is off. Because a new update can interrupt an in-progress animation, always call `move` on every retained element with its current target attributes on every update.
* **Trusted CSS values:** Theme values, palette colors, box namespaces, and `overrideCss` are written verbatim into the chart's `<style>` tag (which belongs to the host document for inline SVGs). Only pass values controlled or validated by your application — never raw URL parameters or untrusted user input. Data fields (names, places, IDs) are written only as text/attributes, and `imageUrl` only allows `http(s):`, `blob:`, `data:image/`, or scheme-less URLs.
