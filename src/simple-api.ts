import { ChartColors } from '.';
import { select } from 'd3-selection';
import {
  Chart,
  ChartInfo,
  ChartOptions,
  ExpanderDirection,
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
  colors?: ChartColors;
  // Animate when transforming chart.
  animate?: boolean;
  // Update the width and height of the selected SVG. Defaults to true.
  updateSvgSize?: boolean;
  locale?: string;
  // [Beta] Show [+]/[-] controls that expand/collapse parts of the chart.
  expanders?: boolean;
}

function createChartOptions(
  chartOptions: SimpleChartOptions,
  renderOptions: RenderOptions,
  options: { initialRender: boolean },
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
  const renderer = new chartOptions.renderer({
    data,
    indiHrefFunc,
    famHrefFunc,
    indiCallback: chartOptions.indiCallback,
    famCallback: chartOptions.famCallback,
    horizontal: chartOptions.horizontal,
    colors: chartOptions.colors,
    animate,
    locale: chartOptions.locale,
  });

  return {
    data,
    renderer,
    startIndi: renderOptions.startIndi,
    startFam: renderOptions.startFam,
    svgSelector: chartOptions.svgSelector || DEFAULT_SVG_SELECTOR,
    horizontal: chartOptions.horizontal,
    baseGeneration: renderOptions.baseGeneration,
    animate,
    expanders: chartOptions.expanders,
  };
}

export interface ChartHandle {
  render(data?: RenderOptions): ChartInfo;
  setData(json: JsonGedcomData): void;
}

class SimpleChartHandle implements ChartHandle {
  private initialRender = true;

  private readonly collapsedIndi: Set<string> = new Set<string>();
  private readonly collapsedSpouse: Set<string> = new Set<string>();
  private readonly collapsedFamily: Set<string> = new Set<string>();
  private chartOptions: ChartOptions;

  constructor(readonly options: SimpleChartOptions) {}

  render(renderOptions: RenderOptions = {}): ChartInfo {
    this.chartOptions = createChartOptions(this.options, renderOptions, {
      initialRender: this.initialRender,
    });
    this.chartOptions.collapsedFamily = this.collapsedFamily;
    this.chartOptions.collapsedIndi = this.collapsedIndi;
    this.chartOptions.collapsedSpouse = this.collapsedSpouse;
    this.chartOptions.expanderCallback = (id, direction) =>
      this.expanderCallback(id, direction, renderOptions);

    this.initialRender = false;

    const chart = new this.options.chartType(this.chartOptions);
    const info = chart.render();
    if (this.options.updateSvgSize !== false) {
      select(this.chartOptions.svgSelector)
        .attr('width', info.size[0])
        .attr('height', info.size[1]);
    }
    return info;
  }

  expanderCallback(
    id: string,
    direction: ExpanderDirection,
    renderOptions: RenderOptions,
  ) {
    const set =
      direction === ExpanderDirection.FAMILY
        ? this.collapsedFamily
        : direction === ExpanderDirection.INDI
          ? this.collapsedIndi
          : this.collapsedSpouse;
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.render(renderOptions);
  }

  /**
   * Updates the chart input data.
   * This is useful when the data is dynamically loaded and a different subset
   * of data will be displayed.
   */
  setData(json: JsonGedcomData) {
    this.options.json = json;
  }
}

export function createChart(options: SimpleChartOptions): ChartHandle {
  return new SimpleChartHandle(options);
}
