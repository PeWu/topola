import * as d3 from 'd3';

import {
  Chart,
  ChartInfo,
  ChartOptions,
  FamInfo,
  IndiInfo,
  Renderer,
  RendererOptions,
} from './api';
import {
  FamDetails,
  IndiDetails,
  JsonDataProvider,
  JsonGedcomData,
} from './data';

const DEFAULT_SVG_SELECTOR = 'svg';

export interface ChartType {
  new (options: ChartOptions): Chart;
}

export interface RendererType {
  new (options: RendererOptions<IndiDetails, FamDetails>): Renderer;
}

/** Options when rendering or rerendering a chart. */
export interface RenderOptions {
  // The ID of the root individual or family. Set either startIndi or startFam.
  startIndi?: string;
  startFam?: string;
  // Generation number of the startIndi or startFam. Used when rendering.
  baseGeneration?: number;
}

/** Options when initializing a chart. */
export interface SimpleChartOptions {
  // Data to be rendered.
  json: JsonGedcomData;
  indiUrl?: string;
  famUrl?: string;
  indiCallback?: (id: IndiInfo) => void;
  famCallback?: (id: FamInfo) => void;
  // CSS selector of the SVG tag to draw in. If not provided, the chart will be
  // rendered in the first SVG tag.
  svgSelector?: string;
  chartType: ChartType;
  renderer: RendererType;
  horizontal?: boolean;
  // Animate when transforming chart.
  animate?: boolean;
  // Update the width and height of the selected SVG. Defaults to true.
  updateSvgSize?: boolean;
  locale?: string;
}

function createChartOptions(
  chartOptions: SimpleChartOptions,
  renderOptions: RenderOptions,
  options: { initialRender: boolean }
): ChartOptions {
  const data = new JsonDataProvider(chartOptions.json);
  const indiHrefFunc = chartOptions.indiUrl
    ? (id: string) => chartOptions.indiUrl!.replace('${id}', id)
    : undefined;
  const famHrefFunc = chartOptions.famUrl
    ? (id: string) => chartOptions.famUrl!.replace('${id}', id)
    : undefined;

  // If startIndi nor startFam is provided, select the first indi in the data.
  if (!renderOptions.startIndi && !renderOptions.startFam) {
    renderOptions.startIndi = chartOptions.json.indis[0].id;
  }
  const animate = !options.initialRender && chartOptions.animate;
  return {
    data,
    renderer: new chartOptions.renderer({
      data,
      indiHrefFunc,
      famHrefFunc,
      indiCallback: chartOptions.indiCallback,
      famCallback: chartOptions.famCallback,
      horizontal: chartOptions.horizontal,
      animate,
      locale: chartOptions.locale,
    }),
    startIndi: renderOptions.startIndi,
    startFam: renderOptions.startFam,
    svgSelector: chartOptions.svgSelector || DEFAULT_SVG_SELECTOR,
    horizontal: chartOptions.horizontal,
    baseGeneration: renderOptions.baseGeneration,
    animate,
  };
}

export interface ChartHandle {
  render(data?: RenderOptions): ChartInfo;
}

class SimpleChartHandle implements ChartHandle {
  private initialRender = true;

  constructor(readonly options: SimpleChartOptions) {}

  render(renderOptions: RenderOptions = {}): ChartInfo {
    const chartOptions = createChartOptions(this.options, renderOptions, {
      initialRender: this.initialRender,
    });
    this.initialRender = false;
    const chart = new this.options.chartType(chartOptions);
    const info = chart.render();
    if (this.options.updateSvgSize !== false) {
      d3.select(chartOptions.svgSelector)
        .attr('width', info.size[0])
        .attr('height', info.size[1]);
    }
    return info;
  }
}

export function createChart(options: SimpleChartOptions): ChartHandle {
  return new SimpleChartHandle(options);
}
