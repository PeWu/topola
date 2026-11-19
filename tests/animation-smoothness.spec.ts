/**
 * Animation smoothness tests.
 *
 * A chart is driven by clicks (scripted or random) while the animation is
 * stepped one frame at a time on a virtual clock. After every frame the
 * position, size and opacity of every person box, family box, link and
 * expander is compared with the frame before. Nothing may jump.
 *
 * A second, non-animated chart (the "twin") receives the same clicks. It shows
 * at once where everything is heading, which gives the allowed speed of every
 * element and the state the animation has to end in.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import * as esbuild from 'esbuild';
import {
  createRng,
  generateFamily,
  type GeneratorParams,
} from './oracle/family-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Every test opens a page of its own, so they can run side by side.
test.describe.configure({ mode: 'parallel' });

/** One animation frame. */
const FRAME_MS = 16;
/** A whole animation (200 ms + 500 ms + 200 ms) and a bit. */
const ANIMATION_MS = 960;

/**
 * Known issue: in the Circle look the two halves of a couple swap at once when
 * the spouse of the selected person is selected. Pinned down by the test
 * "circle spouse swap"; random walks do not use circles because of it.
 */
const KNOWN_ISSUE_CIRCLE_SWAP = true;

type Preset = 'detailed' | 'simple' | 'circle';
type ChartKind = 'hourglass' | 'relatives';
type Direction = 'down' | 'up' | 'right' | 'left';

interface HarnessOptions {
  data: unknown;
  startIndi: string;
  preset: Preset;
  chart: ChartKind;
  direction: Direction;
  /** Seed of the random choices made in the page. */
  seed: number;
  /**
   * Time between two checked frames. 16 ms by default; large charts use
   * longer steps to keep the test fast, at the price of looser limits.
   */
  frameMs?: number;
}

type Action =
  | { type: 'person'; id: string }
  | { type: 'expander'; key: string }
  | { type: 'random' };

interface Step {
  action: Action;
  /**
   * Frames to run before the next step. By default the animation runs to its
   * end; fewer frames mean that the next step interrupts it.
   */
  frames?: number;
}

interface Violation {
  /** Index of the step (0-based) and what it did. */
  step: number;
  action: string;
  frame: number;
  kind: string;
  key: string;
  detail: string;
}

interface Report {
  actions: string[];
  counts: Record<string, number>;
  violations: Violation[];
}

let cachedBundle: string | null = null;

