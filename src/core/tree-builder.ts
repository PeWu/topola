import type { IdGenerator } from './id-generator.js';
import type {
  ExpanderState,
  FamilyGraph,
  LayoutLink,
  Problem,
  SizeNodeInput,
  Slot,
} from './types.js';

export interface BuiltTreeNode {
  id: string;
  rowId: string;
  generation: number;
  isRoot: boolean;
  indiId?: string | undefined;
  spouseId?: string | undefined;
  familyId?: string | undefined;
  expanders: Partial<Record<Slot, ExpanderState>>;
  children: BuiltTreeNode[];
  isDummyRoot?: boolean | undefined;
}

/**
 * Returns the nodes of a tree level by level, without the dummy root. This is
 * the order of the nodes of a layout.
 */
export function collectBfsNodes(root: BuiltTreeNode | null): BuiltTreeNode[] {
  if (!root) return [];
  const result: BuiltTreeNode[] = [];
  const queue: BuiltTreeNode[] = [root];
  // Read with an index: Array.shift() is linear on large arrays.
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]!;
    if (!cur.isDummyRoot) {
      result.push(cur);
    }
    for (const child of cur.children) {
      queue.push(child);
    }
  }
  return result;
}

export function toSizeInput(node: BuiltTreeNode): SizeNodeInput {
  return {
    nodeId: node.id,
    rowId: node.rowId,
    generation: node.generation,
    isRoot: node.isRoot,
    ...(node.indiId !== undefined ? { indiId: node.indiId } : {}),
    ...(node.spouseId !== undefined ? { spouseId: node.spouseId } : {}),
    ...(node.familyId !== undefined ? { familyId: node.familyId } : {}),
  };
}

/**
 * The id of a link between two nodes: the length of the first node id, the
 * id itself, a sign for the kind of link, and the second node id. No two
 * links of a layout share an id, whatever the ids of the people and families
 * are: node ids are unique, the length tells where the first one ends (ids
 * may contain any character, and the id generator adds `:1`, `:2` to
 * copies), and the sign tells the kinds apart.
 */
function linkId(fromNodeId: string, sign: '>' | '=', toNodeId: string): string {
  return `${fromNodeId.length}:${fromNodeId}${sign}${toNodeId}`;
}

/** The id of the link from a parent node to the node of a child. */
export function parentChildLinkId(
  fromNodeId: string,
  toNodeId: string,
): string {
  return linkId(fromNodeId, '>', toNodeId);
}

/**
 * The id of the link between two marriages of one person. It names both
 * nodes, so that a node with several such links (a remarried ancestor couple
 * in `relatives`) gives each a different id.
 */
export function additionalMarriageLinkId(
  fromNodeId: string,
  toNodeId: string,
): string {
  return linkId(fromNodeId, '=', toNodeId);
}

export interface AncestorBuildOptions {
  graph: FamilyGraph;
  rootSpec:
    | { kind: 'person'; personId: string }
    | {
        kind: 'family';
        familyId: string;
        swapPartners?: boolean | undefined;
        omitSpouseAncestors?: boolean | undefined;
      };
  baseGeneration: number;
  maxGenerations?: number | undefined;
  collapsed?: ReadonlySet<`${string}:${Slot}`> | undefined;
  retainParentlessFamilies?: boolean | undefined;
  idGenerator: IdGenerator;
  /**
   * The id of the root node, if it has one already (the node is also the
   * root of a descendant tree). Otherwise the id generator gives it one.
   */
  rootNodeId?: string | undefined;
  rowPrefix: string;
  problems: Problem[];
}

export interface AncestorMarriageSeed {
  familyId: string;
  indiId?: string | undefined;
  spouseId?: string | undefined;
  isPrimary?: boolean | undefined;
  /** The id of the node, if it has one already; else it is generated. */
  nodeId?: string | undefined;
}

