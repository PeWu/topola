import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {Chart, ChartOptions, DataProvider, Fam, Indi, Renderer, TreeIndi, TreeNode} from './api';
import {ChartUtil} from './chart-util';


/** Returns the spouse of the given individual in the given family. */
function getSpouse(indiId: string, fam: Fam): string {
  if (fam.getFather() === indiId) {
    return fam.getMother();
  }
  return fam.getFather();
}


/** Renders a descendants chart. */
export class DescendantChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

  private getNodes(id: string): TreeNode[] {
    const indi = this.options.data.getIndi(id);
    const famIds = indi.getFamiliesAsSpouse();
    if (!famIds.length) {
      // Single person.
      return [{
        id,
        indi: {
          id,
        }
      }];
    }
    // Marriages.
    return famIds.map((famId) => {
      const entry: TreeNode = {
        id: famId,
        indi: {
          id,
        },
        family: {
          id: famId,
        }
      };
      const fam = this.options.data.getFam(famId);
      const spouse = getSpouse(id, fam);
      if (spouse) {
        entry.spouse = {id: spouse};
      }
      return entry;
    });
  }

  private getFamNode(famId: string): TreeNode {
    const node: TreeNode = {id: famId, family: {id: famId}};
    const fam = this.options.data.getFam(famId);
    const father = fam.getFather();
    if (father) {
      node.indi = {id: father};
    }
    const mother = fam.getMother();
    if (mother) {
      node.spouse = {id: mother};
    }
    return node;
  }

  /** Creates a d3 hierarchy from the input data. */
  createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];

    const nodes = this.options.startIndi ?
        this.getNodes(this.options.startIndi) :
        [this.getFamNode(this.options.startFam)];

    parents.push(...nodes);

    const stack: TreeNode[] = [];
    nodes.forEach((node) => {
      if (node.family) {
        stack.push(node);
      }
    });
    while (stack.length) {
      const entry = stack.pop();
      const fam = this.options.data.getFam(entry.family.id);
      const children = fam.getChildren();
      children.forEach((childId) => {
        const childNodes = this.getNodes(childId);
        childNodes.forEach((node) => {
          node.parentId = entry.id;
          if (node.family) {
            // Assign random ID to the node so that parts of the tree can be
            // repeated.
            // TODO: Figure out how to make stable IDs for animations.
            node.id = `${Math.random()}`;
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
  render(): void {
    const root = this.createHierarchy();
    const nodes = this.util.renderChart(root);
    this.util.updateSvgDimensions(nodes);
  }
}
