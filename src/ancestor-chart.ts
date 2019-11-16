import * as d3 from 'd3';

import { Chart, ChartInfo, ChartOptions, Fam, Indi, TreeNode } from './api';
import { ChartUtil, getChartInfo } from './chart-util';
import { IdGenerator } from './id-generator';

export function getAncestorsTree(options: ChartOptions) {
  const ancestorChartOptions = { ...options };

  const startIndiFamilies = options.startIndi
    ? options.data.getIndi(options.startIndi)!.getFamiliesAsSpouse()
    : [];
  // If the start individual is set and this person has at least one spouse,
  // start with the family instead.
  if (startIndiFamilies.length) {
    ancestorChartOptions.startFam = startIndiFamilies[0];
    ancestorChartOptions.startIndi = undefined;

    const fam = options.data.getFam(startIndiFamilies[0])!;
    if (fam.getMother() === options.startIndi) {
      ancestorChartOptions.swapStartSpouses = true;
    }
  }

  const ancestors = new AncestorChart(ancestorChartOptions);
  const ancestorsRoot = ancestors.createHierarchy();
  // Remove spouse's ancestors if there are multiple spouses
  // to avoid showing ancestors of just one spouse.
  if (
    startIndiFamilies.length > 1 &&
    ancestorsRoot.children &&
    ancestorsRoot.children.length > 1
  ) {
    ancestorsRoot.children.pop();
    ancestorsRoot.data.spouseParentNodeId = undefined;
  }
  return ancestorsRoot;
}

/** Renders an ancestors chart. */
export class AncestorChart<IndiT extends Indi, FamT extends Fam>
  implements Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

  /** Creates a d3 hierarchy from the input data. */
  createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];
    const stack: TreeNode[] = [];
    const idGenerator = this.options.idGenerator || new IdGenerator();
    if (this.options.startIndi) {
      const indi = this.options.data.getIndi(this.options.startIndi)!;
      const famc = indi.getFamilyAsChild();
      const id = famc ? idGenerator.getId(famc) : undefined;
      if (famc) {
        stack.push({
          id: famc,
          parentId: this.options.startIndi,
          family: { id: famc },
        });
      }
      parents.push({
        id: this.options.startIndi,
        indi: { id: this.options.startIndi },
        indiParentNodeId: id,
      });
    } else {
      stack.push({
        id: idGenerator.getId(this.options.startFam!),
        family: { id: this.options.startFam! },
      });
    }

    while (stack.length) {
      const entry = stack.pop()!;
      const fam = this.options.data.getFam(entry.family!.id);
      if (!fam) {
        continue;
      }
      const [father, mother] =
        entry.family!.id === this.options.startFam &&
        this.options.swapStartSpouses
          ? [fam.getMother(), fam.getFather()]
          : [fam.getFather(), fam.getMother()];
      if (!father && !mother) {
        continue;
      }
      if (mother) {
        entry.spouse = { id: mother };
        const indi = this.options.data.getIndi(mother)!;
        const famc = indi.getFamilyAsChild();
        if (famc) {
          const id = idGenerator.getId(famc);
          entry.spouseParentNodeId = id;
          stack.push({
            id,
            parentId: entry.id,
            family: { id: famc },
          });
        }
      }
      if (father) {
        entry.indi = { id: father };
        const indi = this.options.data.getIndi(father)!;
        const famc = indi.getFamilyAsChild();
        if (famc) {
          const id = idGenerator.getId(famc);
          entry.indiParentNodeId = id;
          stack.push({
            id,
            parentId: entry.id,
            family: { id: famc },
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
  render(): ChartInfo {
    const root = this.createHierarchy();
    const nodes = this.util.layOutChart(root, { flipVertically: true });
    this.util.renderChart(nodes);

    const info = getChartInfo(nodes);
    this.util.updateSvgDimensions(info);
    return info;
  }
}
