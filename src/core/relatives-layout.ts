import type { AbstractPoint } from './axes.js';
import { IdGenerator } from './id-generator.js';
import {
  ZERO_EXTENTS,
  layoutTidyTree,
  sanitizeMeasuredNodes,
  toTidyNode,
} from './tidy-tree.js';
import {
  additionalMarriageLinkId,
  buildAncestorTree,
  buildDescendantTree,
  collectBfsNodes,
  getSpouseOfPerson,
  getValidSpouseFamilies,
  normalizeBaseGeneration,
  normalizeMaxGenerations,
  parentChildLinkId,
  toSizeInput,
  type AncestorMarriageSeed,
  type BuiltTreeNode,
} from './tree-builder.js';
import type {
  BoxExtents,
  CoreTheme,
  FamilyGraph,
  LayoutLink,
  MeasuredNode,
  Problem,
  SizeNodeInput,
  Slot,
  ViewState,
} from './types.js';

function createFilteredChildGraph(
  base: FamilyGraph,
  hiddenChildId: string,
): FamilyGraph {
  return {
    hasPerson: (id) => base.hasPerson(id),
    hasFamily: (id) => base.hasFamily(id),
    getPersonParentFamily: (pid) => base.getPersonParentFamily(pid),
    getPersonSpouseFamilies: (pid) => base.getPersonSpouseFamilies(pid),
    getFamilyPartners: (fid) => base.getFamilyPartners(fid),
    getFamilyChildren: (fid) =>
      base.getFamilyChildren(fid).filter((cid) => cid !== hiddenChildId),
  };
}

/**
 * The block of an ancestor couple: the couple (the primary root), its other
 * marriages and all descendants except the line to the start person. The
 * "skeleton" is the bare tree of the ancestor couples; since the couples
 * take their node ids from it, the skeleton id of a block is the id of its
 * primary root node.
 */
interface SkeletonBlockDescriptor {
  skeletonId: string;
  parentSkeletonId: string | null;
  parentSlot: 'indiParents' | 'spouseParents';
  depth: number;
  left: boolean;
  middle: boolean;
  hierarchyRoot: BuiltTreeNode;
  primaryRootNode: BuiltTreeNode;
  bfsNodes: BuiltTreeNode[];
  extraRootsOuterLeft: BuiltTreeNode[];
  extraRootsOuterRight: BuiltTreeNode[];
  indiParentSkeletonId?: string | undefined;
  spouseParentSkeletonId?: string | undefined;
}

export interface RelativesStage1Result {
  focusHierarchyRoot: BuiltTreeNode | null;
  focusPrimaryRoot: BuiltTreeNode | null;
  focusIndiParentSkeletonId?: string | undefined;
  focusSpouseParentSkeletonId?: string | undefined;
  postOrderBlocks: SkeletonBlockDescriptor[];
  blocksBySkeletonId: Map<string, SkeletonBlockDescriptor>;
  orderedNodes: BuiltTreeNode[];
  sizeInputs: SizeNodeInput[];
  links: LayoutLink[];
}