export interface DescendantBuildOptions {
  graph: FamilyGraph;
  rootSpec:
    | { kind: 'person'; personId: string }
    | { kind: 'customRoots'; roots: AncestorMarriageSeed[] };
  baseGeneration: number;
  maxGenerations?: number | undefined;
  collapsed?: ReadonlySet<`${string}:${Slot}`> | undefined;
  idGenerator: IdGenerator;
  rowPrefix: string;
  markIsRoot: boolean;
  problems: Problem[];
}

/**
 * The builders walk a tree with a stack, and know the people and families on
 * the way from the root to the item they work on (the path), to find cycles.
 * There is one set for the path, not one per item (a copy per item takes
 * time and memory by the square of the depth): an item names the keys it
 * adds to the path, and an `ExitItem` below its children on the stack takes
 * them out again when the walk has left the item.
 */
interface ExitItem {
  exitKeys: readonly string[];
}

interface AncestorStackItem {
  node: BuiltTreeNode;
  familyId: string;
  depth: number;
  swapPartners?: boolean | undefined;
  omitSpouseAncestors?: boolean | undefined;
  pathKeys: readonly string[];
}

interface DescendantStackItem {
  node: BuiltTreeNode;
  familyId: string;
  depth: number;
  pathKeys: readonly string[];
}

/**
 * Takes the next item off the stack and brings the path up to date: the path
 * then leads to the item, the item included. Returns nothing when the walk
 * is over.
 */
function nextStackItem<T extends { pathKeys: readonly string[] }>(
  stack: Array<T | ExitItem>,
  activePath: Set<string>,
): T | undefined {
  for (;;) {
    const item = stack.pop();
    if (item === undefined) return undefined;
    if ('exitKeys' in item) {
      for (const key of item.exitKeys) activePath.delete(key);
      continue;
    }
    // No key is on the path already: that was checked before the item was
    // put on the stack, and the path is the same now as it was then.
    for (const key of item.pathKeys) activePath.add(key);
    stack.push({ exitKeys: item.pathKeys });
    return item;
  }
}

export function normalizeMaxGenerations(
  limit: number | undefined,
): number | undefined {
  if (limit === undefined || Number.isNaN(limit) || limit === Infinity) {
    return undefined;
  }
  return Math.max(0, Math.floor(limit));
}

export function normalizeBaseGeneration(
  baseGeneration: number | undefined,
): number {
  if (typeof baseGeneration !== 'number' || !Number.isFinite(baseGeneration)) {
    return 0;
  }
  return Object.is(baseGeneration, -0) ? 0 : baseGeneration;
}

function getValidPartners(
  graph: FamilyGraph,
  familyId: string,
  problems: Problem[],
): [string | null, string | null] {
  const [rawFather, rawMother] = graph.getFamilyPartners(familyId);
  let father = rawFather;
  let mother = rawMother;
  if (father && !graph.hasPerson(father)) {
    problems.push({
      code: 'MISSING_PERSON',
      message: `Family "${familyId}" references missing partner "${father}".`,
      entityId: father,
    });
    father = null;
  }
  if (mother && !graph.hasPerson(mother)) {
    problems.push({
      code: 'MISSING_PERSON',
      message: `Family "${familyId}" references missing partner "${mother}".`,
      entityId: mother,
    });
    mother = null;
  }
  if (father && mother === father) {
    mother = null;
  }
  return [father, mother];
}

function getValidChildren(
  graph: FamilyGraph,
  familyId: string,
  problems: Problem[],
): string[] {
  const valid: string[] = [];
  const seen = new Set<string>();
  for (const childId of graph.getFamilyChildren(familyId)) {
    if (seen.has(childId)) continue;
    seen.add(childId);
    if (!graph.hasPerson(childId)) {
      problems.push({
        code: 'MISSING_PERSON',
        message: `Family "${familyId}" references missing child "${childId}".`,
        entityId: childId,
      });
      continue;
    }
    valid.push(childId);
  }
  return valid;
}

