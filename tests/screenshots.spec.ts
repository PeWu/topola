import { expect, test } from '@playwright/test';

interface ScreenshotScenario {
  name: string;
  dataUrl: string;
  isGedcom: boolean;
  chart?: 'hourglass' | 'relatives';
  preset: 'detailed' | 'simple' | 'circle' | 'fancy';
  direction?: 'down' | 'up' | 'right' | 'left';
  maxAncestorGenerations?: number;
  maxDescendantGenerations?: number;
  scheme?: 'sex' | 'generation' | 'none';
  colorTarget?: 'background' | 'frame' | 'name';
  startIndi?: string;
}

const PORTRAIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90" preserveAspectRatio="xMidYMin slice">
  <rect width="70" height="90" fill="#d9e2ec"/>
  <circle cx="35" cy="30" r="14" fill="#627d98"/>
  <path d="M 12 82 C 12 58 58 58 58 82 Z" fill="#627d98"/>
</svg>`;

const scenarios: ScreenshotScenario[] = [
  {
    name: 'relatives',
    dataUrl: '/demo/data/family.ged',
    isGedcom: true,
    chart: 'relatives',
    preset: 'detailed',
    scheme: 'sex',
  },
  {
    name: 'hourglass',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    chart: 'hourglass',
    preset: 'detailed',
    scheme: 'generation',
    startIndi: 'I9555',
  },
  {
    name: 'ancestors',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    chart: 'hourglass',
    direction: 'right',
    preset: 'detailed',
    scheme: 'none',
    startIndi: 'I46464',
  },
  {
    name: 'descendants',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    chart: 'hourglass',
    direction: 'right',
    maxAncestorGenerations: 0,
    preset: 'simple',
    startIndi: 'I68389',
  },
  {
    name: 'fancy',
    dataUrl: '/demo/data/data.json',
    isGedcom: false,
    preset: 'fancy',
    startIndi: 'I9555',
  },
  {
    name: 'tudor',
    dataUrl: '/demo/data/tudor.json',
    isGedcom: false,
    chart: 'hourglass',
    preset: 'detailed',
    scheme: 'generation',
    startIndi: 'I17',
  },
  {
    name: 'colored-frame',
    dataUrl: '/demo/data/family.ged',
    isGedcom: true,
    chart: 'hourglass',
    preset: 'detailed',
    scheme: 'sex',
    colorTarget: 'frame',
  },
];

test.describe('Topola 4 Screenshot Tests', () => {
  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {
      // Serve deterministic offline portrait SVG for external wikimedia URLs
      await page.route('https://upload.wikimedia.org/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: PORTRAIT_SVG,
        });
      });

      await page.goto('/tests/screenshot-viewer.html');
      await page.waitForFunction(() => Boolean((window as unknown as { topola?: unknown }).topola));

      await page.evaluate(async (sc: ScreenshotScenario) => {
        await Promise.all([
          document.fonts.load('400 12px Montserrat'),
          document.fonts.load('700 12px Montserrat'),
        ]);
        await document.fonts.ready;

        const renderChart = (
          window as unknown as {
            renderChart: (s: ScreenshotScenario) => Promise<void>;
          }
        ).renderChart;
        await renderChart(sc);

        const images = Array.from(document.querySelectorAll('image'));
        await Promise.all(
          images.map((img) => {
            const href = img.getAttribute('href');
            if (!href) return Promise.resolve();
            return new Promise<void>((resolve) => {
              const probe = new Image();
              probe.onload = () => resolve();
              probe.onerror = () => resolve();
              probe.src = href;
            });
          }),
        );
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
      }, scenario);

      const chart = page.locator('#chart');
      await expect(chart).toBeVisible();
      await expect(chart).toHaveScreenshot(`${scenario.name}.png`, {
        maxDiffPixelRatio: 0.02,
        threshold: 0.1,
      });
    });
  }
});