function buildAncestorBlockSeeds(
  graph: FamilyGraph,
  primaryNodeId: string,
  primaryFamId: string,
  husbId: string | undefined,
  wifeId: string | undefined,
  outerIsLeft: boolean,
  problems: Problem[],
): {
  seeds: AncestorMarriageSeed[];
  owners: Array<{ ownerId: string; ownerSide: 'indi' | 'spouse' } | null>;
} {
  const seenFamIds = new Set<string>([primaryFamId]);

  const husbExtras: Array<{
    seed: AncestorMarriageSeed;
    ownerId: string;
    ownerSide: 'indi' | 'spouse';
  }> = [];
  const wifeExtras: Array<{
    seed: AncestorMarriageSeed;
    ownerId: string;
    ownerSide: 'indi' | 'spouse';
  }> = [];

  if (husbId && graph.hasPerson(husbId)) {
    for (const fid of getValidSpouseFamilies(graph, husbId, problems)) {
      if (seenFamIds.has(fid)) continue;
      seenFamIds.add(fid);
      const other = getSpouseOfPerson(graph, husbId, fid, problems);
      if (outerIsLeft && other !== undefined) {
        // Place other partner on outer left and husbId on inner right facing [H | W]!
        husbExtras.push({
          seed: { familyId: fid, indiId: other, spouseId: husbId },
          ownerId: husbId,
          ownerSide: 'spouse',
        });
      } else {
        husbExtras.push({
          seed: { familyId: fid, indiId: husbId, spouseId: other },
          ownerId: husbId,
          ownerSide: 'indi',
        });
      }
    }
  }

  if (wifeId && graph.hasPerson(wifeId)) {
    for (const fid of getValidSpouseFamilies(graph, wifeId, problems)) {
      if (seenFamIds.has(fid)) continue;
      seenFamIds.add(fid);
      const other = getSpouseOfPerson(graph, wifeId, fid, problems);
      if (!outerIsLeft && other !== undefined) {
        // Place wifeId on inner left facing [H | W] and other partner on outer right!
        wifeExtras.push({
          seed: { familyId: fid, indiId: wifeId, spouseId: other },
          ownerId: wifeId,
          ownerSide: 'indi',
        });
      } else if (other !== undefined) {
        wifeExtras.push({
          seed: { familyId: fid, indiId: other, spouseId: wifeId },
          ownerId: wifeId,
          ownerSide: 'spouse',
        });
      } else {
        wifeExtras.push({
          seed: { familyId: fid, indiId: wifeId },
          ownerId: wifeId,
          ownerSide: 'indi',
        });
      }
    }
  }

  const primarySeed: AncestorMarriageSeed = {
    familyId: primaryFamId,
    indiId: husbId,
    spouseId: wifeId,
    isPrimary: true,
    nodeId: primaryNodeId,
  };

  if (husbExtras.length === 0 && wifeExtras.length === 0) {
    return { seeds: [primarySeed], owners: [null] };
  }

  if (outerIsLeft) {
    // Extra marriages on LEFT, [H | W] rightmost (innermost):
    // [...wifeExtras, ...husbExtras.reverse(), primarySeed] puts husbExtras immediately left of H!
    const orderedExtras = [...wifeExtras, ...husbExtras.reverse()];
    return {
      seeds: [...orderedExtras.map((e) => e.seed), primarySeed],
      owners: [
        ...orderedExtras.map((e) => ({
          ownerId: e.ownerId,
          ownerSide: e.ownerSide,
        })),
        null,
      ],
    };
  }

  // Extra marriages on RIGHT, [H | W] leftmost (innermost):
  // [primarySeed, ...wifeExtras, ...husbExtras] puts wifeExtras immediately right of W!
  const orderedExtras = [...wifeExtras, ...husbExtras];
  return {
    seeds: [primarySeed, ...orderedExtras.map((e) => e.seed)],
    owners: [
      null,
      ...orderedExtras.map((e) => ({
        ownerId: e.ownerId,
        ownerSide: e.ownerSide,
      })),
    ],
  };
}

/**
 * Stage 1 for `All Relatives` (`chart: 'relatives'`), including the Issue #30
 * fix for remarried direct ancestors and parentless sibling retention.
 */
