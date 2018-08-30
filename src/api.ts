/** Individual ID with dimensions. */
export interface TreeIndi {
  id: string;
  width?: number;
  height?: number;
}


/** Represents a node in the d3 graph structure. */
export interface TreeNode {
  // Family ID when represents family, or
  // indi ID when represents single individual.
  id: string;
  parentId?: string;

  indi?: TreeIndi;
  spouse?: TreeIndi;
  family?: {id: string; width?: number; height?: number;};

  // Dimensions of the whole tree node for the purpose of laying out.
  width?: number;
  height?: number;

  // The generation number relative to the starting individual where negative
  // numbers are ancestors and positive numbers are descendants.
  generation?: number;

  // If true, the links to children of this family will be attached to
  // the spouse box of the child node.
  parentsOfSpouse?: boolean;

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
  getFamilyAsChild(): string|null;
}


/**
 * Interface for a family.
 * This interface is only used in the context of creating the layout.
 */
export interface Fam {
  getId(): string;
  getFather(): string|null;
  getMother(): string|null;
  getChildren(): string[];
}


/** Data provider backed up by a data structure. */
export interface DataProvider<IndiT extends Indi, FamT extends Fam> {
  getIndi(id: string): IndiT|null;
  getFam(id: string): FamT|null;
}


/** D3 selection containing TreeNode data. */
export type TreeNodeSelection =
    d3.Selection<d3.BaseType, d3.HierarchyPointNode<TreeNode>, d3.BaseType, {}>;


/** Interface for rendering data. */
export interface Renderer {
  getPreferredIndiSize(id: string): [number, number];
  getPreferredFamSize(id: string): [number, number];
  render(selection: TreeNodeSelection): void;
  getCss(): string;
}


export interface RendererOptions<IndiT extends Indi, FamT extends Fam> {
  /** Creates HTTP link based on ID. */
  indiHrefFunc?: (id: string) => string;
  famHrefFunc?: (id: string) => string;
  data: DataProvider<IndiT, FamT>;
  horizontal?: boolean;
}


export interface ChartInfo {
  // Chart size.
  size: [number, number];
  // The coordinates of the start indi or fam.
  origin: [number, number];
}


export interface Chart {
  render(): ChartInfo;
}


export interface ChartOptions {
  // Input data.
  data: DataProvider<Indi, Fam>;
  // Renderer for individual data.
  renderer: Renderer;
  // The ID of the root individual or family. Set either startIndi or startFam.
  startIndi?: string;
  startFam?: string;
  // CSS selector of the SVG tag to draw in. If not provided, the chart will be
  // rendered in the first SVG tag.
  svgSelector?: string;
  horizontal?: boolean;
}
