import {AncestorChart} from './ancestor-chart';
import {Chart, ChartInfo, ChartOptions, Fam, Indi} from './api';
import {ChartUtil} from './chart-util';
import {DescendantChart} from './descendant-chart';


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

  render(): ChartInfo {
    // If the start individual is set and this person has children, start with
    // the family instead.
    if (this.options.startIndi) {
      const indi = this.options.data.getIndi(this.options.startIndi);
      const fams = indi.getFamiliesAsSpouse();
      if (fams.length) {
        this.options.startFam = fams[0];
        this.options.startIndi = undefined;
      }
    }

    const ancestors = new AncestorChart(this.options);
    const ancestorsRoot = ancestors.createHierarchy();
    const ancestorNodes = this.util.layOutChart(ancestorsRoot, true);

    const descendants = new DescendantChart(this.options);
    const descendantsRoot = descendants.createHierarchy();
    const descendantNodes = this.util.layOutChart(descendantsRoot);

    // slice(1) removes the duplicated start node.
    const nodes = ancestorNodes.slice(1).concat(descendantNodes);
    this.util.renderChart(nodes);

    const info = this.util.getChartInfo(nodes);
    this.util.updateSvgDimensions(info);
    return info;
  }
}
