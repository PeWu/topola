import * as d3 from 'd3';
import { Chart, ChartInfo, ChartOptions, DataProvider, Indi, Fam } from './api';
import { TreeNode } from './kinship/api';
import {
  HierarchyCreator,
  EntryId,
  getRootsCount,
} from './kinship/hierarchy-creator';
import { KinshipChartRenderer } from './kinship/renderer';

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

    upNodes.concat(downNodes).forEach(node => {
      this.setChildNodesGenerationNumber(node);
    });

    return this.renderer.render(
      upNodes,
      downNodes,
      getRootsCount(hierarchy.upRoot, this.options.data)
    );
  }

  private setChildNodesGenerationNumber(node: d3.HierarchyNode<TreeNode>) {
    const childNodes = this.getChildNodesByType(node);
    const setGenerationNumber = (
      childNodes: Array<d3.HierarchyNode<TreeNode>>,
      value: number
    ) =>
      childNodes.forEach(
        n => (n.data.generation = node.data.generation! + value)
      );

    setGenerationNumber(childNodes.indiParents, -1);
    setGenerationNumber(childNodes.indiSiblings, 0);
    setGenerationNumber(childNodes.spouseParents, -1);
    setGenerationNumber(childNodes.spouseSiblings, 0);
    setGenerationNumber(childNodes.children, 1);
  }

  private getChildNodesByType(
    node: d3.HierarchyNode<TreeNode>
  ): HierarchyTreeNodes {
    if (!node || !node.children) return EMPTY_HIERARCHY_TREE_NODES;
    // Maps id to node object for all children of the input node
    const childNodesById = new Map(
      node.children.map(
        n => [n.data.id, n] as [string, d3.HierarchyNode<TreeNode>]
      )
    );
    const nodeToHNode = (n: TreeNode) =>
      childNodesById.get(n.id) as d3.HierarchyNode<TreeNode>;
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
  indiParents: Array<d3.HierarchyNode<TreeNode>>;
  indiSiblings: Array<d3.HierarchyNode<TreeNode>>;
  spouseParents: Array<d3.HierarchyNode<TreeNode>>;
  spouseSiblings: Array<d3.HierarchyNode<TreeNode>>;
  children: Array<d3.HierarchyNode<TreeNode>>;
}
const EMPTY_HIERARCHY_TREE_NODES: HierarchyTreeNodes = {
  indiParents: [],
  indiSiblings: [],
  spouseParents: [],
  spouseSiblings: [],
  children: [],
};