export function buildRelativesStage1(
  viewState: ViewState,
  options: {
    graph: FamilyGraph;
    maxAncestorGenerations?: number | undefined;
    maxDescendantGenerations?: number | undefined;
    problems: Problem[];
  },
): RelativesStage1Result {
  const { graph, problems } = options;
  const maxAncestorGenerations = normalizeMaxGenerations(
    options.maxAncestorGenerations,
  );
  const maxDescendantGenerations = normalizeMaxGenerations(
    options.maxDescendantGenerations,
  );
  const { startIndi, collapsed } = viewState;
  const baseGeneration = normalizeBaseGeneration(viewState.baseGeneration);

  if (!graph.hasPerson(startIndi)) {
    problems.push({
      code: 'MISSING_START_PERSON',
      message: `Start person "${startIndi}" was not found in graph.`,
      entityId: startIndi,
    });
    return {
      focusHierarchyRoot: null,
      focusPrimaryRoot: null,
      postOrderBlocks: [],
      blocksBySkeletonId: new Map(),
      orderedNodes: [],
      sizeInputs: [],
      links: [],
    };
  }

  const chartIdGen = new IdGenerator();

  // 1. Focus person's own descendant block
  const focusDesc = buildDescendantTree({
    graph,
    rootSpec: { kind: 'person', personId: startIndi },
    baseGeneration,
    maxGenerations: maxDescendantGenerations,
    collapsed,
    idGenerator: chartIdGen,
    rowPrefix: 'rel:focus',
    markIsRoot: true,
    problems,
  });

  const focusNodes = collectBfsNodes(focusDesc.hierarchyRoot);
  const allLinks: LayoutLink[] = [...focusDesc.links];

  if (maxAncestorGenerations === 0 || !focusDesc.primaryRootNode) {
    return {
      focusHierarchyRoot: focusDesc.hierarchyRoot,
      focusPrimaryRoot: focusDesc.primaryRootNode,
      postOrderBlocks: [],
      blocksBySkeletonId: new Map(),
      orderedNodes: focusNodes,
      sizeInputs: focusNodes.map(toSizeInput),
      links: allLinks,
    };
  }

  // 2. Build un-rendered ancestor skeleton with retainParentlessFamilies: true.
  // Its nodes are the primary couples of the ancestor blocks. They take their
  // ids here, before the blocks are filled, so that every couple is drawn
  // with the id its expanders were looked up with (ViewState.collapsed).
  const validSpouseFamilies = getValidSpouseFamilies(graph, startIndi, []);
  const firstFamId = validSpouseFamilies[0];
  const [firstPartner, secondPartner] =
    firstFamId !== undefined
      ? graph.getFamilyPartners(firstFamId)
      : [null, null];

  const ancSkeleton = buildAncestorTree({
    graph,
    rootSpec:
      firstFamId !== undefined
        ? {
            kind: 'family',
            familyId: firstFamId,
            swapPartners:
              firstPartner !== startIndi && secondPartner === startIndi,
            omitSpouseAncestors: validSpouseFamilies.length > 1,
          }
        : { kind: 'person', personId: startIndi },
    baseGeneration,
    maxGenerations: maxAncestorGenerations,
    collapsed,
    retainParentlessFamilies: true,
    idGenerator: chartIdGen,
    rootNodeId: focusDesc.primaryRootNode.id,
    rowPrefix: 'rel:skel',
    problems,
  });

  if (!ancSkeleton.root) {
    return {
      focusHierarchyRoot: focusDesc.hierarchyRoot,
      focusPrimaryRoot: focusDesc.primaryRootNode,
      postOrderBlocks: [],
      blocksBySkeletonId: new Map(),
      orderedNodes: focusNodes,
      sizeInputs: focusNodes.map(toSizeInput),
      links: allLinks,
    };
  }

  // Copy ancestor expanders onto focusPrimaryRoot
  if (ancSkeleton.root.expanders.indiParents !== undefined) {
    focusDesc.primaryRootNode.expanders.indiParents =
      ancSkeleton.root.expanders.indiParents;
  }
  if (ancSkeleton.root.expanders.spouseParents !== undefined) {
    focusDesc.primaryRootNode.expanders.spouseParents =
      ancSkeleton.root.expanders.spouseParents;
  }

  // Map skeleton parent->child slot ('indiParents' vs 'spouseParents') from ancSkeleton.links
  const slotBySkeletonEdge = new Map<string, 'indiParents' | 'spouseParents'>();
  const indiChildBySkeletonId = new Map<string, string>();
  const spouseChildBySkeletonId = new Map<string, string>();
  for (const l of ancSkeleton.links) {
    if (
      l.kind === 'parentChild' &&
      (l.toSlot === 'indiParents' || l.toSlot === 'spouseParents')
    ) {
      slotBySkeletonEdge.set(`${l.toNodeId}->${l.fromNodeId}`, l.toSlot);
      if (l.toSlot === 'indiParents') {
        indiChildBySkeletonId.set(l.toNodeId, l.fromNodeId);
      } else {
        spouseChildBySkeletonId.set(l.toNodeId, l.fromNodeId);
      }
    }
  }

  // Compute depth, parent, left, and middle flags top-down on the skeleton
  interface SkeletonMeta {
    node: BuiltTreeNode;
    parent: BuiltTreeNode | null;
    parentSlot: 'indiParents' | 'spouseParents';
    depth: number;
    left: boolean;
    middle: boolean;
  }
  const metaMap = new Map<string, SkeletonMeta>();
  // The walks over the skeleton keep a list of what is to do instead of
  // calling themselves: a line of ancestors can be thousands of generations
  // long, more than the call stack holds.
  const topDownTodo: Array<{
    sNode: BuiltTreeNode;
    parent: BuiltTreeNode | null;
    depth: number;
  }> = [{ sNode: ancSkeleton.root, parent: null, depth: 0 }];
  while (topDownTodo.length > 0) {
    const { sNode, parent, depth } = topDownTodo.pop()!;
    if (parent) {
      const slot =
        slotBySkeletonEdge.get(`${parent.id}->${sNode.id}`) ?? 'indiParents';
      const parentMeta = metaMap.get(parent.id);
      const left =
        parentMeta && !parentMeta.middle
          ? parentMeta.left
          : slot === 'indiParents';
      const middle =
        (!parentMeta || parentMeta.middle) && parent.children.length === 1;
      metaMap.set(sNode.id, {
        node: sNode,
        parent,
        parentSlot: slot,
        depth,
        left,
        middle,
      });
    }
    // Last child first on the list: the first one is taken off next.
    for (let i = sNode.children.length - 1; i >= 0; i--) {
      topDownTodo.push({
        sNode: sNode.children[i]!,
        parent: sNode,
        depth: depth + 1,
      });
    }
  }

  // Post-order (eachAfter) walk over skeleton nodes (depth >= 1) to build descendant blocks
  const postOrderBlocks: SkeletonBlockDescriptor[] = [];
  const blocksBySkeletonId = new Map<string, SkeletonBlockDescriptor>();
  let blockCounter = 0;

  /** Builds the block of a skeleton node, after those of its children. */
  const buildBlock = (sNode: BuiltTreeNode): void => {
    const meta = metaMap.get(sNode.id);
    if (!meta || !meta.parent || !sNode.familyId) return;

    const directChildId =
      meta.parentSlot === 'spouseParents'
        ? meta.parent.spouseId!
        : meta.parent.indiId!;
    const filteredGraph = createFilteredChildGraph(graph, directChildId);

    const outerIsLeft = meta.left;
    const { seeds, owners } = buildAncestorBlockSeeds(
      graph,
      sNode.id,
      sNode.familyId,
      sNode.indiId,
      sNode.spouseId,
      outerIsLeft,
      problems,
    );

    const blockGen = baseGeneration - meta.depth;
    const blockPrefix = `rel:b${blockCounter++}`;
    const descBlock = buildDescendantTree({
      graph: filteredGraph,
      rootSpec: { kind: 'customRoots', roots: seeds },
      baseGeneration: blockGen,
      // This subtree starts meta.depth generations above the selected root.
      maxGenerations:
        maxDescendantGenerations !== undefined
          ? maxDescendantGenerations + meta.depth
          : undefined,
      collapsed,
      idGenerator: chartIdGen,
      rowPrefix: blockPrefix,
      markIsRoot: false,
      problems,
    });

    if (!descBlock.hierarchyRoot || !descBlock.primaryRootNode) return;

    // Copy ancestor expanders from skeleton node onto the block's primary couple node
    if (sNode.expanders.indiParents !== undefined) {
      descBlock.primaryRootNode.expanders.indiParents =
        sNode.expanders.indiParents;
    }
    if (sNode.expanders.spouseParents !== undefined) {
      descBlock.primaryRootNode.expanders.spouseParents =
        sNode.expanders.spouseParents;
    }

    // Build root-level marriageLinks for any Issue #30 extra marriages
    const rootRowNodes = descBlock.hierarchyRoot.isDummyRoot
      ? descBlock.hierarchyRoot.children
      : [descBlock.hierarchyRoot];
    const primaryIdx = rootRowNodes.indexOf(descBlock.primaryRootNode);

    const extraRootsOuterLeft =
      primaryIdx > 0 ? rootRowNodes.slice(0, primaryIdx) : [];
    const extraRootsOuterRight =
      primaryIdx >= 0 && primaryIdx < rootRowNodes.length - 1
        ? rootRowNodes.slice(primaryIdx + 1)
        : [];

    if (rootRowNodes.length > 1 && primaryIdx !== -1) {
      // Group indices per remarried ancestor owner (husbId vs wifeId)
      const indicesByOwner = new Map<
        string,
        Array<{ idx: number; slot: Slot }>
      >();

      for (let idx = 0; idx < rootRowNodes.length; idx++) {
        const info = owners[idx];
        if (!info) continue;
        const list = indicesByOwner.get(info.ownerId) ?? [];
        const slot: Slot =
          info.ownerSide === 'spouse' ? 'spouseParents' : 'indiParents';
        list.push({ idx, slot });
        indicesByOwner.set(info.ownerId, list);
      }

      // Include primary couple node's slot for each owner
      for (const [ownerId, list] of indicesByOwner.entries()) {
        const primarySlot: Slot =
          ownerId === sNode.spouseId ? 'spouseParents' : 'indiParents';
        list.push({ idx: primaryIdx, slot: primarySlot });
        list.sort((a, b) => a.idx - b.idx);
      }

      let hopRank = 1;
      for (const [, chain] of indicesByOwner.entries()) {
        for (let k = 1; k < chain.length; k++) {
          const leftItem = chain[k - 1]!;
          const rightItem = chain[k]!;
          const leftNode = rootRowNodes[leftItem.idx]!;
          const rightNode = rootRowNodes[rightItem.idx]!;
          const adjacent = rightItem.idx === leftItem.idx + 1;
          const leftFacingPartner = leftNode.spouseId ?? leftNode.indiId;
          const rightFacingPartner = rightNode.indiId ?? rightNode.spouseId;
          const directlyFacing =
            adjacent &&
            leftFacingPartner !== undefined &&
            leftFacingPartner === rightFacingPartner;

          const needsHop = !directlyFacing;
          const hopOffset = needsHop ? 6 * hopRank++ : undefined;

          allLinks.push({
            id: additionalMarriageLinkId(rightNode.id, leftNode.id),
            kind: 'additionalMarriage',
            fromNodeId: rightNode.id,
            fromSlot: rightItem.slot,
            toNodeId: leftNode.id,
            toSlot: leftItem.slot,
            ...(hopOffset !== undefined ? { hopOffset } : {}),
          });
        }
      }
    }

    for (const link of descBlock.links) {
      allLinks.push(link);
    }

    const bfsNodes = collectBfsNodes(descBlock.hierarchyRoot);
    const descriptor: SkeletonBlockDescriptor = {
      skeletonId: sNode.id,
      parentSkeletonId:
        meta.parent.id === ancSkeleton.root!.id ? null : meta.parent.id,
      parentSlot: meta.parentSlot,
      depth: meta.depth,
      left: meta.left,
      middle: meta.middle,
      hierarchyRoot: descBlock.hierarchyRoot,
      primaryRootNode: descBlock.primaryRootNode,
      bfsNodes,
      extraRootsOuterLeft,
      extraRootsOuterRight,
      indiParentSkeletonId: indiChildBySkeletonId.get(sNode.id),
      spouseParentSkeletonId: spouseChildBySkeletonId.get(sNode.id),
    };
    postOrderBlocks.push(descriptor);
    blocksBySkeletonId.set(sNode.id, descriptor);
  };

  // Post-order: `next` is the child of the node that is walked next.
  const postOrderTodo: Array<{ sNode: BuiltTreeNode; next: number }> = [
    { sNode: ancSkeleton.root, next: 0 },
  ];
  while (postOrderTodo.length > 0) {
    const top = postOrderTodo[postOrderTodo.length - 1]!;
    if (top.next < top.sNode.children.length) {
      postOrderTodo.push({ sNode: top.sNode.children[top.next++]!, next: 0 });
    } else {
      postOrderTodo.pop();
      buildBlock(top.sNode);
    }
  }

  // Connect parentChild links along the ancestor spine (between block primaryRootNodes & focusPrimaryRoot)
  for (const blk of postOrderBlocks) {
    const childTargetNode =
      blk.parentSkeletonId === null
        ? focusDesc.primaryRootNode
        : blocksBySkeletonId.get(blk.parentSkeletonId)?.primaryRootNode;
    if (!childTargetNode) continue;

    const childPersonId =
      blk.parentSlot === 'spouseParents'
        ? childTargetNode.spouseId
        : childTargetNode.indiId;

    allLinks.push({
      id: parentChildLinkId(blk.primaryRootNode.id, childTargetNode.id),
      kind: 'parentChild',
      fromNodeId: blk.primaryRootNode.id,
      fromSlot: 'children',
      toNodeId: childTargetNode.id,
      toSlot: blk.parentSlot,
      ...(childPersonId !== undefined ? { childIndiId: childPersonId } : {}),
    });
  }

  const orderedNodes: BuiltTreeNode[] = [...focusNodes];
  for (const blk of postOrderBlocks) {
    for (const node of blk.bfsNodes) {
      orderedNodes.push(node);
    }
  }

  return {
    focusHierarchyRoot: focusDesc.hierarchyRoot,
    focusPrimaryRoot: focusDesc.primaryRootNode,
    focusIndiParentSkeletonId: indiChildBySkeletonId.get(ancSkeleton.root.id),
    focusSpouseParentSkeletonId: spouseChildBySkeletonId.get(
      ancSkeleton.root.id,
    ),
    postOrderBlocks,
    blocksBySkeletonId,
    orderedNodes,
    sizeInputs: orderedNodes.map(toSizeInput),
    links: allLinks,
  };
}

