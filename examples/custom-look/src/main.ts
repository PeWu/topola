import {
  createChart,
  createLinkRouter,
  type BoundingBox,
  type CoreTheme,
  type Layer,
  type NodePlugin,
  type Point,
  type StyleScheme,
} from 'topola/core';
import {
  createModelGraph,
  type ModelDataInput,
  type ModelGraph,
} from 'topola/model';
import { sexScheme } from 'topola/presets';
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
import data from './data.json';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface PillTheme extends CoreTheme {
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
  generationSpacing: 40,
  linkColor: '#64748b',
  linkStrokeWidth: 2,
};

function createPillNodePlugin(graph: ModelGraph): NodePlugin<PillTheme> {
  const formatLabel = (personId: string): { name: string; years: string } => {
    const p = graph.getPerson(personId);
    const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ') || personId;
    const b = p?.birth?.date?.year;
    const d = p?.death?.date?.year;
    const years =
      b !== undefined || d !== undefined ? `${b ?? '?'} – ${d ?? ''}` : '';
    return { name, years };
  };

  const buildParts = (
    personId: string,
    width: number,
    height: number,
    theme: PillTheme,
  ): BoxPart[] => {
    const { name, years } = formatLabel(personId);
    const r = 10;
    const textX = theme.accentWidth + 15;
    const parts: BoxPart[] = [
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
        fixed: { class: 'accent', x: 5, y: 7, width: theme.accentWidth, rx: 3, ry: 3 },
        sized: { height: Math.max(0, height - 14) },
      },
      {
        tag: 'text',
        fixed: { class: 'name' },
        sized: { x: textX, y: years ? height / 2 - 4 : height / 2 + 4 },
        text: name,
      },
    ];
    if (years) {
      parts.push({
        tag: 'text',
        fixed: { class: 'years' },
        sized: { x: textX, y: height / 2 + 12 },
        text: years,
      });
    }
    parts.push({
      tag: 'rect',
      fixed: { class: 'frame', x: 0, y: 0, rx: r, ry: r },
      sized: { width, height },
    });
    return parts;
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
        `${prefix} .years { font-family: ${theme.fontFamily}; font-size: 10px; fill: #64748b; }`,
        ...paletteCss({ prefix, schemes, colorTarget: theme.colorTarget }),
        ...paletteCss({
          prefix,
          schemes,
          colorTarget: 'name',
          parts: { name: '.accent' },
        }),
      ].join('\n');
    },

    measureBox({ personId }, { theme, measurer }) {
      const { name, years } = formatLabel(personId);
      const nameW = measurer.measureWidth(name, {
        fontFamily: theme.fontFamily,
        fontSize: 12,
        fontWeight: 600,
      });
      const yearsW = years
        ? measurer.measureWidth(years, {
            fontFamily: theme.fontFamily,
            fontSize: 10,
          })
        : 0;
      return {
        width: Math.max(100, theme.accentWidth + 28 + Math.max(nameW, yearsW)),
        height: years ? 44 : 34,
      };
    },

    drawBox(group, { personId }, width, height, { theme }) {
      drawBoxParts(group, buildParts(personId, width, height, theme));
    },

    resizeBox(group, { personId }, width, height, { theme, animation }) {
      resizeBoxParts(
        group,
        buildParts(personId, width, height, theme),
        animation,
      );
    },
  };

  return createCoupleAssembler<PillTheme>({
    personBox,
    defaultTheme: DEFAULT_PILL_THEME,
  });
}

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

function createRoundedLinkLayer(radius = 10): Layer<PillTheme> {
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

      const active = new Set<string>();
      for (const link of layout.links) {
        const d = roundedPath(route(link), radius);
        if (!d) continue;
        active.add(link.id);
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
        if (!active.has(id)) animation.disappear(el);
      }
    },
  };
}

function createTitleBannerLayer(title: string): Layer<PillTheme> {
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
      return `${scopeSelector} .banner-title { font-family: ${theme.fontFamily}; font-size: 18px; font-weight: 700; fill: #0f172a; }`;
    },
    render({ group, layout, animation }) {
      const doc = group.ownerDocument;
      let label = group.querySelector('text') as SVGTextElement | null;
      if (layout.nodes.length === 0) {
        if (label) animation.disappear(label);
        return;
      }
      const x = -layout.origin[0] + layout.size[0] / 2;
      const y = -layout.origin[1] + 28;
      if (!label) {
        label = doc.createElementNS(SVG_NS, 'text');
        label.setAttribute('class', 'banner-title');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('x', String(x));
        label.setAttribute('y', String(y));
        label.textContent = title;
        group.appendChild(label);
        animation.appear(label);
      } else {
        animation.move(label, { x, y });
      }
    },
  };
}

const graph = createModelGraph(data as ModelDataInput);

const chart = createChart({
  svg: '#chart',
  config: {
    graph,
    chart: 'hourglass',
    animate: true,
    nodePlugin: createPillNodePlugin(graph),
    schemes: [sexScheme(graph)],
    layers: [
      createRoundedLinkLayer(10),
      createTitleBannerLayer('Custom Look – Pill Cards & Rounded Links'),
    ],
    onPersonClick: ({ id, generation }) => {
      chart.update({ startIndi: id, baseGeneration: generation });
    },
  },
});

chart.update({ startIndi: 'I9555', baseGeneration: 0 });
