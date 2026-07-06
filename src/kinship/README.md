# src/kinship

This directory implements the **kinship chart** for the topola genealogy
application. A kinship chart renders a family tree centered around a chosen
"starting" individual or family, expanding upward (ancestors) and downward
(descendants) from that root.

The implementation is split into three phases:

1. **Building the hierarchy** — traverse the genealogical data starting from a
   chosen entry and produce two `d3-hierarchy` trees: one going up (parents,
   siblings, aunts/uncles) and one going down (children).
2. **Filtering** — control which relations are expanded at each step (e.g. only
   expand ancestors from the upward root, only children from the downward root).
3. **Rendering** — lay the two trees out and draw the nodes, inter-node links,
   link stubs (for relations that exist but are not shown), and additional
   marriage connections to an SVG.

## Files

| File | Description |
| --- | --- |
| [src/kinship/api.ts](src/kinship/api.ts) | Defines the shared data model for the kinship chart: the `TreeNode` interface (extends the base `TreeNode` with parent/child links, link stubs, duplicate tracking and link-anchor metadata), the `ChildNodes` container that groups child nodes by relationship type, the `LinkType` enum (`IndiParents`, `IndiSiblings`, `SpouseParents`, `SpouseSiblings`, `Children`), and the `otherSideLinkType` helper that maps a link type to its counterpart on the opposite side of a connection. |
| [src/kinship/hierarchy-creator.ts](src/kinship/hierarchy-creator.ts) | Contains the `HierarchyCreator` class which builds the two hierarchical trees (`upRoot` for ancestors, `downRoot` for descendants) from a starting `EntryId` using a breadth-first traversal. It resolves family/individual records, computes parents, siblings and children, detects duplicate nodes (the same person appearing in multiple places), tracks additional marriages, and generates link stubs. Also defines the `EntryId` class (a tagged union for indi/fam ids), the `Hierarchy` interface, and the `getRootsCount` helper that counts the number of marriages at the root. |
| [src/kinship/hierarchy-filter.ts](src/kinship/hierarchy-filter.ts) | Defines the `HierarchyFilter` class used by `HierarchyCreator` to control which relation types (indi/spouse parents, indi/spouse siblings, children) are expanded for a given node. Provides `allAccepting()` and `allRejecting()` factory methods plus a `modify()` builder for enabling specific relations. |
| [src/kinship/renderer.ts](src/kinship/renderer.ts) | Contains the `KinshipChartRenderer` class that lays out and renders the kinship hierarchy into an SVG using D3. It computes node positions, draws inter-node links (including additional-marriage links), renders link stubs (small circles indicating unexpanded relations), handles collision avoidance between indi/spouse/children link anchors, and produces the final `ChartInfo` (dimensions and bounds). |
