import type {
  BoundingBox,
  ChartConfig,
  ClickInfo,
  CoreTheme,
  ExpanderClickInfo,
  Layer,
  LayerRenderContext,
  LayoutNode,
  NodePlugin,
  StyleScheme,
  TextMeasurer,
} from '../core/index.js';
import type { ModelDataInput, ModelGraph } from '../model/index.js';
import { toModelGraph } from '../model/internal.js';
import {
  DEFAULT_CIRCLE_THEME,
  createCircleNodePlugin,
  type CircleTheme,
} from './circle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface FancySpecificTheme {
  skyColor: string;
  grassColor: string;
  leafSolidColor: string;
  leafGlowColor: string;
  woodColor: string;
}

export type FancyTheme = CircleTheme & FancySpecificTheme;

const FANCY_COLORS: FancySpecificTheme = {
  skyColor: '#ccffff',
  grassColor: '#449944',
  leafSolidColor: '#449933',
  leafGlowColor: '#88ff88',
  woodColor: '#663322',
};

/** The layout of the Fancy tree; its colours are defaults of its layers. */
const FANCY_LAYOUT_THEME: Partial<FancyTheme> = { generationSpacing: 100 };

/** Everything the Fancy tree changes in the theme, for reference. */
export const DEFAULT_FANCY_THEME: Partial<FancyTheme> = {
  ...DEFAULT_CIRCLE_THEME,
  ...FANCY_LAYOUT_THEME,
  ...FANCY_COLORS,
};

function computeLeafRadius(node: LayoutNode, minGeneration: number): number {
  return (
    280 - 180 / Math.sqrt(1 + Math.max(0, node.generation - minGeneration))
  );
}

function organicBranchPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const yMid = y2 + 110;
  if (x2 > x1 + 100) {
    return `M ${x1 + 10} ${y1} C ${x1 + 10} ${yMid + 25} ${x1 + 45} ${yMid + 10} ${(x1 + x2) / 2} ${yMid + 5} C ${x2 - 45} ${yMid} ${x2 + 2} ${yMid - 25} ${x2 + 2} ${y2} L ${x2 - 2} ${y2} C ${x2 - 2} ${yMid - 25} ${x2 - 45} ${yMid - 10} ${(x1 + x2) / 2} ${yMid - 5} C ${x1 + 45} ${yMid} ${x1 - 10} ${yMid + 25} ${x1 - 10} ${y1} Z`;
  }
  if (x2 < x1 - 100) {
    return `M ${x1 - 10} ${y1} C ${x1 - 10} ${yMid + 25} ${x1 - 45} ${yMid + 10} ${(x1 + x2) / 2} ${yMid + 5} C ${x2 + 45} ${yMid} ${x2 - 2} ${yMid - 25} ${x2 - 2} ${y2} L ${x2 + 2} ${y2} C ${x2 + 2} ${yMid - 25} ${x2 + 45} ${yMid - 10} ${(x1 + x2) / 2} ${yMid - 5} C ${x1 - 45} ${yMid} ${x1 + 10} ${yMid + 25} ${x1 + 10} ${y1} Z`;
  }
  return `M ${x1 + 10} ${y1} C ${x1 + 10} ${yMid + 25} ${x2 + 2} ${yMid - 25} ${x2 + 2} ${y2} L ${x2 - 2} ${y2} C ${x2 - 2} ${yMid - 25} ${x1 - 10} ${yMid + 25} ${x1 - 10} ${y1} Z`;
}

/**
 * Creates the background of the Fancy tree: sky down to the height of the start
 * person and grass below (`skyColor`, `grassColor`).
 */
export function createFancySkyGrassLayer<
  TTheme extends CoreTheme = FancyTheme,
