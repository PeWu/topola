import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {AncestorChart} from './ancestor-chart';
import {Chart, ChartOptions, DataProvider, Fam, Indi, Renderer, TreeIndi, TreeNode} from './api';
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

  render(): void {
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
    const ancestorNodes = this.util.renderChart(ancestorsRoot, true);

    const descendants = new DescendantChart(this.options);
    const descendantsRoot = descendants.createHierarchy();
    const descendantNodes = this.util.renderChart(descendantsRoot);

    const nodes = ancestorNodes.concat(descendantNodes);
    this.util.updateSvgDimensions(nodes);
  }
}