function shouldKeepParentFamily(
  graph: FamilyGraph,
  personId: string,
  famc: string,
  retainParentlessFamilies: boolean,
  problems: Problem[],
): boolean {
  if (!graph.hasFamily(famc)) {
    problems.push({
      code: 'MISSING_FAMILY',
      message: `Person "${personId}" references missing parent family "${famc}".`,
      entityId: famc,
    });
    return false;
  }
  const [father, mother] = getValidPartners(graph, famc, problems);
  if (father || mother) {
    return true;
  }
  if (!retainParentlessFamilies) {
    return false;
  }
  const validChildren = getValidChildren(graph, famc, []);
  return validChildren.length > 1;
}

/**
 * Builds an ancestor hierarchy (Stage 1) matching Topola 3's traversal and
 * duplicate-ID assignment order while adding cycle and missing-ref safety.
 */
export function buildAncestorTree(options: AncestorBuildOptions): {
  root: BuiltTreeNode | null;
  nodes: BuiltTreeNode[];
  links: LayoutLink[];
} {
  const {
    graph,
    rootSpec,
    collapsed,
    retainParentlessFamilies = false,
    idGenerator,
    rowPrefix,
    problems,
  } = options;
  const baseGeneration = normalizeBaseGeneration(options.baseGeneration);
  const maxGenerations = normalizeMaxGenerations(options.maxGenerations);

  const nodes: BuiltTreeNode[] = [];
  const links: LayoutLink[] = [];
  const stack: Array<AncestorStackItem | ExitItem> = [];
  // The people and families from the root to the item that is worked on.
  const activePath = new Set<string>();

  /**
   * Adds the parent family of a person of `node` above the node, unless it
   * is missing, on the path already (a cycle), beyond the generation limit
   * or collapsed. Returns the new node.
   */
  const climb = (
    node: BuiltTreeNode,
    personId: string,
    slot: 'indiParents' | 'spouseParents',
    depth: number,
  ): BuiltTreeNode | undefined => {
    const famc = graph.getPersonParentFamily(personId);
    if (
      !famc ||
      !shouldKeepParentFamily(
        graph,
        personId,
        famc,
        retainParentlessFamilies,
        problems,
      )
    ) {
      return undefined;
    }
    if (activePath.has(`f:${famc}`) || activePath.has(`p:${personId}`)) {
      problems.push({
        code: 'CYCLE_DETECTED',
        message: `Cycle detected while climbing ancestors of "${personId}" via "${famc}".`,
        entityId: famc,
      });
      return undefined;
    }
    if (maxGenerations !== undefined && !(depth + 1 <= maxGenerations)) {
      return undefined;
    }
    if (collapsed?.has(`${node.id}:${slot}`)) {
      node.expanders[slot] = 'plus';
      return undefined;
    }
    const parentNodeId = idGenerator.getId(famc);
    node.expanders[slot] = 'minus';
    const parentNode: BuiltTreeNode = {
      id: parentNodeId,
      rowId: `${rowPrefix}:${-(depth + 1)}`,
      generation: baseGeneration - (depth + 1),
      isRoot: false,
      familyId: famc,
      expanders: {},
      children: [],
    };
    links.push({
      id: parentChildLinkId(parentNodeId, node.id),
      kind: 'parentChild',
      fromNodeId: parentNodeId,
      fromSlot: 'children',
      toNodeId: node.id,
      toSlot: slot,
      childIndiId: personId,
    });
    stack.push({
      node: parentNode,
      familyId: famc,
      depth: depth + 1,
      pathKeys: [`p:${personId}`, `f:${famc}`],
    });
    return parentNode;
  };

  let root: BuiltTreeNode;

  if (rootSpec.kind === 'person') {
    const { personId } = rootSpec;
    if (!graph.hasPerson(personId)) {
      problems.push({
        code: 'MISSING_START_PERSON',
        message: `Start person "${personId}" was not found in graph.`,
        entityId: personId,
      });
      return { root: null, nodes: [], links: [] };
    }
    root = {
      id: options.rootNodeId ?? idGenerator.getId(personId),
      rowId: `${rowPrefix}:0`,
      generation: baseGeneration,
      isRoot: true,
      indiId: personId,
      expanders: {},
      children: [],
    };
    nodes.push(root);

    const parentNode = climb(root, personId, 'indiParents', 0);
    if (parentNode) root.children.push(parentNode);
  } else {
    const { familyId, swapPartners, omitSpouseAncestors } = rootSpec;
    if (!graph.hasFamily(familyId)) {
      problems.push({
        code: 'MISSING_FAMILY',
        message: `Root family "${familyId}" was not found in graph.`,
        entityId: familyId,
      });
      return { root: null, nodes: [], links: [] };
    }
    root = {
      id: options.rootNodeId ?? idGenerator.getId(familyId),
      rowId: `${rowPrefix}:0`,
      generation: baseGeneration,
      isRoot: true,
      familyId,
      expanders: {},
      children: [],
    };
    stack.push({
      node: root,
      familyId,
      depth: 0,
      swapPartners,
      omitSpouseAncestors,
      pathKeys: [`f:${familyId}`],
    });
  }

  for (;;) {
    const item = nextStackItem(stack, activePath);
    if (!item) break;
    const { node, familyId, depth, swapPartners, omitSpouseAncestors } = item;
    if (!graph.hasFamily(familyId)) {
      continue;
    }

    const [rawFather, rawMother] = getValidPartners(graph, familyId, problems);
    const [indiPartner, spousePartner] = swapPartners
      ? [rawMother, rawFather]
      : [rawFather, rawMother];

    if (!indiPartner && !spousePartner) {
      if (retainParentlessFamilies) {
        const validChildren = getValidChildren(graph, familyId, []);
        if (validChildren.length > 1) {
          nodes.push(node);
        }
      }
      continue;
    }

    if (indiPartner) node.indiId = indiPartner;
    if (spousePartner) node.spouseId = spousePartner;
    nodes.push(node);

    // Match Topola 3's exact IdGenerator & LIFO stack order:
    // 1) Process spouse (mother) first (allocates ID first, pushed onto stack first -> popped second / right child)
    // 2) Process indi (father) second (allocates ID second, pushed onto stack second -> popped first / left child)
    const spouseChildNode =
      spousePartner && !omitSpouseAncestors
        ? climb(node, spousePartner, 'spouseParents', depth)
        : undefined;
    const indiChildNode = indiPartner
      ? climb(node, indiPartner, 'indiParents', depth)
      : undefined;

    // Left child is indiParents, right child is spouseParents
    if (indiChildNode) node.children.push(indiChildNode);
    if (spouseChildNode) node.children.push(spouseChildNode);
  }

  return { root, nodes, links };
}