>(): Layer<TTheme> {
  return {
    id: 'fancy-sky-grass',
    slot: 'back',
    defaultTheme: {
      skyColor: FANCY_COLORS.skyColor,
      grassColor: FANCY_COLORS.grassColor,
    } as Partial<FancyTheme> as Partial<TTheme>,
    render(ctx: LayerRenderContext<TTheme>): void {
      const { group, layout, theme } = ctx;
      const doc = group.ownerDocument;
      while (group.firstChild) {
        group.removeChild(group.firstChild);
      }

      const raw = theme as Partial<FancyTheme>;
      const skyColor = raw.skyColor ?? FANCY_COLORS.skyColor;
      const grassColor = raw.grassColor ?? FANCY_COLORS.grassColor;
      const [width, height] = layout.size;
      const [originX, originY] = layout.origin;
      if (width <= 0 || height <= 0) return;

      const skyHeight = Math.max(0, Math.min(height, originY));
      const grassHeight = Math.max(0, height - skyHeight);

      if (skyHeight > 0) {
        const sky = doc.createElementNS(SVG_NS, 'rect');
        sky.setAttribute('class', 'fancy-sky');
        sky.setAttribute('x', String(-originX));
        sky.setAttribute('y', String(-originY));
        sky.setAttribute('width', String(width));
        sky.setAttribute('height', String(skyHeight));
        sky.setAttribute('fill', skyColor);
        group.appendChild(sky);
      }

      if (grassHeight > 0) {
        const grass = doc.createElementNS(SVG_NS, 'rect');
        grass.setAttribute('class', 'fancy-grass');
        grass.setAttribute('x', String(-originX));
        grass.setAttribute('y', String(-originY + skyHeight));
        grass.setAttribute('width', String(width));
        grass.setAttribute('height', String(grassHeight));
        grass.setAttribute('fill', grassColor);
        group.appendChild(grass);
      }
    },
  };
}

function minGeneration(nodes: readonly LayoutNode[]): number {
  let min = Infinity;
  for (const n of nodes) {
    if (n.generation < min) min = n.generation;
  }
  return min;
}

/**
 * Creates the foliage of the Fancy tree: behind every node but the root a disc
 * with a glow, larger for later generations (`leafSolidColor`,
 * `leafGlowColor`).
 */
export function createFancyLeavesLayer<
  TTheme extends CoreTheme = FancyTheme,
>(): Layer<TTheme> {
  return {
    id: 'fancy-leaves',
    slot: 'back',
    defaultTheme: {
      leafSolidColor: FANCY_COLORS.leafSolidColor,
      leafGlowColor: FANCY_COLORS.leafGlowColor,
    } as Partial<FancyTheme> as Partial<TTheme>,
    getBounds({ nodes }): BoundingBox | null {
      const leafNodes = nodes.filter((n) => !n.isRoot);
      if (leafNodes.length === 0) return null;
      const minGen = minGeneration(leafNodes);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of leafNodes) {
        const r = computeLeafRadius(n, minGen);
        if (n.x - r < minX) minX = n.x - r;
        if (n.y - r < minY) minY = n.y - r;
        if (n.x + r > maxX) maxX = n.x + r;
        if (n.y + r > maxY) maxY = n.y + r;
      }
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    render(ctx: LayerRenderContext<TTheme>): void {
      const { group, svgDefs, instanceId, layout, theme } = ctx;
      const doc = group.ownerDocument;
      while (group.firstChild) {
        group.removeChild(group.firstChild);
      }

      const leafNodes = layout.nodes.filter((n) => !n.isRoot);
      if (leafNodes.length === 0) return;

      const gradId = `topola-fancy-grad-${instanceId}`;
      const raw = theme as Partial<FancyTheme>;
      const glowColor = raw.leafGlowColor ?? FANCY_COLORS.leafGlowColor;
      const solidColor = raw.leafSolidColor ?? FANCY_COLORS.leafSolidColor;

      let gradEl = svgDefs.querySelector(`#${gradId}`);
      if (!gradEl) {
        gradEl = doc.createElementNS(SVG_NS, 'radialGradient');
        gradEl.setAttribute('id', gradId);
        const stops: Array<[string, string]> = [
          ['0%', '1'],
          ['80%', '0.5'],
          ['100%', '0'],
        ];
        for (const [offset, opacity] of stops) {
          const stop = doc.createElementNS(SVG_NS, 'stop');
          stop.setAttribute('offset', offset);
          stop.setAttribute('stop-color', glowColor);
          stop.setAttribute('stop-opacity', opacity);
          gradEl.appendChild(stop);
        }
        svgDefs.appendChild(gradEl);
      }
      // The gradient stays for the life of the chart; the theme may change.
      for (const stop of Array.from(gradEl.children)) {
        if (stop.getAttribute('stop-color') !== glowColor) {
          stop.setAttribute('stop-color', glowColor);
        }
      }

      const minGen = minGeneration(leafNodes);

      // Solid foliage pass
      for (const n of leafNodes) {
        const r = computeLeafRadius(n, minGen);
        const c = doc.createElementNS(SVG_NS, 'circle');
        c.setAttribute('class', 'fancy-leaf-solid');
        c.setAttribute('cx', String(n.x));
        c.setAttribute('cy', String(n.y));
        c.setAttribute('r', String(r));
        c.setAttribute('fill', solidColor);
        group.appendChild(c);
      }

      // Soft radial-glow foliage pass
      for (const n of leafNodes) {
        const r = computeLeafRadius(n, minGen);
        const c = doc.createElementNS(SVG_NS, 'circle');
        c.setAttribute('class', 'fancy-leaf-glow');
        c.setAttribute('cx', String(n.x));
        c.setAttribute('cy', String(n.y));
        c.setAttribute('r', String(r));
        c.setAttribute('fill', `url(#${gradId})`);
        group.appendChild(c);
      }
    },
    dispose({ svgDefs, instanceId }): void {
      svgDefs.querySelector(`#topola-fancy-grad-${instanceId}`)?.remove();
    },
  };
}

