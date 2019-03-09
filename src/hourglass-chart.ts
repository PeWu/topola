import {AncestorChart} from './ancestor-chart';
import {Chart, ChartInfo, ChartOptions, Fam, Indi} from './api';
import {ChartUtil} from './chart-util';
import {DescendantChart, removeDummyNode} from './descendant-chart';


/**
 * Renders an hourglass chart. It consists of an ancestor chart and
 * a descendant chart for a family.
 */
export class HourglassChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

  getFamilies(indiId: string) {
    return this.options.data.getIndi(this.options.startIndi)
        .getFamiliesAsSpouse();
  }

  render(): ChartInfo {
    const ancestorChartOptions = {...this.options};

    const startIndiFamilies =
        this.options.startIndi && this.getFamilies(this.options.startIndi) ||
        [];
    // If the start individual is set and this person has at least one spouse,
    // start with the family instead.
    if (startIndiFamilies.length) {
      ancestorChartOptions.startFam = startIndiFamilies[0];
      ancestorChartOptions.startIndi = undefined;

      const fam = this.options.data.getFam(startIndiFamilies[0]);
      if (fam.getMother() === this.options.startIndi) {
        ancestorChartOptions.swapStartSpouses = true;
      }
    }

    const ancestors = new AncestorChart(ancestorChartOptions);
    const ancestorsRoot = ancestors.createHierarchy();
    // Remove spouse's ancestors if there are multiple spouses
    // to avoid showing ancestors of just one spouse.
    if (startIndiFamilies.length > 1 && ancestorsRoot.children &&
        ancestorsRoot.children.length > 1) {
      ancestorsRoot.children.pop();
    }
    const ancestorNodes = this.util.layOutChart(ancestorsRoot, true);

    const descendants = new DescendantChart(this.options);
    const descendantsRoot = descendants.createHierarchy();
    const descendantNodes =
        removeDummyNode(this.util.layOutChart(descendantsRoot));

    // slice(1) removes the duplicated start node.
    const nodes = ancestorNodes.slice(1).concat(descendantNodes);
    this.util.renderChart(nodes);

    const info = this.util.getChartInfo(nodes);
    this.util.updateSvgDimensions(info);
    return info;
  }
}
