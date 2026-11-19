import { select } from 'd3-selection';
import 'd3-transition';
import { getAlongSign, isHorizontalDirection } from './axes.js';
import { toClassToken } from './class-token.js';
import {
  ANIMATION_FADE_MS as HIDE_TIME_MS,
  ANIMATION_MOVE_MS as MOVE_TIME_MS,
} from './types.js';
import type {
  CoreTheme,
  Direction,
  Layer,
  LayerRenderContext,
  LayoutLink,
  LayoutNode,
  LayoutResult,
  Point,
} from './types.js';

/**
 * Computes the route of a parent-child or additional-marriage link as the
 * corner points of an orthogonal line, for all four growth directions
 * ('down', 'up', 'right', 'left'). Returns no points if a node is missing.
 */
export function computeLinkRoute(
  link: LayoutLink,
  nodeMap: ReadonlyMap<string, LayoutNode>,
  rowDownstreamEdge: ReadonlyMap<number, number>,
  direction: Direction,
  generationSpacing: number,
): Point[] {
  const fromNode = nodeMap.get(link.fromNodeId);
  const toNode = nodeMap.get(link.toNodeId);
  if (!fromNode || !toNode) return [];

  const horizontal = isHorizontalDirection(direction);
  const sign = getAlongSign(direction);

  const fromAnchor = fromNode.anchors[link.fromSlot];
  const toAnchor = toNode.anchors[link.toSlot];
  const sx = fromNode.x + fromAnchor.x;
  const sy = fromNode.y + fromAnchor.y;
  const dx = toNode.x + toAnchor.x;
  const dy = toNode.y + toAnchor.y;

  if (link.kind === 'additionalMarriage') {
    if (
      link.hopOffset &&
      link.hopOffset > 0 &&
      Number.isFinite(link.hopOffset)
    ) {
      // Stepped 6px orthogonal hop outside the upstream perimeter
      if (horizontal) {
        const hopX = sx - sign * link.hopOffset;
        return [
          { x: sx, y: sy },
          { x: hopX, y: sy },
          { x: hopX, y: dy },
          { x: dx, y: dy },
        ];
      }
      const hopY = sy - sign * link.hopOffset;
      return [
        { x: sx, y: sy },
        { x: sx, y: hopY },
        { x: dx, y: hopY },
        { x: dx, y: dy },
      ];
    }

    // Adjacent additional marriage: straight line across person-box midpoint
    if (horizontal) {
      const midX =
        fromNode.x +
        (sign === 1
          ? -fromNode.extents.alongBefore / 2
          : fromNode.extents.alongBefore / 2);
      return [
        { x: midX, y: sy },
        { x: midX, y: dy },
      ];
    }
    const midY =
      fromNode.y +
      (sign === 1
        ? -fromNode.extents.alongBefore / 2
        : fromNode.extents.alongBefore / 2);
    return [
      { x: sx, y: midY },
      { x: dx, y: midY },
    ];
  }

  // Parent-child orthogonal elbow
  if (horizontal) {
    const seamKey = Math.round(fromNode.x * 100);
    const edge =
      rowDownstreamEdge.get(seamKey) ??
      fromNode.x +
        (sign === 1
          ? fromNode.extents.alongAfter
          : -fromNode.extents.alongAfter);
    const midX = edge + sign * (generationSpacing / 2);
    return [
      { x: sx, y: sy },
      { x: midX, y: sy },
      { x: midX, y: dy },
      { x: dx, y: dy },
    ];
  }

  const seamKey = Math.round(fromNode.y * 100);
  const edge =
    rowDownstreamEdge.get(seamKey) ??
    fromNode.y +
      (sign === 1 ? fromNode.extents.alongAfter : -fromNode.extents.alongAfter);
  const midY = edge + sign * (generationSpacing / 2);
  return [
    { x: sx, y: sy },
    { x: sx, y: midY },
    { x: dx, y: midY },
    { x: dx, y: dy },
  ];
}

/**
 * Returns the SVG path `d` attribute of a route. Every path has four points,
 * so that it can morph when its link changes between a straight line and a
 * stepped one: a straight line has each of its ends twice.
 */
