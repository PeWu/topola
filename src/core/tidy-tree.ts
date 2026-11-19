/// <reference path="./d3-flextree.d.ts" />

import { flextree } from 'd3-flextree';
import { hierarchy } from 'd3-hierarchy';
import type { AbstractPoint } from './axes.js';
import {
  SLOTS,
  type BoxExtents,
  type MeasuredNode,
  type Region,
  type Slot,
} from './types.js';

export interface TidyTreeNode {
  id: string;
  extents: BoxExtents;
  children: TidyTreeNode[];
  isDummyRoot?: boolean | undefined;
}

export interface TidyTreeOptions {
  siblingSpacing: number;
  generationSpacing: number;
  flipAlong?: boolean | undefined;
  anchorNodeId?: string | undefined;
}

export const ZERO_EXTENTS: BoxExtents = Object.freeze({
  alongBefore: 0,
  alongAfter: 0,
  acrossBefore: 0,
  acrossAfter: 0,
});

export const EMPTY_MEASURED_NODE: MeasuredNode = Object.freeze({
  extents: ZERO_EXTENTS,
  anchors: Object.freeze({
    indiParents: Object.freeze({ along: 0, across: 0 }),
    spouseParents: Object.freeze({ along: 0, across: 0 }),
    children: Object.freeze({ along: 0, across: 0 }),
  }),
  regions: Object.freeze([]) as unknown as MeasuredNode['regions'],
});

