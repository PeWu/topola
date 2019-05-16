import * as d3 from 'd3';

import { Chart, ChartInfo, ChartOptions, Fam, Indi, TreeNode } from './api';
import { ChartUtil, getChartInfo } from './chart-util';
import { IdGenerator } from './id-generator';

const DUMMY_ROOT_NODE_ID = 'DUMMY_ROOT_NODE';

export function layOutDescendants(options: ChartOptions) {
  const descendants = new DescendantChart(options);
  const descendantsRoot = descendants.createHierarchy();
  return removeDummyNode(new ChartUtil(options).layOutChart(descendantsRoot));
}

/** Removes the dummy root node if it was added in createHierarchy(). */
function removeDummyNode(allNodes: Array<d3.HierarchyPointNode<TreeNode>>) {
  if (allNodes[0].id !== DUMMY_ROOT_NODE_ID) {
    return allNodes;
  }
  const nodes = allNodes.slice(1);
  // Move first node to (0, 0) coordinates.
  const dx = -nodes[0].x;
  const dy = -nodes[0].y;
  nodes.forEach(node => {
    if (
      node.parent &&
      node.parent.id === DUMMY_ROOT_NODE_ID &&
      !node.data.additionalMarriage
    ) {
      delete node.parent;
    }
    node.x += dx;
    node.y += dy;
    node.data.generation--;
  });
  return nodes;
}

/** Returns the spouse of the given individual in the given family. */
function getSpouse(indiId: string, fam: Fam): string {
  if (fam.getFather() === indiId) {
    return fam.getMother();
  }
  return fam.getFather();
}

/** Renders a descendants chart. */
export class DescendantChart<IndiT extends Indi, FamT extends Fam>
  implements Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

  private getNodes(id: string): TreeNode[] {
    const indi = this.options.data.getIndi(id);
    const famIds = indi.getFamiliesAsSpouse();
    if (!famIds.length) {
      // Single person.
      return [
        {
          id,
          indi: {
            id,
          },
        },
      ];
    }
    // Marriages.
    const nodes = famIds.map(famId => {
      const entry: TreeNode = {
        id: famId,
        indi: {
          id,
        },
        family: {
          id: famId,
        },
      };
      const fam = this.options.data.getFam(famId);
      const spouse = getSpouse(id, fam);
      if (spouse) {
        entry.spouse = { id: spouse };
      }
      return entry;
    });
    nodes.slice(1).forEach(node => {
      node.additionalMarriage = true;
    });
    return nodes;
  }

  private getFamNode(famId: string): TreeNode {
    const node: TreeNode = { id: famId, family: { id: famId } };
    const fam = this.options.data.getFam(famId);
    const father = fam.getFather();
    if (father) {
      node.indi = { id: father };
    }
    const mother = fam.getMother();
    if (mother) {
      node.spouse = { id: mother };
    }
    return node;
  }

  /** Creates a d3 hierarchy from the input data. */
  createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];

    const nodes = this.options.startIndi
      ? this.getNodes(this.options.startIndi)
      : [this.getFamNode(this.options.startFam)];

    // If there are multiple root nodes, i.e. the start individual has multiple
    // marriages, create a dummy root node.
    // After layout is complete, the dummy node will be removed.
    if (nodes.length > 1) {
      const dummyNode = {
        id: DUMMY_ROOT_NODE_ID,
        height: 1,
        width: 1,
      };
      parents.push(dummyNode);
      nodes.forEach(node => (node.parentId = dummyNode.id));
    }

    parents.push(...nodes);

    const stack: TreeNode[] = [];
    nodes.forEach(node => {
      if (node.family) {
        stack.push(node);
      }
    });
    const idGenerator = new IdGenerator();
    while (stack.length) {
      const entry = stack.pop();
      const fam = this.options.data.getFam(entry.family.id);
      const children = fam.getChildren();
      children.forEach(childId => {
        const childNodes = this.getNodes(childId);
        childNodes.forEach(node => {
          node.parentId = entry.id;
          if (node.family) {
            node.id = `${idGenerator.getId(node.family.id)}`;
            stack.push(node);
          }
        });
        parents.push(...childNodes);
      });
    }
    return d3.stratify<TreeNode>()(parents);
  }

  /**
   * Renders the tree, calling the provided renderer to draw boxes for
   * individuals.
   */
  render(): ChartInfo {
    const root = this.createHierarchy();
    const nodes = removeDummyNode(this.util.layOutChart(root));
    this.util.renderChart(nodes);

    const info = getChartInfo(nodes);
    this.util.updateSvgDimensions(info);
    return info;
  }
}
