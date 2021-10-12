// Data type definitions for the d3-flextree library.
declare module 'd3-flextree' {
  import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';

  export interface FlexTreeLayout<Datum> {
    (root: HierarchyNode<Datum>): HierarchyPointNode<Datum>;
    nodeSize(size: (node: HierarchyPointNode<Datum>) => [number, number]): this;
    spacing(
      separation: (
        a: HierarchyPointNode<Datum>,
        b: HierarchyPointNode<Datum>
      ) => number
    ): this;
  }

  export function flextree<Datum>(): FlexTreeLayout<Datum>;
}