interface PackedBlockMetrics {
  positions: Map<string, AbstractPoint>;
  width: number; // across span
  totalAlongHeight: number; // along span including ancestor blocks above
  anchorAcrossInBox: number; // distance from block minAcross to primaryRoot seam (0)
  anchorAlongInBox: number; // distance from block minAlong (including ancestors) to primaryRoot seam (0)
}

function computeSubtreeBounds(
  nodes: readonly BuiltTreeNode[],
  positions: ReadonlyMap<string, AbstractPoint>,
  measured: ReadonlyMap<string, MeasuredNode>,
): {
  width: number;
  height: number;
  originAcross: number;
  originAlong: number;
} {
  let minAcross = Infinity;
  let maxAcross = -Infinity;
  let minAlong = Infinity;
  let maxAlong = -Infinity;

  for (const n of nodes) {
    const pos = positions.get(n.id) ?? { along: 0, across: 0 };
    const ext = measured.get(n.id)?.extents ?? ZERO_EXTENTS;
    if (pos.across - ext.acrossBefore < minAcross) {
      minAcross = pos.across - ext.acrossBefore;
    }
    if (pos.across + ext.acrossAfter > maxAcross) {
      maxAcross = pos.across + ext.acrossAfter;
    }
    if (pos.along - ext.alongBefore < minAlong) {
      minAlong = pos.along - ext.alongBefore;
    }
    if (pos.along + ext.alongAfter > maxAlong) {
      maxAlong = pos.along + ext.alongAfter;
    }
  }

  if (
    !Number.isFinite(minAcross) ||
    !Number.isFinite(maxAcross) ||
    !Number.isFinite(minAlong) ||
    !Number.isFinite(maxAlong)
  ) {
    return { width: 0, height: 0, originAcross: 0, originAlong: 0 };
  }
  return {
    width: maxAcross - minAcross,
    height: maxAlong - minAlong,
    originAcross: -minAcross,
    originAlong: -minAlong,
  };
}

