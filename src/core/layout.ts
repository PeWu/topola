import {
  getAlongSign,
  isHorizontalDirection,
  projectExtents,
  projectPoint,
  projectRegion,
  type AbstractPoint,
} from './axes.js';
import {
  buildHourglassStage1,
  positionHourglassStage3,
} from './hourglass-layout.js';
import {
  buildRelativesStage1,
  positionRelativesStage3,
} from './relatives-layout.js';
import { sanitizeMeasuredNode, sanitizeMeasuredNodes } from './tidy-tree.js';
import type { BuiltTreeNode } from './tree-builder.js';
import { createCanvasTextMeasurer } from './text-measurer.js';
import { SLOTS } from './types.js';
import type {
  BoxExtents,
  ChartConfig,
  CoreTheme,
  Direction,
  LayoutLink,
  LayoutNode,
  LayoutResult,
  MeasuredNode,
  Point,
  Problem,
  Slot,
  ViewState,
} from './types.js';

export const DEFAULT_CORE_THEME: CoreTheme = {
  fontFamily: 'Montserrat, verdana, arial, sans-serif',
  siblingSpacing: 15,
  generationSpacing: 34,
  margin: 15,
  linkColor: '#000000',
  linkStrokeWidth: 1,
  additionalMarriageDash: '2',
};

/**
 * Copies the properties of `source` that are not `undefined`, so that an
 * optional field passed as `undefined` (where `exactOptionalPropertyTypes` is
 * off) leaves the default in place instead of wiping it out.
 */
function assignDefined<T extends object>(
  target: T,
  source: Partial<T> | undefined,
): T {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return target;
  }
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && key !== '__proto__') {
      (target as Record<string, unknown>)[key] = value;
    }
  }
  return target;
}

function sanitizeMargin(
  margin: unknown,
  fallback: CoreTheme['margin'],
): CoreTheme['margin'] {
  const cloneFallback = (): CoreTheme['margin'] =>
    typeof fallback === 'object' && fallback !== null
      ? { ...fallback }
      : fallback;
  if (typeof margin === 'number') {
    return Number.isFinite(margin) ? margin : cloneFallback();
  }
  if (!margin || typeof margin !== 'object' || Array.isArray(margin)) {
    return cloneFallback();
  }
  const fb = normalizeMargin(fallback);
  const raw = margin as Record<string, unknown>;
  const side = (v: unknown, f: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : f;
  return {
    top: side(raw.top, fb.top),
    right: side(raw.right, fb.right),
    bottom: side(raw.bottom, fb.bottom),
    left: side(raw.left, fb.left),
  };
}

function sanitizeCoreSpacing(theme: CoreTheme, fallback: CoreTheme): void {
  if (!Number.isFinite(theme.siblingSpacing)) {
    theme.siblingSpacing = fallback.siblingSpacing;
  }
  if (!Number.isFinite(theme.generationSpacing)) {
    theme.generationSpacing = fallback.generationSpacing;
  }
  if (!Number.isFinite(theme.linkStrokeWidth) || theme.linkStrokeWidth < 0) {
    theme.linkStrokeWidth = fallback.linkStrokeWidth;
  }
  theme.margin = sanitizeMargin(theme.margin, fallback.margin);
}

/**
 * Returns the margin of every side, also when the theme has one number for all
 * of them.
 */
export function normalizeMargin(margin: CoreTheme['margin']): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const fallback = DEFAULT_CORE_THEME.margin as number;
  if (typeof margin === 'number') {
    const m = Number.isFinite(margin) ? margin : fallback;
    return { top: m, right: m, bottom: m, left: m };
  }
  if (!margin || typeof margin !== 'object') {
    return {
      top: fallback,
      right: fallback,
      bottom: fallback,
      left: fallback,
    };
  }
  const side = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return {
    top: side(margin.top),
    right: side(margin.right),
    bottom: side(margin.bottom),
    left: side(margin.left),
  };
}

