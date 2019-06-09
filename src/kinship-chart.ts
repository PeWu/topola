import * as d3 from 'd3';
import { Chart, ChartInfo, ChartOptions, DataProvider, Indi, Fam } from './api';
import { TreeNode } from './kinship/api';
import { HierarchyCreator, EntryId } from './kinship/hierarchy-creator';
import { KinshipChartRenderer } from './kinship/renderer';


export class KinshipChart implements Chart {
  readonly renderer: KinshipChartRenderer;

  constructor(readonly options: ChartOptions) {
    this.renderer = new KinshipChartRenderer(this.options);
  }

  render(): ChartInfo {
    const hierarchyCreator = new HierarchyCreator(this.options.data, new EntryId(this.options.startIndi, this.options.startFam));
    const [upNodes, downNodes] = this.renderer.layOut(hierarchyCreator.getUpRoot(), hierarchyCreator.getDownRoot());

    upNodes.concat(downNodes).forEach(node => {
      this.setChildNodesGenerationNumber(node);
    });

    return this.renderer.render(upNodes, downNodes, hierarchyCreator.getRootsCount());
  }

  private setChildNodesGenerationNumber(node: d3.HierarchyNode<TreeNode>) {
    const childNodes = this.getChildNodesByType(node);
    const setGenerationNumber = (childNode: d3.HierarchyNode<TreeNode>, value: number) =>
      childNode.data.generation = node.data.generation + value;

    childNodes.indiParents.forEach(n =>    setGenerationNumber(n, -1));
    childNodes.indiSiblings.forEach(n =>   setGenerationNumber(n,  0));
    childNodes.spouseParents.forEach(n =>  setGenerationNumber(n, -1));
    childNodes.spouseSiblings.forEach(n => setGenerationNumber(n,  0));
    childNodes.children.forEach(n =>       setGenerationNumber(n,  1));
  }

  private getChildNodesByType(node: d3.HierarchyNode<TreeNode>): HierarchyTreeNodes {
    if (!node || !node.children) return EMPTY_HIERARCHY_TREE_NODES;
    // Maps id to node object for all children of the input node
    const childNodesById = new Map(node.children.map(n => [n.data.id, n] as [string, d3.HierarchyNode<TreeNode>]));
    const nodeToHNode = (n: TreeNode) => n ? childNodesById.get(n.id) : null;
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