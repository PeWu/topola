import * as d3 from 'd3';
import { Chart, ChartInfo, ChartOptions, DataProvider, Indi, Fam } from './api';
import { TreeNode } from './kinship/api';
import { HierarchyCreator, EntryId } from './kinship/hierarchy-creator';
import { KinshipChartRenderer } from './kinship/renderer';


export class KinshipChart implements Chart {
  readonly data: DataProvider<Indi, Fam>;
  readonly renderer: KinshipChartRenderer;

  constructor(readonly options: ChartOptions) {
    this.data = options.data;
    this.renderer = new KinshipChartRenderer(this.options);
  }

  render(): ChartInfo {
    const hierarchyCreator = new HierarchyCreator(this.data, new EntryId(this.options.startIndi, this.options.startFam));
    const [upNodes, downNodes] = this.renderer.layOut(hierarchyCreator.getUpRoot(), hierarchyCreator.getDownRoot());

    upNodes.concat(downNodes).forEach(node => {
      this.setChildNodesGenerationNumber(node);
    });

    return this.renderer.render(upNodes, downNodes, hierarchyCreator.getRootsCount());
  }

  private setChildNodesGenerationNumber(node: d3.HierarchyNode<TreeNode>) {
    const [indiParentsNodes, indiSiblingsNodes, spouseParentsNodes,
      spouseSiblingsNodes, childrenNodes] = this.getChildNodesByType(node);
    const setGenerationNumber = (childNode: d3.HierarchyNode<TreeNode>, value: number) =>
      childNode.data.generation = node.data.generation + value;

    indiParentsNodes.forEach(n =>    setGenerationNumber(n, -1));
    indiSiblingsNodes.forEach(n =>   setGenerationNumber(n,  0));
    spouseParentsNodes.forEach(n =>  setGenerationNumber(n, -1));
    spouseSiblingsNodes.forEach(n => setGenerationNumber(n,  0));
    childrenNodes.forEach(n =>       setGenerationNumber(n,  1));
  }

  private getChildNodesByType<N extends d3.HierarchyNode<TreeNode>>(node: N): [N[], N[], N[], N[], N[]] {
    if (!node || !node.children) return [[], [], [], [], []];
    const childNodesById = new Map(node.children.map(n => [n.data.id, n] as [string, N]));
    const nodeToHNode = (n: TreeNode) => n ? childNodesById.get(n.id) : null;
    const childNodes = node.data.childNodes;
    return [
      childNodes.indiParents.map(nodeToHNode),
      childNodes.indiSiblings.map(nodeToHNode),
      childNodes.spouseParents.map(nodeToHNode),
      childNodes.spouseSiblings.map(nodeToHNode),
      childNodes.children.map(nodeToHNode),
    ];
  }
}