/**
 * Returns the core defaults with the given overrides. For the theme of a chart,
 * which has the defaults of its plug-in and layers too, use
 * `resolveChartTheme`.
 */
export function resolveCoreTheme<TTheme extends CoreTheme>(
  themeOverrides?: Partial<TTheme>,
): TTheme {
  const theme = assignDefined(
    { ...DEFAULT_CORE_THEME } as TTheme,
    themeOverrides,
  );
  sanitizeCoreSpacing(theme, DEFAULT_CORE_THEME);
  return theme;
}

/**
 * Returns the theme of a chart: the core defaults, then the defaults of the
 * node plug-in and of the layers, then the theme of the config.
 */
export function resolveChartTheme<TTheme extends CoreTheme>(
  config: Pick<ChartConfig<TTheme>, 'theme' | 'nodePlugin' | 'layers'>,
): TTheme {
  const theme = { ...DEFAULT_CORE_THEME } as TTheme;
  assignDefined(theme, config.nodePlugin.defaultTheme);
  for (const layer of config.layers ?? []) {
    assignDefined(theme, layer.defaultTheme);
  }
  sanitizeCoreSpacing(theme, DEFAULT_CORE_THEME);
  const defaults = { ...theme };
  assignDefined(theme, config.theme);
  sanitizeCoreSpacing(theme, defaults);
  return theme;
}

function cleanZero(n: number): number {
  return Object.is(n, -0) ? 0 : n;
}

export function buildLayoutNodes(
  builtNodes: readonly BuiltTreeNode[],
  measured: ReadonlyMap<string, MeasuredNode>,
  positions: ReadonlyMap<string, AbstractPoint>,
  direction: Direction,
): LayoutNode[] {
  return builtNodes.map((bNode) => {
    const m = sanitizeMeasuredNode(measured.get(bNode.id));
    const ext: BoxExtents = m.extents;
    const rawPos = positions.get(bNode.id);
    const pos =
      rawPos && Number.isFinite(rawPos.along) && Number.isFinite(rawPos.across)
        ? rawPos
        : { along: 0, across: 0 };
    const screenOrigin = projectPoint(pos, direction);
    const bounds = projectExtents(ext, direction);

    const anchors = {} as Record<Slot, Point>;
    const expanderAnchors = {} as Record<Slot, Point>;
    for (const slot of SLOTS) {
      const a = m.anchors[slot];
      anchors[slot] = projectPoint(a, direction);
      const expA = m.expanderAnchors?.[slot] ?? a;
      expanderAnchors[slot] = projectPoint(expA, direction);
    }

    const regions = m.regions.map((r) => projectRegion(r, direction));

    const layoutNode: LayoutNode = {
      id: bNode.id,
      generation: bNode.generation,
      isRoot: bNode.isRoot,
      ...(bNode.indiId !== undefined ? { indiId: bNode.indiId } : {}),
      ...(bNode.spouseId !== undefined ? { spouseId: bNode.spouseId } : {}),
      ...(bNode.familyId !== undefined ? { familyId: bNode.familyId } : {}),
      x: screenOrigin.x,
      y: screenOrigin.y,
      bounds,
      extents: { ...ext },
      anchors,
      expanderAnchors,
      expanders: { ...bNode.expanders },
      regions,
    };
    return layoutNode;
  });
}

/**
 * Returns the problems without repetitions. The stages of a layout visit
 * the same person or family more than once and report it every time.
 */
