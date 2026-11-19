import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedBundleCode: string | null = null;
let cachedFontCss: string | null = null;

async function getTopola4Bundle(): Promise<string> {
  if (cachedBundleCode) return cachedBundleCode;
  const repoRoot = path.resolve(__dirname, '..');
  const buildResult = await esbuild.build({
    stdin: {
      contents: `
        export * from './src/core/index.ts';
        export * from './src/toolkit/index.ts';
        export * from './src/model/index.ts';
        export * from './src/presets/index.ts';
        export * from './src/gedcom/index.ts';
      `,
      resolveDir: repoRoot,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'topola4',
  });
  cachedBundleCode = buildResult.outputFiles[0]!.text;
  return cachedBundleCode;
}

function getInlinedFontFaceCss(): string {
  if (cachedFontCss) return cachedFontCss;
  const regBase64 = fs
    .readFileSync(path.join(__dirname, 'Montserrat-Regular.woff2'))
    .toString('base64');
  const boldBase64 = fs
    .readFileSync(path.join(__dirname, 'Montserrat-Bold.woff2'))
    .toString('base64');

  cachedFontCss = `
@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 400;
  src: url('data:font/woff2;base64,${regBase64}') format('woff2');
}
@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: 700;
  src: url('data:font/woff2;base64,${boldBase64}') format('woff2');
}
`;
  return cachedFontCss;
}

// Tiny 1x1 PNG data URL for deterministic offline portrait testing
const SAMPLE_PORTRAIT_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.describe('Browser contracts (Stage 2 getBBox containment & standalone SVG fidelity)', () => {
  for (const preset of ['simple', 'detailed', 'circle', 'fancy'] as const) {
    const directions = preset === 'fancy' ? (['up'] as const) : (['down', 'right'] as const);
    for (const direction of directions) {
      test(`${preset} (${direction}): getBBox fits declared bounds/regions and standalone SVG renders pixel-identically`, async ({
        page,
      }) => {
        const bundle = await getTopola4Bundle();
        const fontCss = getInlinedFontFaceCss();

        await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    ${fontCss}
  </style>
</head>
<body>
  <svg id="chart" xmlns="http://www.w3.org/2000/svg"></svg>
  <script>${bundle}</script>
</body>
</html>`);

        await page.evaluate(async () => {
          await Promise.all([
            document.fonts.load('400 12px Montserrat'),
            document.fonts.load('700 12px Montserrat'),
          ]);
          await document.fonts.ready;
        });

        const checkResult = await page.evaluate(
          ({ presetName, dir, fontFaceCss, portraitUrl }) => {
            const t4 = (window as unknown as { topola4: Record<string, any> })
              .topola4;

            const data = {
              indis: [
                {
                  id: 'I1',
                  firstName: 'Aleksander',
                  lastName: 'Kowalski',
                  maidenName: 'Nowak',
                  sex: 'M',
                  famc: 'F_PAR',
                  fams: ['F1'],
                  birth: {
                    date: { day: 14, month: 7, year: 1888 },
                    place: 'Warszawa, Mazowieckie',
                    confidence: 1,
                  },
                  death: {
                    date: { day: 3, month: 11, year: 1962 },
                    place: 'Kraków',
                  },
                  images: [{ url: portraitUrl }],
                },
                {
                  id: 'I2',
                  firstName: 'Katarzyna',
                  lastName: 'Wiśniewska',
                  sex: 'F',
                  fams: ['F1'],
                  birth: { date: { year: 1892 } },
                },
                {
                  id: 'I3',
                  firstName: 'Stanisław',
                  lastName: 'Kowalski',
                  sex: 'M',
                  famc: 'F1',
                },
                {
                  id: 'I4',
                  firstName: 'Kazimierz',
                  lastName: 'Kowalski',
                  sex: 'M',
                  fams: ['F_PAR'],
                },
                {
                  id: 'I5',
                  firstName: 'Zofia',
                  lastName: 'Dąbrowska',
                  sex: 'F',
                  fams: ['F_PAR'],
                },
              ],
              fams: [
                {
                  id: 'F_PAR',
                  husb: 'I4',
                  wife: 'I5',
                  children: ['I1'],
                  marriage: { date: { year: 1880 }, place: 'Poznań' },
                },
                {
                  id: 'F1',
                  husb: 'I1',
                  wife: 'I2',
                  children: ['I3'],
                  marriage: {
                    date: { day: 20, month: 6, year: 1914 },
                    place: 'Warszawa',
                  },
                },
              ],
            };

            const graph = t4.createModelGraph(data);
            const config =
              presetName === 'fancy'
                ? t4.createFancyConfig({
                    model: graph,
                    overrideCss: fontFaceCss,
                  })
                : {
                    graph,
                    chart: 'hourglass',
                    direction: dir,
                    nodePlugin:
                      presetName === 'simple'
                        ? t4.createSimpleNodePlugin({ model: graph })
                        : presetName === 'circle'
                          ? t4.createCircleNodePlugin({ model: graph })
                          : t4.createDetailedNodePlugin({
                              model: graph,
                              locale: 'en',
                            }),
                    overrideCss: fontFaceCss,
                  };

            const chart = t4.createChart({
              svg: '#chart',
              config,
            });

            const { layout } = chart.update({ startIndi: 'I1' });

            const violations: string[] = [];
            const TOLERANCE_PX = 2.5; // stroke-width / subpixel anti-alias tolerance

            for (const node of layout.nodes) {
              const gNode = document.querySelector(
                `g.node[data-node-id="${node.id}"]`,
              ) as SVGGraphicsElement | null;
              if (!gNode) {
                violations.push(`Missing DOM g.node for "${node.id}"`);
                continue;
              }
              const bbox = gNode.getBBox();
              if (
                bbox.x < node.bounds.x - TOLERANCE_PX ||
                bbox.y < node.bounds.y - TOLERANCE_PX ||
                bbox.x + bbox.width >
                  node.bounds.x + node.bounds.width + TOLERANCE_PX ||
                bbox.y + bbox.height >
                  node.bounds.y + node.bounds.height + TOLERANCE_PX
              ) {
                violations.push(
                  `Node "${node.id}" getBBox [${bbox.x.toFixed(1)}, ${bbox.y.toFixed(1)}, ${bbox.width.toFixed(1)}, ${bbox.height.toFixed(1)}] overflows Stage 2 bounds [${node.bounds.x}, ${node.bounds.y}, ${node.bounds.width}, ${node.bounds.height}]`,
                );
              }

              // Also check each text element inside marked person/family sub-regions
              const regionEls = Array.from(
                gNode.querySelectorAll('.person-region, .family-region'),
              ) as SVGGraphicsElement[];
              for (let rIdx = 0; rIdx < regionEls.length; rIdx++) {
                const rEl = regionEls[rIdx]!;
                const declared = node.regions[rIdx];
                if (!declared) continue;
                const rBox = rEl.getBBox();
                if (
                  rBox.width > declared.width + TOLERANCE_PX ||
                  rBox.height > declared.height + TOLERANCE_PX
                ) {
                  violations.push(
                    `Node "${node.id}" region[${rIdx}] (${declared.id}) getBBox ${rBox.width.toFixed(1)}x${rBox.height.toFixed(1)} overflows declared ${declared.width}x${declared.height}`,
                  );
                }
              }
            }

            const svgEl = document.getElementById('chart')!;
            const serializedSvg = new XMLSerializer().serializeToString(svgEl);
            return { violations, serializedSvg };
          },
          {
            presetName: preset,
            dir: direction,
            fontFaceCss: fontCss,
            portraitUrl: SAMPLE_PORTRAIT_DATA_URL,
          },
        );

        expect(checkResult.violations).toEqual([]);

        const liveScreenshot = await page.locator('#chart').screenshot();

        // Render ONLY the serialized standalone <svg> in a completely isolated blank page
        // with NO external stylesheets or scripts!
        await page.setContent(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>html, body { margin: 0; padding: 0; background: #ffffff; }</style></head>
<body>${checkResult.serializedSvg}</body>
</html>`);
        await page.evaluate(async () => {
          await Promise.all([
            document.fonts.load('400 12px Montserrat'),
            document.fonts.load('700 12px Montserrat'),
          ]);
          await document.fonts.ready;
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        });

        const standaloneScreenshot = await page.locator('#chart').screenshot();
        expect(standaloneScreenshot.equals(liveScreenshot)).toBe(true);
      });
    }
  }

  test('colored-frame, colored-name, and QUAY schemes survive standalone SVG export and opaque underlay hides links behind faded boxes', async ({
    page,
  }) => {
    const bundle = await getTopola4Bundle();
    const fontCss = getInlinedFontFaceCss();

    for (const colorTarget of ['background', 'frame', 'name'] as const) {
      await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    ${fontCss}
  </style>
</head>
<body>
  <svg id="chart" xmlns="http://www.w3.org/2000/svg"></svg>
  <script>${bundle}</script>
</body>
</html>`);

      await page.evaluate(async () => {
        await Promise.all([
          document.fonts.load('400 12px Montserrat'),
          document.fonts.load('700 12px Montserrat'),
        ]);
        await document.fonts.ready;
      });

      const { serializedSvg, underlayOpaque } = await page.evaluate(
        ({ targetMode, fontFaceCss }) => {
          const t4 = (window as unknown as { topola4: Record<string, any> })
            .topola4;
          const data = {
            indis: [
              {
                id: 'I1',
                firstName: 'Jan',
                lastName: 'Kowalski',
                sex: 'M',
                famc: 'F1',
                confidence: 0,
                parentLinkConfidence: 0,
              },
              {
                id: 'I2',
                firstName: 'Piotr',
                lastName: 'Kowalski',
                sex: 'M',
                fams: ['F1'],
                confidence: 0,
              },
              {
                id: 'I3',
                firstName: 'Anna',
                lastName: 'Nowak',
                sex: 'F',
                fams: ['F1'],
                confidence: 1,
              },
            ],
            fams: [
              {
                id: 'F1',
                husb: 'I2',
                wife: 'I3',
                children: ['I1'],
                marriage: { date: { year: 1899 }, confidence: 0 },
              },
            ],
          };

          const graph = t4.createModelGraph(data);
          const chart = t4.createChart({
            svg: '#chart',
            config: {
              graph,
              chart: 'hourglass',
              nodePlugin: t4.createDetailedNodePlugin({ model: graph }),
              schemes: [t4.sexScheme(graph), t4.quayScheme(graph)],
              theme: { colorTarget: targetMode },
              overrideCss: fontFaceCss,
            },
          });
          chart.update({ startIndi: 'I1' });

          const underlayEl = document.querySelector('rect.underlay')!;
          const comp = window.getComputedStyle(underlayEl);
          const isOpaqueWhite =
            comp.fill === 'rgb(255, 255, 255)' &&
            (comp.fillOpacity === '1' || comp.fillOpacity === '');

          const serialized = new XMLSerializer().serializeToString(
            document.getElementById('chart')!,
          );
          return {
            serializedSvg: serialized,
            underlayOpaque: isOpaqueWhite,
          };
        },
        { targetMode: colorTarget, fontFaceCss: fontCss },
      );

      expect(underlayOpaque).toBe(true);
      const livePng = await page.locator('#chart').screenshot();

      await page.setContent(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>html, body { margin: 0; padding: 0; background: #ffffff; }</style></head>
<body>${serializedSvg}</body>
</html>`);
      await page.evaluate(async () => {
        await Promise.all([
          document.fonts.load('400 12px Montserrat'),
          document.fonts.load('700 12px Montserrat'),
        ]);
        await document.fonts.ready;
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
      });

      const standalonePng = await page.locator('#chart').screenshot();
      expect(standalonePng.equals(livePng)).toBe(true);
    }
  });
});