async function getBundle(): Promise<string> {
  if (cachedBundle) return cachedBundle;
  const result = await esbuild.build({
    stdin: {
      contents: `
        export * from './src/core/index.ts';
        export * from './src/model/index.ts';
        export * from './src/presets/index.ts';
      `,
      resolveDir: path.resolve(__dirname, '..'),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'topola4',
  });
  cachedBundle = result.outputFiles[0]!.text;
  return cachedBundle;
}

function fontFaceCss(): string {
  const face = (file: string, weight: number) => `
@font-face {
  font-family: 'Montserrat';
  font-style: normal;
  font-weight: ${weight};
  src: url('data:font/woff2;base64,${fs
    .readFileSync(path.join(__dirname, file))
    .toString('base64')}') format('woff2');
}`;
  return (
    face('Montserrat-Regular.woff2', 400) + face('Montserrat-Bold.woff2', 700)
  );
}

/**
 * Runs in the page. Creates the animated chart and its twin and installs
 * `window.smooth`, which performs clicks and checks frames.
 */
function installHarness(options: HarnessOptions): void {
  const frameMs = options.frameMs ?? 16;
  // How far an element may move in one frame, as a fraction of its whole
  // journey. The easing of the chart (cubic in-out over 500 ms) peaks at 3
  // times its average speed, which is 0.096 per 16 ms frame; the rest is slack.
  const MOVE_RATE = ((3 * frameMs) / 500) * 1.3;
  // Tolerance in pixels for rounding.
  const MOVE_EPS = 1;
  // How far opacity may change in one frame: fades take 200 ms, so the peak is
  // 0.24 per 16 ms frame.
  const OPACITY_STEP = Math.min(0.9, ((3 * frameMs) / 200) * 1.3 + 0.02);
  // Below this opacity an element counts as invisible.
  const INVISIBLE = 0.05;
  // Tolerance in pixels when comparing the final state with the twin.
  const END_EPS = 0.5;
  const MAX_VIOLATIONS = 60;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (window as any).topola4;
  const animatedSvg = document.getElementById('chart') as unknown as SVGElement;
  const twinSvg = document.getElementById('twin') as unknown as SVGElement;
  const graph = t.createModelGraph(options.data);

  // Mulberry32, so that a walk can be replayed from its seed.
  let rngState = options.seed >>> 0;
  const rng = () => {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let x = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  // Boxes are replaced when a node is redrawn, so they are tracked by the
  // person or family they show, not by DOM element.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagged = (plugin: any) => ({
    defaultTheme: plugin.defaultTheme,
    getCss: plugin.getCss?.bind(plugin),
    sizeNodes: plugin.sizeNodes.bind(plugin),
    resizeNode: plugin.resizeNode?.bind(plugin),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawNode(group: SVGGElement, node: any, ctx: any) {
      plugin.drawNode(group, node, {
        ...ctx,
        helpers: {
          ...ctx.helpers,
          markPerson(el: SVGElement, id: string) {
            el.setAttribute('data-smooth', `person:${node.id}:${id}`);
            ctx.helpers.markPerson(el, id);
          },
          markFamily(el: SVGElement, id: string) {
            el.setAttribute('data-smooth', `family:${node.id}:${id}`);
            ctx.helpers.markFamily(el, id);
          },
        },
      });
    },
  });
  const nodePlugin = () =>
    tagged(
      options.preset === 'detailed'
        ? t.createDetailedNodePlugin({ model: graph })
        : options.preset === 'simple'
          ? t.createSimpleNodePlugin({ model: graph })
          : t.createCircleNodePlugin({ model: graph }),
    );

  // The host state, handled the way a host application would.
  const state = {
    startIndi: options.startIndi,
    baseGeneration: 0,
    collapsed: new Set<string>(),
  };
  let updates = 0;
  let finishedUpdate = 0;
  const apply = () => {
    const viewState = () => ({
      startIndi: state.startIndi,
      baseGeneration: state.baseGeneration,
      collapsed: new Set(state.collapsed),
    });
    const update = ++updates;
    animated.update(viewState()).finished.then(() => {
      finishedUpdate = Math.max(finishedUpdate, update);
    });
    twin.update(viewState());
  };
  const config = (animate: boolean) => ({
    graph,
    chart: options.chart,
    direction: options.direction,
    expanders: true,
    animate,
    nodePlugin: nodePlugin(),
    schemes: [t.generationScheme()],
    onPersonClick: (info: { id: string; generation: number }) => {
      state.startIndi = info.id;
      state.baseGeneration = info.generation;
      state.collapsed.clear();
      apply();
    },
    onExpanderClick: (info: { nodeId: string; slot: string }) => {
      const key = `${info.nodeId}:${info.slot}`;
      if (!state.collapsed.delete(key)) {
        state.collapsed.add(key);
      }
      apply();
    },
  });
  const animated = t.createChart({ svg: animatedSvg, config: config(true) });
  const twin = t.createChart({ svg: twinSvg, config: config(false) });
  apply();

  interface Sample {
    /** Box: x, y, width, height. Link: the points of its path. */
    v: number[];
    opacity: number;
    box: boolean;
  }
  type Frame = Map<string, Sample>;

  const opacityOf = (el: Element | null): number => {
    const value = (el as SVGElement | null)?.style.opacity ?? '';
    return value === '' ? 1 : parseFloat(value);
  };

  /** Reads where everything is, relative to the top-left corner of the SVG. */
  const sample = (svg: SVGElement): Frame => {
    const origin = svg.getBoundingClientRect();
    const frame: Frame = new Map();
    const add = (key: string, s: Sample) => {
      // The same key twice means a leftover copy; keep both so it shows up.
      let unique = key;
      for (let n = 2; frame.has(unique); n++) {
        unique = `${key}#${n}`;
      }
      frame.set(unique, s);
    };
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return [r.x - origin.x, r.y - origin.y, r.width, r.height];
    };
    for (const el of svg.querySelectorAll('[data-smooth]')) {
      add(el.getAttribute('data-smooth')!, {
        v: rect(el),
        opacity: opacityOf(el.closest('g.node')),
        box: true,
      });
    }
    for (const el of svg.querySelectorAll('g.expander')) {
      add(`expander:${el.getAttribute('data-expander-key')}`, {
        v: rect(el),
        opacity: opacityOf(el),
        box: true,
      });
    }
    for (const el of svg.querySelectorAll<SVGPathElement>('path.link')) {
      // The link layer binds the link to its path with d3.
      const id = (el as unknown as { __data__?: { id?: string } }).__data__?.id;
      const matrix = el.getScreenCTM();
      const numbers = (el.getAttribute('d') ?? '')
        .match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
        ?.map(Number);
      if (!id || !matrix || !numbers || numbers.length % 2 !== 0) {
        continue;
      }
      const points: number[] = [];
      for (let i = 0; i < numbers.length; i += 2) {
        const x = numbers[i]!;
        const y = numbers[i + 1]!;
        points.push(
          matrix.a * x + matrix.c * y + matrix.e - origin.x,
          matrix.b * x + matrix.d * y + matrix.f - origin.y,
        );
      }
      add(`link:${id}`, { v: points, opacity: opacityOf(el), box: false });
    }
    return frame;
  };

  const report: Report = { actions: [], counts: {}, violations: [] };
  let frameIndex = 0;
  const violation = (kind: string, key: string, detail: string) => {
    report.counts[kind] = (report.counts[kind] ?? 0) + 1;
    if (report.violations.length < MAX_VIOLATIONS) {
      report.violations.push({
        step: report.actions.length - 1,
        action: report.actions[report.actions.length - 1] ?? '',
        frame: frameIndex,
        kind,
        key,
        detail,
      });
    }
  };

  // The state when the last click happened, where things are heading since,
  // and the frame before the current one.
  let from: Frame = new Map();
  let to: Frame = sample(twinSvg);
  let previous: Frame = sample(animatedSvg);
  // Links found changing their structure since the last click.
  let reshaped = new Set<string>();

  const round = (n: number) => Math.round(n * 10) / 10;
  const DIMS = ['x', 'y', 'width', 'height'];

  /** Compares a frame with the one before it. */
  const check = (current: Frame) => {
    for (const [key, now] of current) {
      const before = previous.get(key);
      if (!before) {
        if (now.opacity > INVISIBLE) {
          violation('appear', key, `appeared at opacity ${round(now.opacity)}`);
        }
        continue;
      }
      if (Math.abs(now.opacity - before.opacity) > OPACITY_STEP) {
        violation(
          'pop',
          key,
          `opacity ${round(before.opacity)} -> ${round(now.opacity)}`,
        );
      }
      // Movement of something invisible cannot be seen.
      if (Math.max(now.opacity, before.opacity) <= INVISIBLE) {
        continue;
      }
      // What is neither where it started nor where it is heading (it is
      // leaving, or it was not there at the click) has no reason to move.
      const start = from.get(key);
      const target = to.get(key);
      // A path cannot morph between shapes with different numbers of points.
      // Report that once; its points cannot be followed while it happens.
      if (
        reshaped.has(key) ||
        now.v.length !== before.v.length ||
        (start && target && start.v.length !== target.v.length)
      ) {
        if (!reshaped.has(key)) {
          reshaped.add(key);
          violation('reshape', key, 'the path changed its structure');
        }
        continue;
      }
      const journey = (i: number) =>
        start && target ? Math.abs(target.v[i]! - start.v[i]!) : 0;
      const tooFast: string[] = [];
      let resized = false;
      for (let i = 0; i < now.v.length; i++) {
        const step = Math.abs(now.v[i]! - before.v[i]!);
        if (step > journey(i) * MOVE_RATE + MOVE_EPS) {
          const dim = now.box
            ? DIMS[i]!
            : `point ${i >> 1} ${i % 2 ? 'y' : 'x'}`;
          tooFast.push(
            `${dim} ${round(before.v[i]!)} -> ${round(now.v[i]!)} of a journey of ${round(journey(i))}`,
          );
          resized ||= now.box && i >= 2;
        }
      }
      if (tooFast.length > 0) {
        // A box that changed size also moved its edges; report it once.
        violation(resized ? 'resize' : 'jump', key, tooFast.join(', '));
      }
    }
    for (const [key, before] of previous) {
      if (!current.has(key) && before.opacity > INVISIBLE) {
        violation('vanish', key, `removed at opacity ${round(before.opacity)}`);
      }
    }
    previous = current;
  };

  const clickable = (selector: string): Element[] =>
    Array.from(animatedSvg.querySelectorAll(selector)).filter(
      (el) => opacityOf(el.closest('g.node') ?? el) > 0.5,
    );

  const harness = {
    /** Performs a click and checks its immediate effect. Returns what it did. */
    act(action: Action): string {
      let element: Element | undefined;
      let description: string;
      if (action.type === 'random') {
        const expanders = clickable('g.expander');
        const people = clickable('[data-smooth^="person:"]');
        const pool = expanders.length > 0 && rng() < 0.25 ? expanders : people;
        element = pool[Math.floor(rng() * pool.length)];
        description = element?.hasAttribute('data-expander-key')
          ? `expander ${element.getAttribute('data-expander-key')}`
          : `person ${element?.getAttribute('data-smooth')?.split(':').pop()}`;
      } else if (action.type === 'person') {
        element = clickable(`[data-smooth^="person:"]`).find((el) =>
          el.getAttribute('data-smooth')!.endsWith(`:${action.id}`),
        );
        description = `person ${action.id}`;
      } else {
        element = clickable('g.expander').find(
          (el) => el.getAttribute('data-expander-key') === action.key,
        );
        description = `expander ${action.key}`;
      }
      if (!element) {
        throw new Error(`Nothing to click for: ${description}`);
      }
      report.actions.push(description);
      frameIndex = 0;
      reshaped = new Set();
      from = sample(animatedSvg);
      previous = from;
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      to = sample(twinSvg);
      check(sample(animatedSvg));
      return description;
    },

    /** Checks the frame the clock has just advanced to. */
    frame(): void {
      frameIndex++;
      check(sample(animatedSvg));
    },

    /** Checks that a finished animation ended where the twin is. */
    end(): void {
      if (finishedUpdate !== updates) {
        violation('unfinished', '', 'the finished promise did not resolve');
      }
      const current = sample(animatedSvg);
      for (const [key, target] of to) {
        const now = current.get(key);
        if (!now) {
          violation('missing', key, 'not in the chart after the animation');
          continue;
        }
        const off = now.v.findIndex(
          (value, i) => Math.abs(value - (target.v[i] ?? NaN)) > END_EPS,
        );
        if (now.v.length !== target.v.length || off !== -1) {
          violation(
            'end-mismatch',
            key,
            `ended at ${now.v.map(round)} instead of ${target.v.map(round)}`,
          );
        }
        if (now.opacity < 0.99) {
          violation('end-mismatch', key, `ended at opacity ${now.opacity}`);
        }
      }
      for (const key of current.keys()) {
        if (!to.has(key)) {
          violation('ghost', key, 'still in the chart after the animation');
        }
      }
    },

    report: (): Report => report,
  };
  window.smooth = harness;
}