/** Creates the trunk of the Fancy tree, below the root node (`woodColor`). */
export function createFancyTrunkLayer<
  TTheme extends CoreTheme = FancyTheme,
>(): Layer<TTheme> {
  return {
    id: 'fancy-trunk',
    slot: 'back',
    defaultTheme: {
      woodColor: FANCY_COLORS.woodColor,
    } as Partial<FancyTheme> as Partial<TTheme>,
    getBounds({ nodes }): BoundingBox | null {
      const roots = nodes.filter((n) => n.isRoot);
      if (roots.length === 0) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const r of roots) {
        if (r.x - 40 < minX) minX = r.x - 40;
        if (r.y + 20 < minY) minY = r.y + 20;
        if (r.x + 40 > maxX) maxX = r.x + 40;
        if (r.y + 90 > maxY) maxY = r.y + 90;
      }
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    getCss(scopeSelector: string, theme: TTheme): string {
      const wood =
        (theme as Partial<FancyTheme>).woodColor ?? FANCY_COLORS.woodColor;
      return `${scopeSelector} .trunk { fill: ${wood}; stroke: ${wood}; }`;
    },
    render(ctx: LayerRenderContext<TTheme>): void {
      const { group, layout } = ctx;
      const doc = group.ownerDocument;
      while (group.firstChild) {
        group.removeChild(group.firstChild);
      }
      for (const r of layout.nodes.filter((n) => n.isRoot)) {
        const tg = doc.createElementNS(SVG_NS, 'g');
        tg.setAttribute('class', 'trunk');
        tg.setAttribute('transform', `translate(${r.x}, ${r.y})`);
        const path = doc.createElementNS(SVG_NS, 'path');
        path.setAttribute(
          'd',
          'M 10 20 L 10 40 C 10 60 10 90 40 90 L -40 90 C -10 90 -10 60 -10 40 L -10 20 Z',
        );
        tg.appendChild(path);
        group.appendChild(tg);
      }
    },
  };
}

/**
 * Creates the links of the Fancy tree: curved branches from the parents to
 * their children (`woodColor`, `generationSpacing: 100`). It has the `links`
 * slot, so it replaces the default link layer.
 */
export function createFancyBranchLayer<
  TTheme extends CoreTheme = FancyTheme,
>(): Layer<TTheme> {
  return {
    id: 'fancy-branches',
    slot: 'links',
    defaultTheme: {
      woodColor: FANCY_COLORS.woodColor,
      ...FANCY_LAYOUT_THEME,
    } as Partial<FancyTheme> as Partial<TTheme>,
    getCss(scopeSelector: string, theme: TTheme): string {
      const wood =
        (theme as Partial<FancyTheme>).woodColor ?? FANCY_COLORS.woodColor;
      return `${scopeSelector} .branch { fill: ${wood}; stroke: ${wood}; }`;
    },
    render(ctx: LayerRenderContext<TTheme>): void {
      const { group, layout } = ctx;
      const doc = group.ownerDocument;
      while (group.firstChild) {
        group.removeChild(group.firstChild);
      }

      const nodeMap = new Map<string, LayoutNode>();
      for (const n of layout.nodes) {
        nodeMap.set(n.id, n);
      }

      for (const link of layout.links) {
        const fromNode = nodeMap.get(link.fromNodeId);
        const toNode = nodeMap.get(link.toNodeId);
        if (!fromNode || !toNode) continue;

        const sx = fromNode.x + fromNode.anchors[link.fromSlot].x;
        const sy = fromNode.y + fromNode.anchors[link.fromSlot].y;
        const dx = toNode.x + toNode.anchors[link.toSlot].x;
        const dy = toNode.y + toNode.anchors[link.toSlot].y;

        const path = doc.createElementNS(SVG_NS, 'path');
        if (link.kind === 'additionalMarriage') {
          path.setAttribute('class', 'branch additional-marriage');
          path.setAttribute(
            'd',
            `M ${sx} ${sy + 2} L ${dx} ${dy + 10} L ${dx} ${dy - 10} L ${sx} ${sy - 2} Z`,
          );
        } else {
          path.setAttribute('class', 'branch');
          path.setAttribute('d', organicBranchPath(sx, sy, dx, dy));
        }
        group.appendChild(path);
      }
    },
  };
}

