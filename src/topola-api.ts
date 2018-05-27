/** Represents a node in the d3 graph structure. */
export interface Node {
  id: string;
  parentId?: string;
  width?: number;
  height?: number;
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


/** Interface for rendering data. */
export interface Renderer {
  getPreferredSize(id: string): [number, number];
  render(selection: d3.Selection<
         d3.BaseType, d3.HierarchyPointNode<Node>, d3.BaseType, {}>): void;
}
