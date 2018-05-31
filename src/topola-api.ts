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
  family?: {id: string;};
  // If true, the links to children of this family will be attached to
  // the spouse box of the child node.
  parentsOfSpouse?: boolean;
}


/**
 * Interface for an individual.
 * This interface is only used in the context of creating the layout.
 */
export interface Indi {
  getFamiliesAsSpouse(): string[];
  getFamilyAsChild(): string|null;
  getId(): string;
}


/**
 * Interface for a family.
 * This interface is only used in the context of creating the layout.
 */
export interface Fam {
  getFather(): string|null;
  getMother(): string|null;
  getId(): string;
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
  getPreferredSize(id: string): [number, number];
  render(selection: TreeNodeSelection): void;
}