declare global {
  interface Window {
    smooth: {
      act(action: Action): string;
      frame(): void;
      end(): void;
      report(): Report;
    };
  }
}

/** Opens a page with an animated chart and its twin, on a paused clock. */
async function openChart(page: Page, options: HarnessOptions): Promise<void> {
  await page.clock.install();
  await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    /* Hidden charts can still be measured. Painting a large chart after
       every frame is what would make these tests slow. */
    svg { position: absolute; left: 0; top: 0; visibility: hidden; }
    ${fontFaceCss()}
  </style>
</head>
<body>
  <svg id="chart" xmlns="http://www.w3.org/2000/svg"></svg>
  <svg id="twin" xmlns="http://www.w3.org/2000/svg"></svg>
  <script>${await getBundle()}</script>
</body>
</html>`);
  await page.evaluate(() =>
    Promise.all([
      document.fonts.load('400 12px Montserrat'),
      document.fonts.load('700 12px Montserrat'),
    ]),
  );
  await page.evaluate(installHarness, options);
  // From here on time only moves when the test says so.
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
}

/** Performs the steps, checking every frame, and returns what went wrong. */
async function run(
  page: Page,
  steps: Step[],
  frameMs = FRAME_MS,
): Promise<Report> {
  const fullFrames = Math.ceil(ANIMATION_MS / frameMs);
  for (const step of steps) {
    await page.evaluate((action) => window.smooth.act(action), step.action);
    const frames = step.frames ?? fullFrames;
    for (let i = 0; i < frames; i++) {
      await page.clock.runFor(frameMs);
      await page.evaluate(() => window.smooth.frame());
    }
    if (frames >= fullFrames) {
      await page.evaluate(() => window.smooth.end());
    }
  }
  return page.evaluate(() => window.smooth.report());
}

/** Formats violations so that a failure can be read and replayed. */
function describe(report: Report): string[] {
  return report.violations.map(
    (v) =>
      `step ${v.step} (${v.action}) frame ${v.frame}: ${v.kind} ${v.key}: ${v.detail}`,
  );
}

const click = (id: string, frames?: number): Step => ({
  action: { type: 'person', id },
  ...(frames !== undefined ? { frames } : {}),
});
const toggle = (key: string, frames?: number): Step => ({
  action: { type: 'expander', key },
  ...(frames !== undefined ? { frames } : {}),
});

// ---------------------------------------------------------------------------
// A small family for the scripted cases. Everybody has the same details, so
// that all boxes are equally tall and no box has a reason to change size.
// ---------------------------------------------------------------------------

function person(
  id: string,
  firstName: string,
  sex: string,
  year: number,
  famc?: string,
  fams?: string[],
) {
  return {
    id,
    firstName,
    lastName: 'Kowalski',
    sex,
    birth: { date: { year } },
    ...(famc ? { famc } : {}),
    ...(fams ? { fams } : {}),
  };
}

const SMALL_FAMILY = {
  indis: [
    person('I1', 'Adam', 'M', 1950, 'F0', ['F1']),
    person('I2', 'Ewa', 'F', 1952, 'FM', ['F1']),
    person('I3', 'Piotr', 'M', 1975, 'F1', ['F2']),
    person('I4', 'Anna', 'F', 1977, undefined, ['F2']),
    person('I5', 'Jan', 'M', 2000, 'F2'),
    person('I6', 'Maria', 'F', 2003, 'F2'),
    person('I7', 'Zofia', 'F', 1979, 'F1'),
    person('I8', 'Stefan', 'M', 1920, 'FG', ['F0']),
    person('I9', 'Helena', 'F', 1924, undefined, ['F0']),
    person('I10', 'Karol', 'M', 1922, undefined, ['FM']),
    person('I11', 'Irena', 'F', 1926, undefined, ['FM']),
    // Adam's brother, married twice.
    person('I12', 'Marek', 'M', 1955, 'F0', ['F3', 'F4']),
    person('I13', 'Dorota', 'F', 1957, undefined, ['F3']),
    person('I14', 'Teresa', 'F', 1960, undefined, ['F4']),
    person('I15', 'Olga', 'F', 1980, 'F3'),
    person('I16', 'Igor', 'M', 1990, 'F4'),
    person('I17', 'Antoni', 'M', 1890, undefined, ['FG']),
    person('I18', 'Wanda', 'F', 1895, undefined, ['FG']),
  ],
  fams: [
    { id: 'F0', husb: 'I8', wife: 'I9', children: ['I1', 'I12'] },
    { id: 'F1', husb: 'I1', wife: 'I2', children: ['I3', 'I7'] },
    { id: 'F2', husb: 'I3', wife: 'I4', children: ['I5', 'I6'] },
    { id: 'F3', husb: 'I12', wife: 'I13', children: ['I15'] },
    { id: 'F4', husb: 'I12', wife: 'I14', children: ['I16'] },
    { id: 'FG', husb: 'I17', wife: 'I18', children: ['I8'] },
    { id: 'FM', husb: 'I10', wife: 'I11', children: ['I2'] },
  ],
};

const small = (overrides: Partial<HarnessOptions> = {}): HarnessOptions => ({
  data: SMALL_FAMILY,
  startIndi: 'I1',
  preset: 'detailed',
  chart: 'hourglass',
  direction: 'down',
  seed: 1,
  ...overrides,
});

/** Spouse swap, down to a child, back up, up to a parent, down to a sibling. */
const TOUR: Step[] = ['I2', 'I1', 'I3', 'I1', 'I8', 'I12', 'I8', 'I1'].map(
  (id) => click(id),
);

test.describe('Animation smoothness: scripted cases on a small tree', () => {
  test('spouse swap', async ({ page }) => {
    await openChart(page, small());
    expect(describe(await run(page, [click('I2'), click('I1')]))).toEqual([]);
  });

  test('refocus to children, parents and siblings', async ({ page }) => {
    await openChart(page, small());
    expect(describe(await run(page, TOUR))).toEqual([]);
  });

  test('clicking the selected person again moves nothing', async ({ page }) => {
    await openChart(page, small());
    expect(describe(await run(page, [click('I1'), click('I1')]))).toEqual([]);
  });

  test('folding and unfolding every branch of the start family', async ({
    page,
  }) => {
    await openChart(page, small());
    const steps = ['F1:children', 'F1:indiParents', 'F1:spouseParents'].flatMap(
      (key) => [toggle(key), toggle(key)],
    );
    expect(describe(await run(page, steps))).toEqual([]);
  });

  test('a person with two marriages', async ({ page }) => {
    await openChart(page, small());
    // Marek (I12) is reached through his father; his wives are I13 and I14.
    const steps = ['I8', 'I12', 'I13', 'I12', 'I14', 'I16', 'I12', 'I8'].map(
      (id) => click(id),
    );
    expect(describe(await run(page, steps))).toEqual([]);
  });

  test('a click in every phase of the animation', async ({ page }) => {
    await openChart(page, small());
    const steps = [
      // While the leaving boxes fade out.
      click('I3', 5),
      // While boxes move.
      click('I1', 25),
      // After the move, before the new boxes fade in.
      click('I8', 44),
      // While the new boxes fade in.
      click('I1', 50),
      click('I2'),
    ];
    expect(describe(await run(page, steps))).toEqual([]);
  });

  test('clicks faster than a frame', async ({ page }) => {
    await openChart(page, small());
    const steps = [click('I3', 0), click('I4', 0), click('I5', 1), click('I1')];
    expect(describe(await run(page, steps))).toEqual([]);
  });

  test('folding a branch that is still unfolding', async ({ page }) => {
    await openChart(page, small());
    const steps = [
      toggle('F1:children'),
      toggle('F1:children', 30),
      toggle('F1:children', 52),
      toggle('F1:children'),
    ];
    expect(describe(await run(page, steps))).toEqual([]);
  });

  for (const direction of ['up', 'right', 'left'] as const) {
    test(`chart growing ${direction}`, async ({ page }) => {
      await openChart(page, small({ direction }));
      expect(describe(await run(page, TOUR))).toEqual([]);
    });
  }

  test('all relatives chart', async ({ page }) => {
    await openChart(page, small({ chart: 'relatives' }));
    expect(describe(await run(page, TOUR))).toEqual([]);
  });

  test('simple boxes', async ({ page }) => {
    await openChart(page, small({ preset: 'simple' }));
    expect(describe(await run(page, TOUR))).toEqual([]);
  });

  test('circles', async ({ page }) => {
    await openChart(page, small({ preset: 'circle', direction: 'up' }));
    // The tour without its spouse swap, which has a test of its own.
    expect(describe(await run(page, TOUR.slice(2)))).toEqual([]);
  });

  test('circle spouse swap', async ({ page }) => {
    await openChart(page, small({ preset: 'circle', direction: 'up' }));
    const report = await run(page, [click('I2')]);
    // Nothing but the two halves of the couple may jump, and only at the click.
    const others = report.violations.filter(
      (v) =>
        v.kind !== 'jump' || v.frame !== 0 || !v.key.startsWith('person:F1:'),
    );
    expect(others).toEqual([]);
    expect(report.violations.length > 0).toBe(KNOWN_ISSUE_CIRCLE_SWAP);
  });

  test('a person without any relatives', async ({ page }) => {
    await openChart(
      page,
      small({ data: { indis: [person('I1', 'Adam', 'M', 1950)], fams: [] } }),
    );
    expect(describe(await run(page, [click('I1'), click('I1')]))).toEqual([]);
  });

  // Zofia gets a birth place, so her box is one line taller (in a horizontal
  // chart: wider) than the box of her brother Piotr. Selecting Piotr hides
  // her; selecting Adam again brings her back and stretches Piotr's row.
  const UNEQUAL_FAMILY = {
    ...SMALL_FAMILY,
    indis: SMALL_FAMILY.indis.map((indi) =>
      indi.id === 'I7'
        ? { ...indi, birth: { ...indi.birth, place: 'Kraków, Małopolskie' } }
        : indi,
    ),
  };

  for (const direction of ['down', 'right'] as const) {
    test(`boxes of a row changing size (${direction})`, async ({ page }) => {
      await openChart(page, small({ data: UNEQUAL_FAMILY, direction }));
      const steps = [
        click('I3'),
        click('I1'),
        // The same again, with clicks while the boxes are changing size.
        click('I3', 25),
        click('I1', 30),
        click('I3', 8),
        click('I1'),
      ];
      expect(describe(await run(page, steps))).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Random walks.
// ---------------------------------------------------------------------------

const SMALL_TREE: GeneratorParams = {
  ancestorGenerations: 2,
  descendantGenerations: 2,
  maxSiblings: 3,
  remarriageProb: 0.3,
  pedigreeCollapseProb: 0.1,
  singleParentProb: 0.2,
  parentlessSiblingsProb: 0.1,
  marriageDetailsProb: 0.7,
  wideMarriageProb: 0.2,
};

const LARGE_TREE: GeneratorParams = {
  ...SMALL_TREE,
  ancestorGenerations: 5,
  descendantGenerations: 4,
  maxSiblings: 4,
};

/** Cousins marry often, so the same family shows up twice in a chart. */
const TANGLED_TREE: GeneratorParams = {
  ...SMALL_TREE,
  ancestorGenerations: 3,
  remarriageProb: 0.5,
  pedigreeCollapseProb: 0.6,
};

interface Walk {
  name: string;
  tree: GeneratorParams;
  seeds: number[];
  clicks: number;
  /** Chance that a click interrupts the animation of the previous one. */
  interruptProb: number;
  preset: Preset;
  chart: ChartKind;
  direction: Direction;
  frameMs?: number;
}

const WALKS: Walk[] = [
  {
    name: 'small tree, hourglass',
    tree: SMALL_TREE,
    seeds: [11, 12, 13],
    clicks: 25,
    interruptProb: 0.35,
    preset: 'detailed',
    chart: 'hourglass',
    direction: 'down',
  },
  {
    name: 'small tree, all relatives, horizontal',
    tree: SMALL_TREE,
    seeds: [21, 24],
    clicks: 20,
    interruptProb: 0.35,
    preset: 'detailed',
    chart: 'relatives',
    direction: 'right',
  },
  {
    name: 'small tree, hourglass, horizontal',
    tree: SMALL_TREE,
    seeds: [31, 32],
    clicks: 25,
    interruptProb: 0.35,
    preset: 'detailed',
    chart: 'hourglass',
    direction: 'right',
  },
  {
    name: 'large tree, all relatives, simple boxes',
    tree: LARGE_TREE,
    seeds: [33],
    clicks: 6,
    interruptProb: 0.35,
    preset: 'simple',
    chart: 'relatives',
    direction: 'down',
    frameMs: 32,
  },
  {
    name: 'tangled tree with cousin marriages and remarriages',
    tree: TANGLED_TREE,
    seeds: [41, 42],
    clicks: 20,
    interruptProb: 0.35,
    preset: 'simple',
    chart: 'hourglass',
    direction: 'down',
  },
  {
    name: 'small tree, only interrupted clicks',
    tree: SMALL_TREE,
    seeds: [51],
    clicks: 40,
    interruptProb: 1,
    preset: 'detailed',
    chart: 'hourglass',
    direction: 'down',
  },
  {
    name: 'large tree, hourglass',
    tree: LARGE_TREE,
    seeds: [61, 62],
    clicks: 20,
    interruptProb: 0.3,
    preset: 'detailed',
    chart: 'hourglass',
    direction: 'down',
  },
  {
    name: 'large tree, all relatives',
    tree: LARGE_TREE,
    seeds: [71],
    clicks: 6,
    interruptProb: 0.3,
    preset: 'detailed',
    chart: 'relatives',
    direction: 'down',
    frameMs: 32,
  },
];

/**
 * The clicks of a walk. What is clicked is decided in the page; here it is
 * decided which clicks interrupt the animation of the click before.
 */
function walkSteps(walk: Walk, seed: number): Step[] {
  const frameMs = walk.frameMs ?? FRAME_MS;
  const rng = createRng(seed);
  const steps: Step[] = [];
  for (let i = 0; i < walk.clicks; i++) {
    // The last click always runs to the end, so that the final state is
    // compared with the twin at least once.
    const interrupt = i < walk.clicks - 1 && rng() < walk.interruptProb;
    steps.push({
      action: { type: 'random' },
      ...(interrupt ? { frames: Math.floor((rng() * 900) / frameMs) } : {}),
    });
  }
  return steps;
}

async function openWalk(page: Page, walk: Walk, seed: number) {
  const generated = generateFamily(seed, walk.tree);
  const { data } = generated;
  await openChart(page, {
    data,
    startIndi: generated.startIndi,
    preset: walk.preset,
    chart: walk.chart,
    direction: walk.direction,
    seed,
    ...(walk.frameMs !== undefined ? { frameMs: walk.frameMs } : {}),
  });
  return data;
}

test.describe('Animation smoothness: random walks', () => {
  for (const walk of WALKS) {
    for (const seed of walk.seeds) {
      test(`${walk.name} (seed ${seed})`, async ({ page }, testInfo) => {
        test.setTimeout(240_000);
        const data = await openWalk(page, walk, seed);
        const frameMs = walk.frameMs ?? FRAME_MS;
        const steps = walkSteps(walk, seed);
        const report = await run(page, steps, frameMs);
        testInfo.annotations.push({
          type: 'walk',
          description: `${data.indis.length} people, ${JSON.stringify(report.counts)}; ${report.actions.join(', ')}`,
        });
        expect(describe(report)).toEqual([]);
      });
    }
  }

  test('marriage link changing shape', async ({ page }) => {
    // The third click of this walk turns a straight marriage link into a
    // stepped one. The link has to morph, not snap into its new shape.
    const walk = WALKS.find(
      (w) => w.name === 'small tree, all relatives, horizontal',
    )!;
    await openWalk(page, walk, 24);
    const report = await run(page, walkSteps(walk, 24).slice(0, 3));
    expect(describe(report)).toEqual([]);
  });
});
