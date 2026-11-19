// Ambient type definitions for d3-flextree scoped to src/core/.
declare module 'd3-flextree' {
  import type { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';

  export interface FlexTreeLayout<Datum> {
    (root: HierarchyNode<Datum>): HierarchyPointNode<Datum>;
    nodeSize(size: (node: HierarchyPointNode<Datum>) => [number, number]): this;
    spacing(
      separation: (
        a: HierarchyPointNode<Datum>,
        b: HierarchyPointNode<Datum>,
      ) => number,
    ): this;
  }

  export function flextree<Datum>(): FlexTreeLayout<Datum>;
}
