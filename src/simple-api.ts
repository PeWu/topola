import * as d3 from 'd3';

import {Chart, ChartInfo, ChartOptions, FamInfo, IndiInfo, Renderer, RendererOptions} from './api';
import {FamDetails, IndiDetails, JsonDataProvider, JsonGedcomData} from './data';


export interface ChartType {
  new(options: ChartOptions): Chart;
}


export interface RendererType {
  new(options: RendererOptions<IndiDetails, FamDetails>): Renderer;
}


export interface RenderOptions {
  // Data to be rendered.
  json?: JsonGedcomData;
  // If `jsonUrl` is provided but not `json`, data is loaded from `jsonUrl`
  // first.
  jsonUrl?: string;
  // The ID of the root individual or family. Set either startIndi or startFam.
  startIndi?: string;
  startFam?: string;
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
  // Generation number of the startIndi or startFam. Used when rendering.
  baseGeneration?: number;
}


function createChartOptions(options: RenderOptions): ChartOptions {
  const data = new JsonDataProvider(options.json);
  const indiHrefFunc = options.indiUrl ?
      (id: string) => options.indiUrl.replace('${id}', id) :
      undefined;
  const famHrefFunc = options.famUrl ?
      (id: string) => options.famUrl.replace('${id}', id) :
      undefined;

  // If startIndi nor startFam is provided, select the first indi in the data.
  if (!options.startIndi && !options.startFam) {
    options.startIndi = options.json.indis[0].id;
  }
  return {
    data,
    renderer: new options.renderer({
      data,
      indiHrefFunc,
      famHrefFunc,
      indiCallback: options.indiCallback,
      famCallback: options.famCallback,
      horizontal: options.horizontal,
    }),
    startIndi: options.startIndi,
    startFam: options.startFam,
    svgSelector: options.svgSelector,
    horizontal: options.horizontal,
    baseGeneration: options.baseGeneration,
  };
}


/** A simplified API for rendering a chart based on the given RenderOptions. */
export function renderChart(options: RenderOptions): Promise<ChartInfo> {
  if (!options.json) {
    // First, load the data.
    return d3.json(options.jsonUrl).then((json: JsonGedcomData) => {
      options.json = json;
      return renderChart(options);
    });
  }

  const chartOptions = createChartOptions(options);
  const chart = new options.chartType(chartOptions);
  return Promise.resolve(chart.render());
}
