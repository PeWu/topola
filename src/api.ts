import { BaseType, Selection } from 'd3-selection';
import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';

/** Individual or family ID with dimensions. */
export interface TreeEntry {
  id: string;
  width?: number;
  height?: number;
  expander?: ExpanderState;
}

export enum ExpanderState {
  PLUS,
  MINUS,
}

export enum ExpanderDirection {
  INDI,
  SPOUSE,
  FAMILY,
}

/** Represents a node in the d3 graph structure. */
export interface TreeNode {
  // Family ID when represents family, or
  // indi ID when represents single individual.
  id: string;
  // Parent in the tree structure sense, not neceserily in the family sense.
  parentId?: string;

  indi?: TreeEntry;
  spouse?: TreeEntry;
  family?: TreeEntry;

  // Dimensions of the whole tree node for the purpose of laying out.
  width?: number;
  height?: number;

  // The generation number relative to the starting individual where negative
  // numbers are ancestors and positive numbers are descendants.
  generation?: number;

  // If true, the links to children of this family will be attached to
  // the spouse box of the child node.
  // parentsOfSpouse?: boolean;
  indiParentNodeId?: string;
  spouseParentNodeId?: string;

  // If true, this marriage will be rendered as an additional marriage
  // of an existing child.
  additionalMarriage?: boolean;
}

/**
 * Interface for an individual.
 * This interface is only used in the context of creating the layout.
 */
export interface Indi {
  getId(): string;
  getFamiliesAsSpouse(): string[];
  getFamilyAsChild(): string | null;
}

/**
 * Interface for a family.
 * This interface is only used in the context of creating the layout.
 */
export interface Fam {
  getId(): string;
  getFather(): string | null;
  getMother(): string | null;
  getChildren(): string[];
}

/** Data provider backed up by a data structure. */
export interface DataProvider<IndiT extends Indi, FamT extends Fam> {
  getIndi(id: string): IndiT | null;
  getFam(id: string): FamT | null;
}

/** D3 selection containing TreeNode data. */
export type TreeNodeSelection = Selection<
  BaseType,
  HierarchyPointNode<TreeNode>,
  BaseType,
  {}
>;

/** Interface for rendering data. */
export interface Renderer {
  // Renders the node.
  render(enter: TreeNodeSelection, update: TreeNodeSelection): void;
  // Returns CSS used as a string
  getCss(): string;
  // Updates node dimensions.
  updateNodes(nodes: Array<HierarchyNode<TreeNode>>): void;
  // Returns the family anchor point relative to the node's coordinates.
  getFamilyAnchor(node: TreeNode): [number, number];
  // Returns the individual anchor point relative to the node's coordinates.
  getIndiAnchor(node: TreeNode): [number, number];
  // Returns the spouse anchor point relative to the node's coordinates.
  getSpouseAnchor(node: TreeNode): [number, number];
}

export interface IndiInfo {
  id: string;
  generation: number;
}

export interface FamInfo {
  id: string;
  generation: number;
}

export enum ChartColors {
  NO_COLOR,
  COLOR_BY_GENERATION,
  COLOR_BY_SEX,
}

export interface RendererOptions<IndiT extends Indi, FamT extends Fam> {
  // Creates HTTP link based on ID.
  indiHrefFunc?: (id: string) => string;
  famHrefFunc?: (id: string) => string;
  indiCallback?: (id: IndiInfo) => void;
  famCallback?: (id: FamInfo) => void;
  data: DataProvider<IndiT, FamT>;
  horizontal?: boolean;
  // How to use colors.
  colors?: ChartColors;
  // Animate showing and transforming charts.
  animate?: boolean;
  locale?: string;
}

export interface ChartInfo {
  // Chart size.
  size: [number, number];
  // The coordinates of the start indi or fam.
  origin: [number, number];
  // Promise that is resolved after animations are finished.
  animationPromise: Promise<void>;
}

export interface Chart {
  render(): ChartInfo;
}

export interface ChartOptions {
  // Input data.
  data: DataProvider<Indi, Fam>;
  // Renderer for individual data.
  renderer: Renderer;
  // CSS selector of the SVG tag to draw in. If not provided, the chart will be
  // rendered in the first SVG tag.
  svgSelector: string;
  // The ID of the root individual or family. Set either startIndi or startFam.
  startIndi?: string;
  startFam?: string;
  // When starting with a family, make spouses swap places.
  swapStartSpouses?: boolean;
  horizontal?: boolean;
  // Generation number of the startIndi or startFam. Used when rendering.
  baseGeneration?: number;
  // Animate showing and transforming charts.
  animate?: boolean;
  // Pass an instance of an id generator if this is a part of a larger.
  idGenerator?: { getId: (id: string) => string };
  // Called when [+] or [-] buttons are clicked to expand or collapse parts of
  // the chart.
  expanderCallback?: (id: string, direction: ExpanderDirection) => void;
  // [Beta] Show [+]/[-] controls that expand/collapse parts of the chart.
  expanders?: boolean;
  // [Beta] Set of nodes that have the family direction collapsed.
  collapsedFamily?: Set<string>;
  // [Beta] Set of nodes that have the individual direction collapsed.
  collapsedIndi?: Set<string>;
  // [Beta] Set of nodes that have the spouse direction collapsed.
  collapsedSpouse?: Set<string>;
}