export function getSpouseOfPerson(
  graph: FamilyGraph,
  personId: string,
  familyId: string,
  problems: Problem[],
): string | undefined {
  const [father, mother] = getValidPartners(graph, familyId, problems);
  if (father === personId) return mother ?? undefined;
  if (mother === personId) return father ?? undefined;
  return undefined;
}

/**
 * Returns the spouse families of a person that exist and have the person as
 * a partner, each of them once. The others are reported as problems.
 */
export function getValidSpouseFamilies(
  graph: FamilyGraph,
  personId: string,
  problems: Problem[],
): string[] {
  const validFams: string[] = [];
  const seen = new Set<string>();
  for (const famId of graph.getPersonSpouseFamilies(personId)) {
    if (seen.has(famId)) continue;
    seen.add(famId);
    if (!graph.hasFamily(famId)) {
      problems.push({
        code: 'MISSING_FAMILY',
        message: `Person "${personId}" references missing spouse family "${famId}".`,
        entityId: famId,
      });
      continue;
    }
    const [father, mother] = graph.getFamilyPartners(famId);
    if (father !== personId && mother !== personId) {
      problems.push({
        code: 'ASYMMETRIC_SPOUSE_LINK',
        message: `Person "${personId}" references spouse family "${famId}", which does not have the person as a partner.`,
        entityId: famId,
      });
      continue;
    }
    validFams.push(famId);
  }
  return validFams;
}