function finiteOrZero(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function isFinitePoint(
  pt: { along?: unknown; across?: unknown } | undefined | null,
): boolean {
  return (
    pt != null &&
    typeof pt === 'object' &&
    typeof pt.along === 'number' &&
    Number.isFinite(pt.along) &&
    typeof pt.across === 'number' &&
    Number.isFinite(pt.across)
  );
}

export function sanitizeMeasuredNode(
  m: MeasuredNode | undefined,
): MeasuredNode {
  if (!m || typeof m !== 'object') return EMPTY_MEASURED_NODE;
  const rawExt = m.extents as Partial<BoxExtents> | undefined | null;
  const rawAnchors = m.anchors as
    | Partial<Record<Slot, { along: number; across: number }>>
    | undefined
    | null;
  const rawExp = m.expanderAnchors;
  const rawRegions = m.regions;

  const extClean =
    rawExt != null &&
    typeof rawExt === 'object' &&
    Number.isFinite(rawExt.alongBefore) &&
    Number.isFinite(rawExt.alongAfter) &&
    Number.isFinite(rawExt.acrossBefore) &&
    Number.isFinite(rawExt.acrossAfter);

  const anchorsClean =
    rawAnchors != null &&
    typeof rawAnchors === 'object' &&
    SLOTS.every((slot) => isFinitePoint(rawAnchors[slot]));

  const expClean =
    rawExp === undefined ||
    (rawExp != null &&
      typeof rawExp === 'object' &&
      SLOTS.every(
        (slot) => rawExp[slot] === undefined || isFinitePoint(rawExp[slot]),
      ));

  const regionsClean =
    Array.isArray(rawRegions) &&
    rawRegions.every(
      (r) =>
        r != null &&
        typeof r === 'object' &&
        Number.isFinite(r.x) &&
        Number.isFinite(r.y) &&
        Number.isFinite(r.width) &&
        r.width >= 0 &&
        Number.isFinite(r.height) &&
        r.height >= 0,
    );

  if (extClean && anchorsClean && expClean && regionsClean) {
    return m;
  }

  const extents: BoxExtents = extClean
    ? (rawExt as BoxExtents)
    : {
        alongBefore: finiteOrZero(rawExt?.alongBefore ?? 0),
        alongAfter: finiteOrZero(rawExt?.alongAfter ?? 0),
        acrossBefore: finiteOrZero(rawExt?.acrossBefore ?? 0),
        acrossAfter: finiteOrZero(rawExt?.acrossAfter ?? 0),
      };

  const anchors = {} as Record<Slot, { along: number; across: number }>;
  for (const slot of SLOTS) {
    const a = rawAnchors?.[slot];
    anchors[slot] =
      a != null && isFinitePoint(a)
        ? a
        : {
            along: finiteOrZero(a?.along ?? 0),
            across: finiteOrZero(a?.across ?? 0),
          };
  }

  let expanderAnchors:
    | Partial<Record<Slot, { along: number; across: number }>>
    | undefined;
  if (rawExp && typeof rawExp === 'object') {
    expanderAnchors = {};
    for (const slot of SLOTS) {
      const ea = rawExp[slot];
      if (ea !== undefined && ea !== null && typeof ea === 'object') {
        expanderAnchors[slot] = isFinitePoint(ea)
          ? ea
          : {
              along: finiteOrZero(ea.along),
              across: finiteOrZero(ea.across),
            };
      }
    }
  }

  const regions: Region[] = [];
  if (Array.isArray(rawRegions)) {
    for (const r of rawRegions) {
      if (!r || typeof r !== 'object') continue;
      regions.push({
        kind: r.kind,
        id: r.id,
        x: finiteOrZero(r.x),
        y: finiteOrZero(r.y),
        width: Math.max(0, finiteOrZero(r.width)),
        height: Math.max(0, finiteOrZero(r.height)),
      });
    }
  }

  return {
    extents,
    anchors,
    ...(expanderAnchors !== undefined ? { expanderAnchors } : {}),
    regions,
  };
}

export function sanitizeMeasuredNodes(
  measured: ReadonlyMap<string, MeasuredNode> | undefined,
): ReadonlyMap<string, MeasuredNode> {
  if (!measured || typeof measured.entries !== 'function') {
    return new Map();
  }
  let sanitized: Map<string, MeasuredNode> | null = null;
  for (const [id, m] of measured.entries()) {
    const clean = sanitizeMeasuredNode(m);
    if (clean !== m && !sanitized) {
      sanitized = new Map();
      for (const [prevId, prevM] of measured.entries()) {
        if (prevId === id) break;
        sanitized.set(prevId, prevM);
      }
    }
    if (sanitized) {
      sanitized.set(id, clean);
    }
  }
  return sanitized ?? measured;
}

function safeExtents(ext: BoxExtents): BoxExtents {
  if (
    Number.isFinite(ext.alongBefore) &&
    Number.isFinite(ext.alongAfter) &&
    Number.isFinite(ext.acrossBefore) &&
    Number.isFinite(ext.acrossAfter)
  ) {
    return ext;
  }
  return {
    alongBefore: finiteOrZero(ext.alongBefore),
    alongAfter: finiteOrZero(ext.alongAfter),
    acrossBefore: finiteOrZero(ext.acrossBefore),
    acrossAfter: finiteOrZero(ext.acrossAfter),
  };
}

/** What `toTidyNode` reads of a built tree node. */
interface TidySource {
  id: string;
  children: readonly TidySource[];
  isDummyRoot?: boolean | undefined;
}

/** Converts a built tree to the input of `layoutTidyTree`. */
export function toTidyNode(
  root: TidySource,
  measured: ReadonlyMap<string, { extents: BoxExtents }>,
): TidyTreeNode {
  const convert = (node: TidySource): TidyTreeNode => ({
    id: node.id,
    extents: measured.get(node.id)?.extents ?? ZERO_EXTENTS,
    children: [],
    isDummyRoot: node.isDummyRoot,
  });
  const result = convert(root);
  // With a list instead of recursion: a tree can be thousands of
  // generations deep.
  const todo: Array<[TidySource, TidyTreeNode]> = [[root, result]];
  while (todo.length > 0) {
    const [source, target] = todo.pop()!;
    for (const child of source.children) {
      const converted = convert(child);
      target.children.push(converted);
      todo.push([child, converted]);
    }
  }
  return result;
}

/**
 * Positions a tree in abstract (along, across) seam space using d3-hierarchy
 * and d3-flextree without mutating Stage 2 BoxExtents.
 */
export function layoutTidyTree(
  root: TidyTreeNode,
  options: TidyTreeOptions,
): Map<string, AbstractPoint> {
  const {
    siblingSpacing,
    generationSpacing,
    flipAlong = false,
    anchorNodeId,
  } = options;
  const safeSiblingSpacing = finiteOrZero(siblingSpacing);
  const safeGenerationSpacing = finiteOrZero(generationSpacing);

  if (root.children.length === 0 && !root.isDummyRoot) {
    // One node, as many ancestor blocks of a `relatives` chart are. The
    // general way below puts the middle of its box at (0, 0), and the node
    // at (0, 0) if it is the anchor; it costs far more than a node takes,
    // because the tidy-tree library sets itself up anew for every tree.
    const ext = safeExtents(root.extents);
    const along =
      (Math.max(0, ext.alongBefore) - Math.max(0, ext.alongAfter)) / 2;
    const across = (ext.acrossBefore - ext.acrossAfter) / 2;
    return new Map([
      [
        root.id,
        anchorNodeId === root.id
          ? { along: along - along, across: across - across }
          : { along, across },
      ],
    ]);
  }

  const hRoot = hierarchy<TidyTreeNode>(root, (d) => d.children);

  const maxAlongBefore = new Map<number, number>();
  const maxAlongAfter = new Map<number, number>();
  const rowAlongSize = new Map<number, number>();

  hRoot.each((n) => {
    const ext = n.data.isDummyRoot ? ZERO_EXTENTS : safeExtents(n.data.extents);
    const prevBefore = maxAlongBefore.get(n.depth) ?? 0;
    const prevAfter = maxAlongAfter.get(n.depth) ?? 0;
    if (ext.alongBefore > prevBefore || !maxAlongBefore.has(n.depth)) {
      maxAlongBefore.set(n.depth, Math.max(prevBefore, ext.alongBefore));
    }
    if (ext.alongAfter > prevAfter || !maxAlongAfter.has(n.depth)) {
      maxAlongAfter.set(n.depth, Math.max(prevAfter, ext.alongAfter));
    }
  });

  for (const [depth, before] of maxAlongBefore.entries()) {
    rowAlongSize.set(depth, before + (maxAlongAfter.get(depth) ?? 0));
  }

  const layout = flextree<TidyTreeNode>()
    .nodeSize((n) => {
      const ext = n.data.isDummyRoot
        ? ZERO_EXTENTS
        : safeExtents(n.data.extents);
      const acrossSize = Math.max(0, ext.acrossBefore + ext.acrossAfter);
      const thisAlong = rowAlongSize.get(n.depth) ?? 0;
      const childAlong =
        n.children && n.children.length > 0
          ? (rowAlongSize.get(n.depth + 1) ?? 0)
          : 0;
      // d3-flextree hangs on NaN and dereferences null when the step is
      // negative (a child's bottom would lie above its parent's).
      const alongStep = Math.max(
        0,
        (thisAlong + childAlong) / 2 + safeGenerationSpacing,
      );
      return [acrossSize, alongStep];
    })
    .spacing(() => safeSiblingSpacing);

  const laidOut = layout(hRoot).descendants();
  const rawPositions = new Map<string, AbstractPoint>();

  for (const n of laidOut) {
    if (n.data.isDummyRoot) continue;
    const ext = safeExtents(n.data.extents);
    const bboxAcross = n.x;
    const bboxAlong = flipAlong ? -n.y : n.y;
    const seamAcross = bboxAcross + (ext.acrossBefore - ext.acrossAfter) / 2;
    const seamAlong =
      bboxAlong +
      ((maxAlongBefore.get(n.depth) ?? 0) - (maxAlongAfter.get(n.depth) ?? 0)) /
        2;
    rawPositions.set(n.data.id, { along: seamAlong, across: seamAcross });
  }

  if (anchorNodeId !== undefined) {
    const anchor = rawPositions.get(anchorNodeId);
    if (anchor) {
      const dAlong = -anchor.along;
      const dAcross = -anchor.across;
      for (const [id, pt] of rawPositions.entries()) {
        rawPositions.set(id, {
          along: pt.along + dAlong,
          across: pt.across + dAcross,
        });
      }
    }
  }

  return rawPositions;
}
