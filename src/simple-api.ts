import * as d3 from 'd3';

import {Chart, ChartOptions, Renderer, RendererOptions} from './api';
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
  startIndi?: string;
  startFam?: string;
  indiUrl?: string;
  famUrl?: string;
  svgSelector?: string;
  chartType: ChartType;
  renderer: RendererType;
  horizontal?: boolean;
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
      horizontal: options.horizontal,
    }),
    startIndi: options.startIndi,
    startFam: options.startFam,
    svgSelector: options.svgSelector,
    horizontal: options.horizontal,
  };
}


/** A simplified API for rendering a chart based on the given RenderOptions. */
export function renderChart(options: RenderOptions): void {
  if (!options.json) {
    // First, load the data.
    d3.json(options.jsonUrl).then((json: JsonGedcomData) => {
      options.json = json;
      renderChart(options);
    });
    return;
  }

  const chartOptions = createChartOptions(options);
  const chart = new options.chartType(chartOptions);
  chart.render();
}