function routeToPath(route: readonly Point[]): string {
  const points =
    route.length === 2 ? [route[0]!, route[0]!, route[1]!, route[1]!] : route;
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Returns a function that gives the route of any link of a layout: the corner
 * points of the orthogonal line the default link layer draws, in the
 * coordinates of the nodes. A custom link layer can draw the same routes in
 * its own style.
 */
export function createLinkRouter(
  layout: Pick<LayoutResult, 'nodes' | 'direction'>,
  theme: Pick<CoreTheme, 'generationSpacing'>,
): (link: LayoutLink) => Point[] {
  const nodeMap = new Map<string, LayoutNode>();
  for (const n of layout.nodes) {
    nodeMap.set(n.id, n);
  }
  const rowEdges = buildRowDownstreamEdgeMap(layout.nodes, layout.direction);
  const generationSpacing = Number.isFinite(theme.generationSpacing)
    ? theme.generationSpacing
    : 0;
  return (link) =>
    computeLinkRoute(
      link,
      nodeMap,
      rowEdges,
      layout.direction,
      generationSpacing,
    );
}

export function buildRowDownstreamEdgeMap(
  nodes: readonly LayoutNode[],
  direction: Direction,
): Map<number, number> {
  const horizontal = isHorizontalDirection(direction);
  const sign = getAlongSign(direction);
  const map = new Map<number, number>();

  for (const n of nodes) {
    const seamAlongScreen = horizontal ? n.x : n.y;
    const downstreamEdge = seamAlongScreen + sign * n.extents.alongAfter;
    if (!Number.isFinite(seamAlongScreen) || !Number.isFinite(downstreamEdge)) {
      continue;
    }
    const key = Math.round(seamAlongScreen * 100);
    const prev = map.get(key);
    if (prev === undefined) {
      map.set(key, downstreamEdge);
    } else {
      map.set(
        key,
        sign === 1
          ? Math.max(prev, downstreamEdge)
          : Math.min(prev, downstreamEdge),
      );
    }
  }
  return map;
}

/**
 * Creates the layer that draws the links as lines with corners, with the
 * classes the style schemes give them. The chart uses it when no layer of the
 * config has the `links` slot; add it to `ChartConfig.layers` to keep it next
 * to a link layer of your own.
 */
export function createDefaultLinkLayer<
  TTheme extends CoreTheme = CoreTheme,
>(): Layer<TTheme> {
  return {
    id: 'default-links',
    slot: 'links',
    render(ctx: LayerRenderContext<TTheme>): Promise<void> | void {
      const { group, layout, animate, theme, schemes, viewState } = ctx;
      const route = createLinkRouter(layout, theme);

      const getLinkClass = (link: LayoutLink): string => {
        const classes = ['link'];
        if (link.kind === 'additionalMarriage') {
          classes.push('additional-marriage');
        }
        for (const scheme of schemes) {
          const token = scheme.classifyLink?.({ link, viewState });
          if (token) {
            const clean = toClassToken(token);
            if (clean) classes.push(clean);
          }
        }
        return classes.join(' ');
      };

      const getPathD = (link: LayoutLink): string => routeToPath(route(link));

      const container = select(group);
      // Only the paths of this layer, its direct children: the group may
      // hold the groups of other layers of the slot, with links of their own.
      const paths = container.selectChildren<SVGPathElement, LayoutLink>(
        'path.link',
      );
      // Interrupt any active transitions on existing paths so rapid updates glide cleanly
      paths.interrupt();

      const bound = paths.data(layout.links, (d) => d.id);

      const exitSel = bound.exit();
      const enterSel = bound
        .enter()
        .append('path')
        .attr('class', getLinkClass)
        .attr('d', getPathD);

      // Update classes on surviving links immediately
      bound.attr('class', getLinkClass);

      if (!animate || ctx.prevLayout === null) {
        exitSel.remove();
        bound.style('opacity', null).attr('d', getPathD);
        enterSel.style('opacity', null);
        return;
      }

      const promises: Promise<unknown>[] = [];

      if (!exitSel.empty()) {
        const exitT = exitSel
          .transition()
          .duration(HIDE_TIME_MS)
          .style('opacity', '0')
          .remove();
        promises.push(exitT.end());
      }

      if (!bound.empty()) {
        // A link whose fade was interrupted fades back in while it moves.
        const updateT = bound
          .transition()
          .delay(HIDE_TIME_MS)
          .duration(MOVE_TIME_MS)
          .attr('d', getPathD)
          .style('opacity', '1');
        promises.push(updateT.end());
      }

      if (!enterSel.empty()) {
        const enterT = enterSel
          .style('opacity', '0')
          .transition()
          .delay(HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(HIDE_TIME_MS)
          .style('opacity', '1');
        promises.push(enterT.end());
      }

      if (promises.length === 0) return;
      return Promise.allSettled(promises).then(() => undefined);
    },
  };
}
