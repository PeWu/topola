import * as d3 from 'd3';

import {AncestorChart} from './ancestor-chart';
import {Chart, ChartOptions, DataProvider, Renderer, RendererOptions} from './api';
import {FamDetails, IndiDetails, JsonDataProvider, JsonGedcomData} from './data';
import {DescendantChart} from './descendant-chart';
import {HourglassChart} from './hourglass-chart';


interface ChartType {
  new(options: ChartOptions): Chart;
}


interface RendererType {
  new(options: RendererOptions<IndiDetails, FamDetails>): Renderer;
}


export interface RenderOptions {
  jsonUrl: string;
  startIndi?: string;
  startFam?: string;
  indiUrl?: string;
  famUrl?: string;
  svgSelector?: string;
  chartType: ChartType;
  renderer: RendererType;
  horizontal?: boolean;
}


function createChartOptions(
    json: JsonGedcomData, options: RenderOptions): ChartOptions {
  const data = new JsonDataProvider(json);
  const indiHrefFunc = options.indiUrl ?
      (id: string) => options.indiUrl.replace('${id}', id) :
      undefined;
  const famHrefFunc = options.famUrl ?
      (id: string) => options.famUrl.replace('${id}', id) :
      undefined;
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
  d3.json(options.jsonUrl).then((json) => {
    const chartOptions = createChartOptions(json as JsonGedcomData, options);
    const chart = new options.chartType(chartOptions);
    chart.render();
  });
}
