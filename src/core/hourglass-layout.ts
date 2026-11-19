import type { AbstractPoint } from './axes.js';
import { IdGenerator } from './id-generator.js';
import {
  layoutTidyTree,
  sanitizeMeasuredNodes,
  toTidyNode,
} from './tidy-tree.js';
import {
  buildAncestorTree,
  buildDescendantTree,
  collectBfsNodes,
  getValidSpouseFamilies,
  normalizeBaseGeneration,
  normalizeMaxGenerations,
  toSizeInput,
  type BuiltTreeNode,
} from './tree-builder.js';
import type {
  CoreTheme,
  FamilyGraph,
  LayoutLink,
  MeasuredNode,
  Problem,
  SizeNodeInput,
  ViewState,
} from './types.js';

export interface HourglassStage1Result {
  ancestorRoot: BuiltTreeNode | null;
  descendantHierarchyRoot: BuiltTreeNode | null;
  primaryRootId: string | null;
  orderedNodes: BuiltTreeNode[];
  sizeInputs: SizeNodeInput[];
  links: LayoutLink[];
}

/**
 * Stage 1 for Hourglass (including pure Ancestor `maxDescendantGenerations: 0`
 * and pure Descendant `maxAncestorGenerations: 0` depth limits).
 */
export function buildHourglassStage1(
  viewState: ViewState,
  options: {
    graph: FamilyGraph;
    maxAncestorGenerations?: number | undefined;
    maxDescendantGenerations?: number | undefined;
    problems: Problem[];
  },
): HourglassStage1Result {
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
      ancestorRoot: null,
      descendantHierarchyRoot: null,
      primaryRootId: null,
      orderedNodes: [],
      sizeInputs: [],
      links: [],
    };
  }

  // Pure Ancestor mode (maxDescendantGenerations === 0):
  // Root is the single start person; climb only startIndi's ancestors.
  if (maxDescendantGenerations === 0) {
    const ancIdGen = new IdGenerator();
    const anc = buildAncestorTree({
      graph,
      rootSpec: { kind: 'person', personId: startIndi },
      baseGeneration,
      maxGenerations: maxAncestorGenerations,
      collapsed,
      idGenerator: ancIdGen,
      rowPrefix: 'hourglass',
      problems,
    });
    const bfsNodes = collectBfsNodes(anc.root);
    return {
      ancestorRoot: anc.root,
      descendantHierarchyRoot: null,
      primaryRootId: anc.root?.id ?? null,
      orderedNodes: bfsNodes,
      sizeInputs: bfsNodes.map(toSizeInput),
      links: anc.links,
    };
  }

  // Pure Descendant mode (maxAncestorGenerations === 0):
  if (maxAncestorGenerations === 0) {
    const descIdGen = new IdGenerator();
    const desc = buildDescendantTree({
      graph,
      rootSpec: { kind: 'person', personId: startIndi },
      baseGeneration,
      maxGenerations: maxDescendantGenerations,
      collapsed,
      idGenerator: descIdGen,
      rowPrefix: 'hourglass',
      markIsRoot: true,
      problems,
    });
    const bfsNodes = collectBfsNodes(desc.hierarchyRoot);
    return {
      ancestorRoot: null,
      descendantHierarchyRoot: desc.hierarchyRoot,
      primaryRootId: desc.primaryRootNode?.id ?? null,
      orderedNodes: bfsNodes,
      sizeInputs: bfsNodes.map(toSizeInput),
      links: desc.links,
    };
  }

  // Full Hourglass mode (both ancestors and descendants enabled).
  // The descendant half is built first: the ancestor half takes ids that the
  // descendant half has not used, so that every node has the id its expanders
  // were looked up with (ViewState.collapsed). Problems keep the order
  // ancestors, descendants.
  const descProblems: Problem[] = [];
  const descResult = buildDescendantTree({
    graph,
    rootSpec: { kind: 'person', personId: startIndi },
    baseGeneration,
    maxGenerations: maxDescendantGenerations,
    collapsed,
    idGenerator: new IdGenerator(),
    rowPrefix: 'hourglass',
    markIsRoot: true,
    problems: descProblems,
  });
  // The primary root node is the root of both halves.
  const descRoot = descResult.primaryRootNode!;

  // Root-spouse promotion when startIndi has at least one valid spouse family.
  const validSpouseFamilies = getValidSpouseFamilies(graph, startIndi, []);
  const firstFamId = validSpouseFamilies[0];
  const [firstPartner, secondPartner] =
    firstFamId !== undefined
      ? graph.getFamilyPartners(firstFamId)
      : [null, null];
  const ancResult = buildAncestorTree({
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
    idGenerator: new IdGenerator(descResult.nodes.map((n) => n.id)),
    rootNodeId: descRoot.id,
    rowPrefix: 'hourglass',
    problems,
  });
  for (const problem of descProblems) {
    problems.push(problem);
  }
  const ancRoot = ancResult.root!;

  // Copy ancestor expanders onto the shared primary root node
  if (ancRoot.expanders.indiParents !== undefined) {
    descRoot.expanders.indiParents = ancRoot.expanders.indiParents;
  }
  if (ancRoot.expanders.spouseParents !== undefined) {
    descRoot.expanders.spouseParents = ancRoot.expanders.spouseParents;
  }

  const ancBfs = collectBfsNodes(ancRoot);
  const descBfs = collectBfsNodes(descResult.hierarchyRoot);
  const orderedNodes = [...ancBfs.slice(1), ...descBfs];
  const links: LayoutLink[] = [...ancResult.links, ...descResult.links];

  return {
    ancestorRoot: ancRoot,
    descendantHierarchyRoot: descResult.hierarchyRoot,
    primaryRootId: descRoot.id,
    orderedNodes,
    sizeInputs: orderedNodes.map(toSizeInput),
    links,
  };
}

/**
 * Stage 3 for Hourglass: positions ancestor and descendant halves in abstract
 * (along, across) seam space and merges both halves at seam (0, 0).
 */
export function positionHourglassStage3(
  stage1: HourglassStage1Result,
  measured: ReadonlyMap<string, MeasuredNode>,
  theme: Pick<CoreTheme, 'siblingSpacing' | 'generationSpacing'>,
): Map<string, AbstractPoint> {
  const positions = new Map<string, AbstractPoint>();
  if (!stage1.primaryRootId) {
    return positions;
  }
  const cleanMeasured = sanitizeMeasuredNodes(measured);

  if (stage1.ancestorRoot) {
    const ancTidy = toTidyNode(stage1.ancestorRoot, cleanMeasured);
    const ancPos = layoutTidyTree(ancTidy, {
      siblingSpacing: theme.siblingSpacing,
      generationSpacing: theme.generationSpacing,
      flipAlong: true,
      anchorNodeId: stage1.primaryRootId,
    });
    for (const [id, pt] of ancPos.entries()) {
      positions.set(id, pt);
    }
  }

  if (stage1.descendantHierarchyRoot) {
    const descTidy = toTidyNode(stage1.descendantHierarchyRoot, cleanMeasured);
    const descPos = layoutTidyTree(descTidy, {
      siblingSpacing: theme.siblingSpacing,
      generationSpacing: theme.generationSpacing,
      flipAlong: false,
      anchorNodeId: stage1.primaryRootId,
    });
    for (const [id, pt] of descPos.entries()) {
      positions.set(id, pt);
    }
  }

  return positions;
}
