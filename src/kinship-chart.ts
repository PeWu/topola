import { HierarchyNode } from "d3-hierarchy";
import { KinshipChartRenderer } from "./kinship/renderer";
import { TreeNode } from "./kinship/api";
import { Chart, ChartInfo, ChartOptions } from "./api";
import {
  HierarchyCreator,
  EntryId,
  getRootsCount,
} from "./kinship/hierarchy-creator";

export class KinshipChart implements Chart {
  readonly renderer: KinshipChartRenderer;

  constructor(readonly options: ChartOptions) {
    this.renderer = new KinshipChartRenderer(this.options);
  }

  render(): ChartInfo {
    const hierarchy = HierarchyCreator.createHierarchy(
      this.options.data,
      new EntryId(this.options.startIndi || null, this.options.startFam || null)
    );
    const [upNodes, downNodes] = this.renderer.layOut(
      hierarchy.upRoot,
      hierarchy.downRoot
    );

    upNodes.concat(downNodes).forEach((node) => {
      this.setChildNodesGenerationNumber(node);
    });

    return this.renderer.render(
      upNodes,
      downNodes,
      getRootsCount(hierarchy.upRoot, this.options.data)
    );
  }

  private setChildNodesGenerationNumber(node: HierarchyNode<TreeNode>) {
    const childNodes = this.getChildNodesByType(node);
    const setGenerationNumber = (
      childNodes: Array<HierarchyNode<TreeNode>>,
      value: number
    ) =>
      childNodes.forEach(
        (n) => (n.data.generation = node.data.generation! + value)
      );

    setGenerationNumber(childNodes.indiParents, -1);
    setGenerationNumber(childNodes.indiSiblings, 0);
    setGenerationNumber(childNodes.spouseParents, -1);
    setGenerationNumber(childNodes.spouseSiblings, 0);
    setGenerationNumber(childNodes.children, 1);
  }

  private getChildNodesByType(
    node: HierarchyNode<TreeNode>
  ): HierarchyTreeNodes {
    if (!node || !node.children) return EMPTY_HIERARCHY_TREE_NODES;
    // Maps id to node object for all children of the input node
    const childNodesById = new Map(
      node.children.map(
        (n) => [n.data.id, n] as [string, HierarchyNode<TreeNode>]
      )
    );
    const nodeToHNode = (n: TreeNode) =>
      childNodesById.get(n.id) as HierarchyNode<TreeNode>;
    const childNodes = node.data.childNodes;
    return {
      indiParents: childNodes.indiParents.map(nodeToHNode),
      indiSiblings: childNodes.indiSiblings.map(nodeToHNode),
      spouseParents: childNodes.spouseParents.map(nodeToHNode),
      spouseSiblings: childNodes.spouseSiblings.map(nodeToHNode),
      children: childNodes.children.map(nodeToHNode),
    };
  }
}

interface HierarchyTreeNodes {
  indiParents: Array<HierarchyNode<TreeNode>>;
  indiSiblings: Array<HierarchyNode<TreeNode>>;
  spouseParents: Array<HierarchyNode<TreeNode>>;
  spouseSiblings: Array<HierarchyNode<TreeNode>>;
  children: Array<HierarchyNode<TreeNode>>;
}
const EMPTY_HIERARCHY_TREE_NODES: HierarchyTreeNodes = {
  indiParents: [],
  indiSiblings: [],
  spouseParents: [],
  spouseSiblings: [],
  children: [],
};
