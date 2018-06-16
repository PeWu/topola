import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {Chart, ChartOptions, DataProvider, Fam, Indi, Renderer, TreeIndi, TreeNode} from './api';
import {ChartUtil} from './chart-util';


/** Renders an ancestors chart. */
export class AncestorChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

  /** Creates a d3 hierarchy from the input data. */
  createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];
    const stack: TreeNode[] = [];
    if (this.options.startIndi) {
      const indi = this.options.data.getIndi(this.options.startIndi);
      const famc = indi.getFamilyAsChild();
      if (famc) {
        stack.push({
          id: famc,
          parentId: this.options.startIndi,
          family: {id: famc},
        });
      }
      parents.push(
          {id: this.options.startIndi, indi: {id: this.options.startIndi}});
    } else {
      stack.push({
        id: this.options.startFam,
        family: {id: this.options.startFam},
      });
    }
    while (stack.length) {
      const entry = stack.pop();
      const fam = this.options.data.getFam(entry.id);
      if (!fam) {
        continue;
      }
      const father = fam.getFather();
      const mother = fam.getMother();
      if (!father && !mother) {
        continue;
      }
      if (mother) {
        entry.spouse = {id: mother};
        const indi = this.options.data.getIndi(mother);
        const famc = indi.getFamilyAsChild();
        if (famc) {
          stack.push({
            id: famc,
            parentId: entry.id,
            parentsOfSpouse: true,
            family: {id: famc},
          });
        }
      }
      if (father) {
        entry.indi = {id: father};
        const indi = this.options.data.getIndi(father);
        const famc = indi.getFamilyAsChild();
        if (famc) {
          stack.push({
            id: famc,
            parentId: entry.id,
            parentsOfSpouse: false,
            family: {id: famc},
          });
        }
      }
      parents.push(entry);
    }
    return d3.stratify<TreeNode>()(parents);
  }

  /**
   * Renders the tree, calling the provided renderer to draw boxes for
   * individuals.
   */
  render(): void {
    const root = this.createHierarchy();
    const nodes = this.util.renderChart(root, true);
    this.util.updateSvgDimensions(nodes);
  }
}