/**
 * Stage 3 for `All Relatives`: packs descendant blocks post-order and shifts
 * each ancestor couple's `across` seam inward toward its direct-line child
 * using pure `BoxExtents` + `anchors` formulas.
 */
export function positionRelativesStage3(
  stage1: RelativesStage1Result,
  rawMeasured: ReadonlyMap<string, MeasuredNode>,
  theme: Pick<CoreTheme, 'siblingSpacing' | 'generationSpacing'>,
): Map<string, AbstractPoint> {
  const siblingSpacing = Number.isFinite(theme.siblingSpacing)
    ? theme.siblingSpacing
    : 0;
  const generationSpacing = Number.isFinite(theme.generationSpacing)
    ? theme.generationSpacing
    : 0;
  const measured = sanitizeMeasuredNodes(rawMeasured);
  const finalPositions = new Map<string, AbstractPoint>();

  if (!stage1.focusHierarchyRoot || !stage1.focusPrimaryRoot) {
    return finalPositions;
  }

  // 1. Lay out focus person's descendant block at seam (0, 0)
  const focusPos = layoutTidyTree(
    toTidyNode(stage1.focusHierarchyRoot, measured),
    {
      siblingSpacing,
      generationSpacing,
      flipAlong: false,
      anchorNodeId: stage1.focusPrimaryRoot.id,
    },
  );
  for (const [id, pt] of focusPos.entries()) {
    finalPositions.set(id, pt);
  }

  if (stage1.postOrderBlocks.length === 0) {
    return finalPositions;
  }

  const focusMeasured = measured.get(stage1.focusPrimaryRoot.id);
  const focusExt = focusMeasured?.extents ?? ZERO_EXTENTS;
  // Center of focusPrimaryRoot's whole box in across space (used when centering `middle` ancestors)
  const focusBboxCenterAcross =
    (focusExt.acrossAfter - focusExt.acrossBefore) / 2;

  // 2. Post-order pass: lay out each ancestor block and compute stacked heights
  const metricsBySkeletonId = new Map<string, PackedBlockMetrics>();

  for (const blk of stage1.postOrderBlocks) {
    const pos = layoutTidyTree(toTidyNode(blk.hierarchyRoot, measured), {
      siblingSpacing,
      generationSpacing,
      flipAlong: false,
      anchorNodeId: blk.primaryRootNode.id,
    });
    const bounds = computeSubtreeBounds(blk.bfsNodes, pos, measured);

    let parentAlongHeight = 0;
    for (const childSkelId of [
      blk.indiParentSkeletonId,
      blk.spouseParentSkeletonId,
    ]) {
      if (!childSkelId) continue;
      const childMetrics = metricsBySkeletonId.get(childSkelId);
      if (childMetrics) {
        parentAlongHeight += childMetrics.totalAlongHeight + generationSpacing;
      }
    }

    metricsBySkeletonId.set(blk.skeletonId, {
      positions: pos,
      width: bounds.width,
      totalAlongHeight: bounds.height + parentAlongHeight,
      anchorAcrossInBox: bounds.originAcross,
      anchorAlongInBox: bounds.originAlong + parentAlongHeight,
    });
  }

  // 3. Pre-order top-down pass: position indiParent and spouseParent blocks relative to each node
  // (with a list of what is to do instead of recursion, see Stage 1).
  const placeTodo: Array<{
    thisNodeId: string;
    isFocusOrMiddle: boolean;
    indiSkelId: string | undefined;
    spouseSkelId: string | undefined;
  }> = [
    {
      thisNodeId: stage1.focusPrimaryRoot.id,
      isFocusOrMiddle: true,
      indiSkelId: stage1.focusIndiParentSkeletonId,
      spouseSkelId: stage1.focusSpouseParentSkeletonId,
    },
  ];
  while (placeTodo.length > 0) {
    const { thisNodeId, isFocusOrMiddle, indiSkelId, spouseSkelId } =
      placeTodo.pop()!;
    const thisPos = finalPositions.get(thisNodeId) ?? { along: 0, across: 0 };
    const thisM = measured.get(thisNodeId);
    const thisExt = thisM?.extents ?? ZERO_EXTENTS;
    const indiAnchorAcross = thisM?.anchors.indiParents.across ?? 0;
    const spouseAnchorAcross = thisM?.anchors.spouseParents.across ?? 0;

    const indiBlk = indiSkelId
      ? stage1.blocksBySkeletonId.get(indiSkelId)
      : undefined;
    const spouseBlk = spouseSkelId
      ? stage1.blocksBySkeletonId.get(spouseSkelId)
      : undefined;
    const indiMetrics = indiSkelId
      ? metricsBySkeletonId.get(indiSkelId)
      : undefined;
    const spouseMetrics = spouseSkelId
      ? metricsBySkeletonId.get(spouseSkelId)
      : undefined;

    const clampAgainstOuterExtras = (
      blk: SkeletonBlockDescriptor,
      candidateSeamAcross: number,
      pExt: BoxExtents,
    ): number => {
      let clamped = candidateSeamAcross;
      if (blk.extraRootsOuterLeft.length > 0) {
        const adjLeft =
          blk.extraRootsOuterLeft[blk.extraRootsOuterLeft.length - 1]!;
        const adjPos = finalPositions.get(adjLeft.id);
        const adjExt = measured.get(adjLeft.id)?.extents ?? ZERO_EXTENTS;
        if (adjPos) {
          const minAllowed =
            adjPos.across +
            adjExt.acrossAfter +
            siblingSpacing +
            pExt.acrossBefore;
          clamped = Math.max(clamped, minAllowed);
        }
      }
      if (blk.extraRootsOuterRight.length > 0) {
        const adjRight = blk.extraRootsOuterRight[0]!;
        const adjPos = finalPositions.get(adjRight.id);
        const adjExt = measured.get(adjRight.id)?.extents ?? ZERO_EXTENTS;
        if (adjPos) {
          const maxAllowed =
            adjPos.across -
            adjExt.acrossBefore -
            siblingSpacing -
            pExt.acrossAfter;
          clamped = Math.min(clamped, maxAllowed);
        }
      }
      return clamped;
    };

    if (indiBlk && indiMetrics) {
      const spouseTreeAlong = spouseMetrics
        ? spouseMetrics.totalAlongHeight + generationSpacing
        : 0;

      const dAcross =
        thisPos.across +
        indiAnchorAcross +
        indiMetrics.anchorAcrossInBox +
        (indiBlk.left ? -indiMetrics.width - siblingSpacing : siblingSpacing);
      const dAlong =
        thisPos.along -
        thisExt.alongBefore -
        indiMetrics.totalAlongHeight -
        (indiBlk.left
          ? generationSpacing
          : spouseTreeAlong + generationSpacing) +
        indiMetrics.anchorAlongInBox;

      for (const [id, pt] of indiMetrics.positions.entries()) {
        finalPositions.set(id, {
          along: pt.along + dAlong,
          across: pt.across + dAcross,
        });
      }

      // Shift primary ancestor couple's across seam inward toward direct-line child
      const pId = indiBlk.primaryRootNode.id;
      const pM = measured.get(pId);
      const pExt = pM?.extents ?? ZERO_EXTENTS;
      const pChildAnchorAcross = pM?.anchors.children.across ?? 0;
      const idealSeam = thisPos.across + indiAnchorAcross - pChildAnchorAcross;

      let newPSeam: number;
      if (indiBlk.middle) {
        newPSeam =
          focusBboxCenterAcross + (pExt.acrossBefore - pExt.acrossAfter) / 2;
      } else if (isFocusOrMiddle) {
        newPSeam = thisPos.across - siblingSpacing / 2 - pExt.acrossAfter;
      } else if (indiBlk.left) {
        const maxAllowed =
          thisPos.across +
          spouseAnchorAcross -
          siblingSpacing -
          pExt.acrossAfter;
        newPSeam = Math.min(maxAllowed, idealSeam);
      } else {
        const minAllowed =
          thisPos.across - thisExt.acrossBefore + pExt.acrossBefore;
        newPSeam = Math.max(minAllowed, idealSeam);
      }

      newPSeam = clampAgainstOuterExtras(indiBlk, newPSeam, pExt);
      const curP = finalPositions.get(pId)!;
      finalPositions.set(pId, { along: curP.along, across: newPSeam });
    }

    if (spouseBlk && spouseMetrics) {
      const indiTreeAlong = indiMetrics
        ? indiMetrics.totalAlongHeight + generationSpacing
        : 0;

      const dAcross =
        thisPos.across +
        spouseAnchorAcross +
        spouseMetrics.anchorAcrossInBox +
        (spouseBlk.left
          ? -spouseMetrics.width - siblingSpacing
          : siblingSpacing);
      const dAlong =
        thisPos.along -
        thisExt.alongBefore -
        spouseMetrics.totalAlongHeight -
        (spouseBlk.left
          ? indiTreeAlong + generationSpacing
          : generationSpacing) +
        spouseMetrics.anchorAlongInBox;

      for (const [id, pt] of spouseMetrics.positions.entries()) {
        finalPositions.set(id, {
          along: pt.along + dAlong,
          across: pt.across + dAcross,
        });
      }

      const pId = spouseBlk.primaryRootNode.id;
      const pM = measured.get(pId);
      const pExt = pM?.extents ?? ZERO_EXTENTS;
      const pChildAnchorAcross = pM?.anchors.children.across ?? 0;
      const idealSeam =
        thisPos.across + spouseAnchorAcross - pChildAnchorAcross;

      let newPSeam: number;
      if (spouseBlk.middle) {
        newPSeam =
          focusBboxCenterAcross + (pExt.acrossBefore - pExt.acrossAfter) / 2;
      } else if (isFocusOrMiddle) {
        newPSeam = thisPos.across + siblingSpacing / 2 + pExt.acrossBefore;
      } else if (spouseBlk.left) {
        const maxAllowed =
          thisPos.across + thisExt.acrossAfter - pExt.acrossAfter;
        newPSeam = Math.min(maxAllowed, idealSeam);
      } else {
        const minAllowed =
          thisPos.across +
          indiAnchorAcross +
          siblingSpacing +
          pExt.acrossBefore;
        newPSeam = Math.max(minAllowed, idealSeam);
      }

      newPSeam = clampAgainstOuterExtras(spouseBlk, newPSeam, pExt);
      const curP = finalPositions.get(pId)!;
      finalPositions.set(pId, { along: curP.along, across: newPSeam });
    }

    // The side of the indi is placed first, with everything above it: it
    // is put on the list last.
    if (spouseBlk) {
      placeTodo.push({
        thisNodeId: spouseBlk.primaryRootNode.id,
        isFocusOrMiddle: spouseBlk.middle,
        indiSkelId: spouseBlk.indiParentSkeletonId,
        spouseSkelId: spouseBlk.spouseParentSkeletonId,
      });
    }
    if (indiBlk) {
      placeTodo.push({
        thisNodeId: indiBlk.primaryRootNode.id,
        isFocusOrMiddle: indiBlk.middle,
        indiSkelId: indiBlk.indiParentSkeletonId,
        spouseSkelId: indiBlk.spouseParentSkeletonId,
      });
    }
  }

  return finalPositions;
}
