import * as d3 from 'd3';

import {Chart, DataProvider, Renderer} from './topola-api';
import {ChartOptions} from './topola-chart';
import {FamDetails, IndiDetails, JsonDataProvider, JsonGedcomData} from './topola-data';


interface ChartType {
  new(options: ChartOptions): Chart;
}


interface RendererType {
  new(dataProvider: DataProvider<IndiDetails, FamDetails>,
      hrefFunc?: (id: string) => string): Renderer;
}


export interface RenderOptions {
  jsonUrl: string;
  startIndi?: string;
  startFam?: string;
  indiUrl?: string;
  svgSelector?: string;
  chartType: ChartType;
  renderer: RendererType;
}


function createChartOptions(
    json: JsonGedcomData, options: RenderOptions): ChartOptions {
  const data = new JsonDataProvider(json);
  const indiUrlFunction = options.indiUrl ?
      (id: string) => options.indiUrl.replace('${id}', id) :
      undefined;
  return {
    data,
    renderer: new options.renderer(data, indiUrlFunction),
    startIndi: options.startIndi,
    startFam: options.startFam,
    svgSelector: options.svgSelector,
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
