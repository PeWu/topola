import { HierarchyNode } from 'd3-hierarchy';
import { Renderer, TreeNode, TreeNodeSelection } from '../src/api';

export class FakeRenderer implements Renderer {
  constructor() {}

  updateNodes(nodes: Array<HierarchyNode<TreeNode>>) {
    nodes.forEach(node => {
      node.data.height = 10;
      node.data.width = 10;
    });
  }

  getFamilyAnchor(node: TreeNode): [number, number] {
    return [0, 0];
  }

  getIndiAnchor(node: TreeNode): [number, number] {
    return [0, 0];
  }

  getSpouseAnchor(node: TreeNode): [number, number] {
    return [0, 0];
  }

  render(selection: TreeNodeSelection) {}

  getCss() {
    return '';
  }
}
