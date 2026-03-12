import { test, expect } from '@playwright/test';
import * as topolaLib from '../src/index';
import { SimpleChartOptions } from '../src/index';

interface Scenario {
  name: string;
  dataUrl: string;
  isGedcom: boolean;
  chartOptions: {
    chartType: 'RelativesChart' | 'HourglassChart' | 'DescendantChart' | 'FancyChart' | 'AncestorChart' | 'KinshipChart';
    renderer: 'DetailedRenderer' | 'SimpleRenderer' | 'CircleRenderer';
    colors?: 'COLOR_BY_SEX';
    horizontal?: boolean;
  };
  renderOptions?: {
    startFam?: string;
    startIndi?: string;
  };
}

const scenarios: Scenario[] = [
  {
    name: 'relatives',
    dataUrl: '/demo/data/family.ged',
    isGedcom: true,
    chartOptions: {
      chartType: 'RelativesChart',
      renderer: 'DetailedRenderer',
      colors: 'COLOR_BY_SEX',
    },
  },
  {
    name: 'hourglass',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    chartOptions: {
      chartType: 'HourglassChart',
      renderer: 'DetailedRenderer',
    },
    renderOptions: {
      startFam: 'F3047',
    },
  },
  {
    name: 'ancestors',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    chartOptions: {
      chartType: 'HourglassChart',
      renderer: 'DetailedRenderer',
      horizontal: true,
    },
    renderOptions: {
      startIndi: 'I46464',
    },
  },
  {
    name: 'descendants',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    chartOptions: {
      chartType: 'DescendantChart',
      renderer: 'SimpleRenderer',
      horizontal: true,
    },
    renderOptions: {
      startFam: 'F23172',
    },
  },
  {
    name: 'fancy',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    chartOptions: {
      chartType: 'FancyChart',
      renderer: 'CircleRenderer',
    },
    renderOptions: {
      startFam: 'F4910',
    },
  },
  {
    name: 'tudor',
    dataUrl: '/demo/data/tudor.json',
    isGedcom: false,
    chartOptions: {
      chartType: 'AncestorChart',
      renderer: 'DetailedRenderer',
    },
    renderOptions: {
      startFam: 'F15',
    },
  },
  {
    name: 'kinship',
    dataUrl: '/demo/data/family2.ged',
    isGedcom: true,
    chartOptions: {
      chartType: 'KinshipChart',
      renderer: 'DetailedRenderer',
    },
  },
];

test.describe('Topola Screenshot Tests', () => {
  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {
      // Load the viewer page
      await page.goto('/tests/screenshot-viewer.html');

      // Wait for the library and D3 to be loaded
      await page.waitForFunction(() => (window as any).topola && (window as any).d3);

      // Execute in the browser.
      await page.evaluate(async (scenario: Scenario) => {
        const topola = (window as any).topola as typeof topolaLib;
        const opts = scenario.chartOptions;

        const chartMap = {
          RelativesChart: topola.RelativesChart,
          HourglassChart: topola.HourglassChart,
          DescendantChart: topola.DescendantChart,
          FancyChart: topola.FancyChart,
          AncestorChart: topola.AncestorChart,
          KinshipChart: topola.KinshipChart,
        };
        const chartType = chartMap[opts.chartType];

        const rendererMap = {
          DetailedRenderer: topola.DetailedRenderer,
          SimpleRenderer: topola.SimpleRenderer,
          CircleRenderer: topola.CircleRenderer,
        };
        const renderer = rendererMap[opts.renderer];

        const colorsMap = {
          COLOR_BY_SEX: topola.ChartColors.COLOR_BY_SEX,
        };
        const colors = opts.colors ? colorsMap[opts.colors] : topola.ChartColors.COLOR_BY_GENERATION;

        const chartOptions: Partial<SimpleChartOptions> = {
          chartType,
          renderer,
          colors,
          horizontal: !!opts.horizontal,
        };
        const renderChart = (window as any).renderChart;
        await renderChart({
          dataUrl: scenario.dataUrl,
          isGedcom: scenario.isGedcom,
          chartOptions,
          renderOptions: scenario.renderOptions,
        });

        // Wait for images to load if any.
        const images = Array.from(document.querySelectorAll('image'));
        await Promise.all(images.map(img => {
          if ((img as any).complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }));
      }, scenario);

      // Take a screenshot of the SVG element.
      const chart = page.locator('#chart');
      await expect(chart).toBeVisible();
      await expect(chart).toHaveScreenshot(`${scenario.name}.png`);
    });
  }
});