function uniqueProblems(problems: readonly Problem[]): Problem[] {
  const seen = new Set<string>();
  return problems.filter((problem) => {
    const key = JSON.stringify([
      problem.code,
      problem.entityId ?? null,
      problem.message,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Throws an error that says what to do for the mistakes that are easy to
 * make where nothing checks the types (a page script), and that would
 * otherwise fail somewhere inside the library.
 */
export function checkConfig(config: unknown): void {
  if (!config || typeof config !== 'object') {
    throw new Error(
      'A chart needs a config: { graph, chart, nodePlugin, ... }.',
    );
  }
  const { graph, nodePlugin } = config as {
    graph?: { hasPerson?: unknown } | null;
    nodePlugin?: { sizeNodes?: unknown } | null;
  };
  if (!graph || typeof graph.hasPerson !== 'function') {
    throw new Error(
      'ChartConfig.graph has to implement FamilyGraph. Wrap plain { indis, fams } data with createModelGraph().',
    );
  }
  if (!nodePlugin || typeof nodePlugin.sizeNodes !== 'function') {
    throw new Error(
      'ChartConfig.nodePlugin is missing. Pass a node plug-in, e.g. createSimpleNodePlugin({ model }).',
    );
  }
}

export function checkViewState(viewState: unknown): void {
  if (
    !viewState ||
    typeof viewState !== 'object' ||
    typeof (viewState as { startIndi?: unknown }).startIndi !== 'string'
  ) {
    throw new Error(
      'A layout needs a viewState with a start person id: { startIndi }.',
    );
  }
  const { collapsed } = viewState as { collapsed?: unknown };
  if (
    collapsed !== undefined &&
    (!collapsed || typeof (collapsed as { has?: unknown }).has !== 'function')
  ) {
    throw new Error(
      'ViewState.collapsed has to be a Set of expander keys (see expanderKey()).',
    );
  }
}

/**
 * Pure browser-free layout computation (Stages 1, 2, and 3).
 *
 * What is wrong with the data is reported in `LayoutResult.problems`, not
 * thrown: a start person the graph does not have gives an empty layout. A
 * config without a graph or a node plug-in throws.
 *
 * Without `config.textMeasurer` every call creates a canvas measurer of its
 * own (a fixed-width one where there is no canvas) and measures every text
 * again. Pass one measurer to all calls to keep its widths.
 *
 * One limit comes from the tidy-tree library: a single tree of about two
 * thousand generations or more exceeds the call stack (`RangeError`).
 */
export function computeLayout<TTheme extends CoreTheme = CoreTheme>(
  viewState: ViewState,
  config: ChartConfig<TTheme>,
): LayoutResult {
  checkConfig(config);
  checkViewState(viewState);
  const direction: Direction = config.direction ?? 'down';
  const theme = resolveChartTheme<TTheme>(config);
  const measurer = config.textMeasurer ?? createCanvasTextMeasurer();
  // Collects the problems of all stages; the result has each of them once.
  const allProblems: Problem[] = [];

  let orderedNodes: BuiltTreeNode[] = [];
  let links: LayoutLink[] = [];
  let measured: ReadonlyMap<string, MeasuredNode> = new Map();
  let positions = new Map<string, AbstractPoint>();

  if (config.chart === 'hourglass') {
    const stage1 = buildHourglassStage1(viewState, {
      graph: config.graph,
      maxAncestorGenerations: config.maxAncestorGenerations,
      maxDescendantGenerations: config.maxDescendantGenerations,
      problems: allProblems,
    });
    orderedNodes = stage1.orderedNodes;
    links = stage1.links;

    if (stage1.sizeInputs.length > 0) {
      measured = sanitizeMeasuredNodes(
        config.nodePlugin.sizeNodes(stage1.sizeInputs, {
          direction,
          theme,
          measurer,
          problems: allProblems,
        }),
      );
      positions = positionHourglassStage3(stage1, measured, theme);
    }
  } else {
    const stage1 = buildRelativesStage1(viewState, {
      graph: config.graph,
      maxAncestorGenerations: config.maxAncestorGenerations,
      maxDescendantGenerations: config.maxDescendantGenerations,
      problems: allProblems,
    });
    orderedNodes = stage1.orderedNodes;
    links = stage1.links;

    if (stage1.sizeInputs.length > 0) {
      measured = sanitizeMeasuredNodes(
        config.nodePlugin.sizeNodes(stage1.sizeInputs, {
          direction,
          theme,
          measurer,
          problems: allProblems,
        }),
      );
      positions = positionRelativesStage3(stage1, measured, theme);
    }
  }

  const problems = uniqueProblems(allProblems);

  if (orderedNodes.length === 0) {
    return {
      direction,
      size: [0, 0],
      origin: [0, 0],
      nodes: [],
      links: [],
      problems,
    };
  }

  const nodes = buildLayoutNodes(orderedNodes, measured, positions, direction);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    const x0 = n.x + n.bounds.x;
    const y0 = n.y + n.bounds.y;
    const x1 = x0 + n.bounds.width;
    const y1 = y0 + n.bounds.height;
    if (x0 < minX) minX = x0;
    if (y0 < minY) minY = y0;
    if (x1 > maxX) maxX = x1;
    if (y1 > maxY) maxY = y1;
  }

  // Stepped additional-marriage links hop upstream of the node perimeter;
  // include their hop coordinates (and half of the stroke) so they are not
  // clipped outside the SVG.
  let nodeMap: Map<string, LayoutNode> | undefined;
  const horizontal = isHorizontalDirection(direction);
  const sign = getAlongSign(direction);
  const halfStroke = theme.linkStrokeWidth / 2;
  for (const link of links) {
    if (
      link.kind !== 'additionalMarriage' ||
      !link.hopOffset ||
      link.hopOffset <= 0 ||
      !Number.isFinite(link.hopOffset)
    ) {
      continue;
    }
    if (!nodeMap) {
      nodeMap = new Map(nodes.map((n) => [n.id, n]));
    }
    const fromNode = nodeMap.get(link.fromNodeId);
    const toNode = nodeMap.get(link.toNodeId);
    if (!fromNode || !toNode) continue;
    if (horizontal) {
      const hopX =
        fromNode.x + fromNode.anchors[link.fromSlot].x - sign * link.hopOffset;
      if (hopX - halfStroke < minX) minX = hopX - halfStroke;
      if (hopX + halfStroke > maxX) maxX = hopX + halfStroke;
    } else {
      const hopY =
        fromNode.y + fromNode.anchors[link.fromSlot].y - sign * link.hopOffset;
      if (hopY - halfStroke < minY) minY = hopY - halfStroke;
      if (hopY + halfStroke > maxY) maxY = hopY + halfStroke;
    }
  }

  if (config.layers) {
    const layerInput = { nodes, links, direction };
    for (const layer of config.layers) {
      const lb = layer.getBounds?.(layerInput, { theme, measurer });
      if (
        lb &&
        Number.isFinite(lb.x) &&
        Number.isFinite(lb.y) &&
        Number.isFinite(lb.width) &&
        Number.isFinite(lb.height)
      ) {
        const w = Math.max(0, lb.width);
        const h = Math.max(0, lb.height);
        if (lb.x < minX) minX = lb.x;
        if (lb.y < minY) minY = lb.y;
        if (lb.x + w > maxX) maxX = lb.x + w;
        if (lb.y + h > maxY) maxY = lb.y + h;
      }
    }
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return {
      direction,
      size: [0, 0],
      origin: [0, 0],
      nodes,
      links,
      problems,
    };
  }

  const margin = normalizeMargin(theme.margin);
  const finalMinX = minX - margin.left;
  const finalMinY = minY - margin.top;
  const finalMaxX = maxX + margin.right;
  const finalMaxY = maxY + margin.bottom;

  return {
    direction,
    size: [
      cleanZero(Math.max(0, finalMaxX - finalMinX)),
      cleanZero(Math.max(0, finalMaxY - finalMinY)),
    ],
    origin: [cleanZero(-finalMinX), cleanZero(-finalMinY)],
    nodes,
    links,
    problems,
  };
}
