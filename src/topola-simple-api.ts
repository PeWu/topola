import * as d3 from 'd3';

import {AncestorChart, ChartOptions, DescendantChart, HourglassChart} from './topola-chart';
import {JsonDataProvider, JsonGedcomData} from './topola-data';
import {SimpleRenderer} from './topola-render';


export interface RenderOptions {
  jsonUrl: string;
  startIndi?: string;
  startFam?: string;
  indiUrl?: string;
  svgSelector?: string;
}


function createChartOptions(
    json: JsonGedcomData, options: RenderOptions): ChartOptions {
  const data = new JsonDataProvider(json);
  const indiUrlFunction = options.indiUrl ?
      (id: string) => options.indiUrl.replace('${id}', id) :
      undefined;
  return {
    data,
    renderer: new SimpleRenderer(data, indiUrlFunction),
    startIndi: options.startIndi,
    startFam: options.startFam,
    svgSelector: options.svgSelector,
  };
}


/** A simplified API for rendering data based on the given RenderOptions. */
export function renderAncestors(options: RenderOptions): void {
  d3.json(options.jsonUrl).then((json) => {
    const chartOptions = createChartOptions(json as JsonGedcomData, options);
    const chart = new AncestorChart(chartOptions);
    chart.render();
  });
}


/** A simplified API for rendering data based on the given RenderOptions. */
export function renderDescendants(options: RenderOptions): void {
  d3.json(options.jsonUrl).then((json) => {
    const chartOptions = createChartOptions(json as JsonGedcomData, options);
    const chart = new DescendantChart(chartOptions);
    chart.render();
  });
}


/** A simplified API for rendering data based on the given RenderOptions. */
export function renderHourglass(options: RenderOptions): void {
  d3.json(options.jsonUrl).then((json) => {
    const chartOptions = createChartOptions(json as JsonGedcomData, options);
    const chart = new HourglassChart(chartOptions);
    chart.render();
  });
}
