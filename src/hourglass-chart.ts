import { getAncestorsTree } from './ancestor-chart';
import { Chart, ChartInfo, ChartOptions, Fam, Indi } from './api';
import { ChartUtil, getChartInfo } from './chart-util';
import { layOutDescendants } from './descendant-chart';

/**
 * Renders an hourglass chart. It consists of an ancestor chart and
 * a descendant chart for a family.
 */
export class HourglassChart<IndiT extends Indi, FamT extends Fam>
  implements Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

  render(): ChartInfo {
    const ancestorsRoot = getAncestorsTree(this.options);
    const ancestorNodes = this.util.layOutChart(ancestorsRoot, {
      flipVertically: true,
    });

    const descendantNodes = layOutDescendants(this.options);

    // slice(1) removes the duplicated start node.
    const nodes = ancestorNodes.slice(1).concat(descendantNodes);
    this.util.renderChart(nodes);

    const info = getChartInfo(nodes);
    this.util.updateSvgDimensions(info);
    return info;
  }
}