function createPersonMarriageNodes(
  graph: FamilyGraph,
  personId: string,
  rowId: string,
  generation: number,
  isRoot: boolean,
  problems: Problem[],
): BuiltTreeNode[] {
  const validFams = getValidSpouseFamilies(graph, personId, problems);

  if (validFams.length === 0) {
    return [
      {
        id: personId,
        rowId,
        generation,
        isRoot,
        indiId: personId,
        expanders: {},
        children: [],
      },
    ];
  }

  return validFams.map((famId) => {
    const spouseId = getSpouseOfPerson(graph, personId, famId, problems);
    return {
      id: famId,
      rowId,
      generation,
      isRoot,
      indiId: personId,
      ...(spouseId !== undefined ? { spouseId } : {}),
      familyId: famId,
      expanders: {},
      children: [],
    };
  });
}

/**
 * Builds a descendant hierarchy (Stage 1), wrapping multi-marriage roots in an
 * internal dummy root and emitting explicit `additionalMarriage` links.
 */
export function buildDescendantTree(options: DescendantBuildOptions): {
  hierarchyRoot: BuiltTreeNode | null;
  primaryRootNode: BuiltTreeNode | null;
  nodes: BuiltTreeNode[];
  links: LayoutLink[];
} {
  const {
    graph,
    rootSpec,
    collapsed,
    idGenerator,
    rowPrefix,
    markIsRoot,
    problems,
  } = options;
  const baseGeneration = normalizeBaseGeneration(options.baseGeneration);
  const maxGenerations = normalizeMaxGenerations(options.maxGenerations);

  const nodes: BuiltTreeNode[] = [];
  const links: LayoutLink[] = [];
  let rootNodes: BuiltTreeNode[];
  let primaryRootNode: BuiltTreeNode | null = null;

  if (rootSpec.kind === 'person') {
    const { personId } = rootSpec;
    if (!graph.hasPerson(personId)) {
      problems.push({
        code: 'MISSING_START_PERSON',
        message: `Start person "${personId}" was not found in graph.`,
        entityId: personId,
      });
      return {
        hierarchyRoot: null,
        primaryRootNode: null,
        nodes: [],
        links: [],
      };
    }

    rootNodes = createPersonMarriageNodes(
      graph,
      personId,
      `${rowPrefix}:0`,
      baseGeneration,
      markIsRoot,
      problems,
    );
    for (const rn of rootNodes) {
      rn.id = idGenerator.getId(rn.id);
    }
    primaryRootNode = rootNodes[0] ?? null;

    for (let i = 1; i < rootNodes.length; i++) {
      const curr = rootNodes[i]!;
      const prev = rootNodes[i - 1]!;
      links.push({
        id: additionalMarriageLinkId(curr.id, prev.id),
        kind: 'additionalMarriage',
        fromNodeId: curr.id,
        fromSlot: 'indiParents',
        toNodeId: prev.id,
        toSlot: 'indiParents',
      });
    }
  } else {
    if (rootSpec.roots.length === 0) {
      return {
        hierarchyRoot: null,
        primaryRootNode: null,
        nodes: [],
        links: [],
      };
    }
    rootNodes = rootSpec.roots.map((seed) => {
      const assignedId = seed.nodeId ?? idGenerator.getId(seed.familyId);
      const n: BuiltTreeNode = {
        id: assignedId,
        rowId: `${rowPrefix}:0`,
        generation: baseGeneration,
        isRoot: markIsRoot && !!seed.isPrimary,
        ...(seed.indiId !== undefined ? { indiId: seed.indiId } : {}),
        ...(seed.spouseId !== undefined ? { spouseId: seed.spouseId } : {}),
        familyId: seed.familyId,
        expanders: {},
        children: [],
      };
      if (seed.isPrimary || primaryRootNode === null) {
        primaryRootNode = n;
      }
      return n;
    });
  }

  let hierarchyRoot: BuiltTreeNode;
  if (rootNodes.length > 1) {
    hierarchyRoot = {
      id: '__DUMMY_ROOT__',
      rowId: `${rowPrefix}:dummy`,
      generation: baseGeneration - 1,
      isRoot: false,
      expanders: {},
      children: [...rootNodes],
      isDummyRoot: true,
    };
  } else {
    hierarchyRoot = rootNodes[0]!;
  }

  for (const rn of rootNodes) {
    nodes.push(rn);
  }

  const stack: Array<DescendantStackItem | ExitItem> = [];
  // The people and families from a root to the item that is worked on.
  const activePath = new Set<string>();
  for (const rn of rootNodes) {
    if (rn.familyId) {
      const initialActive = [`f:${rn.familyId}`];
      if (rn.indiId) initialActive.push(`p:${rn.indiId}`);
      if (rn.spouseId) initialActive.push(`p:${rn.spouseId}`);
      stack.push({
        node: rn,
        familyId: rn.familyId,
        depth: 0,
        pathKeys: initialActive,
      });
    }
  }

  for (;;) {
    const item = nextStackItem(stack, activePath);
    if (!item) break;
    const { node, familyId, depth } = item;
    const validChildren = getValidChildren(graph, familyId, problems);
    const nonCyclicChildren: string[] = [];
    for (const childId of validChildren) {
      if (activePath.has(`p:${childId}`)) {
        problems.push({
          code: 'CYCLE_DETECTED',
          message: `Cycle detected while expanding descendant "${childId}" of family "${familyId}".`,
          entityId: childId,
        });
      } else {
        nonCyclicChildren.push(childId);
      }
    }
    if (nonCyclicChildren.length === 0) {
      continue;
    }

    if (maxGenerations !== undefined && depth + 1 > maxGenerations) {
      // Suppress expander at generation limit boundary
      continue;
    }

    if (collapsed?.has(`${node.id}:children`)) {
      node.expanders.children = 'plus';
      continue;
    }

    const childRowId = `${rowPrefix}:${depth + 1}`;
    const childGen = baseGeneration + depth + 1;

    for (const childId of nonCyclicChildren) {
      const childNodes = createPersonMarriageNodes(
        graph,
        childId,
        childRowId,
        childGen,
        false,
        problems,
      );

      // The nodes of the child that are drawn: all but the marriages that
      // would close a cycle.
      const kept: BuiltTreeNode[] = [];
      for (const cn of childNodes) {
        if (cn.familyId) {
          if (activePath.has(`f:${cn.familyId}`)) {
            problems.push({
              code: 'CYCLE_DETECTED',
              message: `Cycle detected on spouse family "${cn.familyId}" of "${childId}".`,
              entityId: cn.familyId,
            });
            continue;
          }
          cn.id = idGenerator.getId(cn.familyId);
          stack.push({
            node: cn,
            familyId: cn.familyId,
            depth: depth + 1,
            pathKeys: [`p:${childId}`, `f:${cn.familyId}`],
          });
        } else {
          cn.id = idGenerator.getId(childId);
        }
        kept.push(cn);
      }
      if (kept.length === 0) {
        // Every marriage of the child would close a cycle: the child is
        // drawn alone.
        kept.push({
          id: idGenerator.getId(childId),
          rowId: childRowId,
          generation: childGen,
          isRoot: false,
          indiId: childId,
          expanders: {},
          children: [],
        });
      }
      for (const cn of kept) {
        node.children.push(cn);
        nodes.push(cn);
      }

      const firstChildNode = kept[0]!;
      links.push({
        id: parentChildLinkId(node.id, firstChildNode.id),
        kind: 'parentChild',
        fromNodeId: node.id,
        fromSlot: 'children',
        toNodeId: firstChildNode.id,
        toSlot: 'indiParents',
        childIndiId: childId,
      });

      for (let i = 1; i < kept.length; i++) {
        const curr = kept[i]!;
        const prev = kept[i - 1]!;
        links.push({
          id: additionalMarriageLinkId(curr.id, prev.id),
          kind: 'additionalMarriage',
          fromNodeId: curr.id,
          fromSlot: 'indiParents',
          toNodeId: prev.id,
          toSlot: 'indiParents',
        });
      }
    }

    // A family whose children all close a cycle has nothing to collapse.
    if (node.children.length > 0) {
      node.expanders.children = 'minus';
    }
  }

  return {
    hierarchyRoot,
    primaryRootNode,
    nodes,
    links,
  };
}