export interface CreateFancyConfigOptions<
  TTheme extends CoreTheme = FancyTheme,
> {
  model: ModelDataInput | ModelGraph;
  nodePlugin?: NodePlugin<TTheme> | undefined;
  schemes?: readonly StyleScheme[] | undefined;
  theme?: Partial<FancyTheme & TTheme> | undefined;
  /**
   * Off by default. The circles animate; the sky, leaves, trunk and branches
   * are drawn again at once, at their new places.
   */
  animate?: boolean | undefined;
  expanders?: boolean | undefined;
  updateSvgSize?: boolean | undefined;
  maxDescendantGenerations?: number | undefined;
  overrideCss?: string | undefined;
  textMeasurer?: TextMeasurer | undefined;
  /** See `ChartConfig.keyboard`. */
  keyboard?: boolean | undefined;
  /** See `ChartConfig.expanderLabel`. */
  expanderLabel?: ChartConfig<FancyTheme & TTheme>['expanderLabel'];
  /** See `ChartConfig.onPersonClick`. */
  onPersonClick?: ((info: ClickInfo) => void) | undefined;
  /** See `ChartConfig.onFamilyClick`. */
  onFamilyClick?: ((info: ClickInfo) => void) | undefined;
  /** See `ChartConfig.onExpanderClick`. */
  onExpanderClick?: ((info: ExpanderClickInfo) => void) | undefined;
  onLayout?: ChartConfig<FancyTheme & TTheme>['onLayout'];
}

/**
 * Creates the config of the Fancy tree: the descendants of the start person as
 * circles on a tree that grows upwards, with a trunk, branches and foliage in
 * front of sky and grass.
 *
 * It is an hourglass chart without ancestors in the direction `up`, with the
 * Circle node plug-in (or `nodePlugin`) and the four Fancy layers. Pass it to
 * `createChart` or to `Chart.setConfig`.
 */
export function createFancyConfig<TTheme extends CoreTheme = FancyTheme>(
  options: CreateFancyConfigOptions<TTheme>,
): ChartConfig<FancyTheme & TTheme> {
  const graph = toModelGraph(options.model);

  const nodePlugin: NodePlugin<FancyTheme & TTheme> =
    (options.nodePlugin as NodePlugin<FancyTheme & TTheme> | undefined) ??
    createCircleNodePlugin<FancyTheme & TTheme>({ model: graph });

  return {
    graph,
    chart: 'hourglass',
    direction: 'up',
    maxAncestorGenerations: 0,
    maxDescendantGenerations: options.maxDescendantGenerations,
    animate: options.animate ?? false,
    expanders: options.expanders,
    updateSvgSize: options.updateSvgSize,
    nodePlugin,
    layers: [
      createFancySkyGrassLayer<FancyTheme & TTheme>(),
      createFancyLeavesLayer<FancyTheme & TTheme>(),
      createFancyTrunkLayer<FancyTheme & TTheme>(),
      createFancyBranchLayer<FancyTheme & TTheme>(),
    ],
    schemes: options.schemes,
    theme: { ...(options.theme ?? {}) } as Partial<FancyTheme & TTheme>,
    overrideCss: options.overrideCss,
    textMeasurer: options.textMeasurer,
    keyboard: options.keyboard,
    expanderLabel: options.expanderLabel,
    onPersonClick: options.onPersonClick,
    onFamilyClick: options.onFamilyClick,
    onExpanderClick: options.onExpanderClick,
    onLayout: options.onLayout,
  };
}
