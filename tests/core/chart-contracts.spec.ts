// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SLOTS,
  computeLayout,
  createCanvasTextMeasurer,
  createChart,
  createDefaultLinkLayer,
  createFixedTextMeasurer,
  expanderKey,
  type ChartConfig,
  type ChartUpdateResult,
  type CreateChartOptions,
  type ExpanderClickInfo,
  type ExpanderKey,
  type ExpanderLabelInfo,
  type FamilyGraph,
  type Layer,
  type NodePlugin,
  type Slot,
  type StyleScheme,
} from '../../src/core/index.js';
import { toClassToken } from '../../src/core/class-token.js';
import { createModelGraph, type ModelData } from '../../src/model/index.js';
import { createSimpleNodePlugin } from '../../src/presets/index.js';
import type { TextBoxTheme } from '../../src/toolkit/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SAMPLE_DATA: ModelData = {
  indis: [
    { id: 'I1', firstName: 'Alice', sex: 'F', famc: 'F_PARENTS', fams: ['F_ROOT'] },
    { id: 'I2', firstName: 'Bob', sex: 'M', fams: ['F_ROOT'] },
    { id: 'I3', firstName: 'Charlie', sex: 'M', famc: 'F_ROOT' },
    { id: 'I4', firstName: 'David', sex: 'M', fams: ['F_PARENTS'] },
    { id: 'I5', firstName: 'Eva', sex: 'F', fams: ['F_PARENTS'] },
  ],
  fams: [
    { id: 'F_PARENTS', husb: 'I4', wife: 'I5', children: ['I1'] },
    { id: 'F_ROOT', husb: 'I2', wife: 'I1', children: ['I3'] },
  ],
};

const OPEN = { startIndi: 'I1' };
const FOLDED = {
  startIndi: 'I1',
  collapsed: new Set<`${string}:${Slot}`>(['F_ROOT:children']),
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function svgElement(parent: Element, tag: string, cls: string): SVGElement {
  const element = parent.ownerDocument.createElementNS(SVG_NS, tag);
  element.setAttribute('class', cls);
  parent.appendChild(element);
  return element;
}

describe('Chart contracts for plug-ins, layers and hosts', () => {
  const graph = createModelGraph(SAMPLE_DATA);
  const charts: Array<{ dispose(): void }> = [];

  const makeChart = (
    overrides: Partial<ChartConfig<TextBoxTheme>> = {},
    svg: string = '#svg',
  ) => {
    const chart = createChart<TextBoxTheme>({
      svg,
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
        ...overrides,
      },
    });
    charts.push(chart);
    return chart;
  };

  beforeEach(() => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    // jsdom has no SVGTransformList, which d3 needs to interpolate transforms.
    // The charts under test only use translate(x, y), so emulate just that.
    Object.defineProperty(window.SVGElement.prototype, 'transform', {
      configurable: true,
      get(this: SVGElement) {
        const m = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(
          this.getAttribute('transform') ?? '',
        );
        const matrix = { a: 1, b: 0, c: 0, d: 1, e: +(m?.[1] ?? 0), f: +(m?.[2] ?? 0) };
        return { baseVal: { consolidate: () => ({ matrix }) } };
      },
    });
  });
  afterEach(() => {
    for (const chart of charts.splice(0)) {
      chart.dispose();
    }
    delete (window.SVGElement.prototype as { transform?: unknown }).transform;
  });

  /** A layer with one label per node, removed with `disappear`. */
  const labelLayer = (slot: Layer['slot']): Layer<TextBoxTheme> => ({
    id: 'labels',
    slot,
    render({ group, layout, animation }) {
      const labels = new Map(
        Array.from(
          group.querySelectorAll<SVGElement>('text.label:not(.leaving)'),
        ).map((label) => [label.getAttribute('data-node'), label]),
      );
      for (const node of layout.nodes) {
        if (labels.delete(node.id)) continue;
        const label = svgElement(group, 'text', 'label');
        label.setAttribute('data-node', node.id);
        animation.appear(label);
      }
      for (const label of labels.values()) {
        label.setAttribute('class', 'label leaving');
        animation.disappear(label);
      }
    },
  });

  it.each(['links', 'front'] as const)(
    'removes an element that a %s layer lets disappear, also when the next update comes during the fade',
    async (slot) => {
      const chart = makeChart({ animate: true, layers: [labelLayer(slot)] });
      await chart.update(OPEN).finished;
      expect(document.querySelectorAll('text.label')).toHaveLength(3);

      chart.update(FOLDED);
      await sleep(60);
      expect(document.querySelectorAll('text.leaving')).toHaveLength(1);
      await chart.update(FOLDED).finished;

      expect(document.querySelectorAll('text.leaving')).toHaveLength(0);
      expect(document.querySelectorAll('text.label')).toHaveLength(2);
    },
  );

  it('makes an element visible whose fade-in was cut short and that is not animated again', async () => {
    const chart = makeChart({ animate: true, layers: [labelLayer('front')] });
    await chart.update(FOLDED).finished;

    chart.update(OPEN);
    const fresh = document.querySelector<SVGElement>(
      'text.label[data-node="I3"]',
    )!;
    expect(fresh.style.opacity).toBe('0');
    await sleep(60);
    // The layer has nothing to do for the label this time.
    await chart.update(OPEN).finished;
    expect(fresh.isConnected).toBe(true);
    expect(fresh.style.opacity).toBe('1');

    // Without animation it shows at once.
    chart.update(FOLDED);
    chart.update(OPEN);
    const again = document.querySelector<SVGElement>(
      'text.label:not(.leaving)[data-node="I3"]',
    )!;
    expect(again).not.toBe(fresh);
    expect(again.style.opacity).toBe('0');
    chart.remeasure();
    expect(again.style.opacity).toBe('');
  });

  it('adds up two moves of one element during one update', async () => {
    let renders = 0;
    const layer: Layer<TextBoxTheme> = {
      id: 'bar',
      slot: 'front',
      render({ group, animation }) {
        renders++;
        const bar =
          group.querySelector<SVGElement>('rect.bar') ??
          svgElement(group, 'rect', 'bar');
        animation.move(bar, { width: renders * 100 });
        animation.move(bar, { height: renders * 10 });
      },
    };
    const chart = makeChart({ animate: true, layers: [layer] });
    await chart.update(OPEN).finished;
    const bar = document.querySelector('rect.bar')!;
    expect(bar.getAttribute('width')).toBe('100');
    expect(bar.getAttribute('height')).toBe('10');

    await chart.update(OPEN).finished;
    expect(bar.getAttribute('width')).toBe('200');
    expect(bar.getAttribute('height')).toBe('20');
  });

  it('keeps nodes whose plug-in lists the extents in another order, and nodes with sizes that are no exact floats', async () => {
    const base = createSimpleNodePlugin({ model: graph });
    let drawn = 0;
    let resized = 0;
    let extra = 0;
    const plugin: NodePlugin<TextBoxTheme> = {
      ...base,
      sizeNodes(nodes, ctx) {
        const measured = base.sizeNodes(nodes, ctx);
        for (const node of measured.values()) {
          const { alongBefore, alongAfter, acrossBefore, acrossAfter } =
            node.extents;
          node.extents = {
            acrossBefore,
            acrossAfter,
            alongBefore,
            alongAfter: alongAfter + extra,
          };
        }
        return measured;
      },
      drawNode(group, node, ctx) {
        drawn++;
        base.drawNode(group, node, ctx);
      },
      resizeNode(group, node, ctx) {
        resized++;
        base.resizeNode!(group, node, ctx);
      },
    };

    const chart = makeChart({ nodePlugin: plugin });
    chart.update(OPEN);
    expect(drawn).toBe(3);
    chart.update(OPEN);
    chart.update(OPEN);
    expect(drawn).toBe(3);
    expect(resized).toBe(0);

    // A plug-in without a resize step must not draw again either.
    const { resizeNode: _resizeNode, ...drawOnly } = plugin;
    drawn = 0;
    chart.patchConfig({ nodePlugin: drawOnly });
    expect(drawn).toBe(3);
    chart.update(OPEN);
    expect(drawn).toBe(3);

    // An animated resize by 0.9 that has ended is over.
    drawn = 0;
    resized = 0;
    chart.patchConfig({ nodePlugin: plugin, animate: true });
    extra = 0.9;
    await chart.update(OPEN).finished;
    expect(resized).toBe(3);
    chart.update(OPEN);
    expect(resized).toBe(3);
    expect(drawn).toBe(3);
  });

  it('keeps the <svg> large enough for both layouts while an animated update shrinks the chart', async () => {
    const children: ModelData = {
      indis: [
        { id: 'P', fams: ['F'] },
        ...['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((id) => ({
          id,
          famc: 'F',
        })),
      ],
      fams: [
        { id: 'F', husb: 'P', children: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] },
      ],
    };
    const wide = createModelGraph(children);
    const chart = makeChart({
      graph: wide,
      nodePlugin: createSimpleNodePlugin({ model: wide }),
      animate: true,
      maxAncestorGenerations: 0,
    });
    const svg = document.querySelector('#svg')!;
    const size = () => [
      Number(svg.getAttribute('width')),
      Number(svg.getAttribute('height')),
    ];

    const first = chart.update({ startIndi: 'P' });
    expect(size()).toEqual(first.layout.size);

    // A much smaller chart: its nodes are still at their old places, so the
    // old size stays until they have moved.
    const second = chart.update({ startIndi: 'C6' });
    expect(second.layout.size[0]).toBeLessThan(first.layout.size[0] / 2);
    expect(size()).toEqual(first.layout.size);
    await sleep(450);
    expect(size()).toEqual(first.layout.size);
    await second.finished;
    expect(size()).toEqual(second.layout.size);

    // A chart that grows has its new size at once.
    const third = chart.update({ startIndi: 'P' });
    expect(size()).toEqual(first.layout.size);
    await sleep(60);

    // A shrinking update that is cut short by another one does not shrink
    // the <svg> later on.
    chart.update({ startIndi: 'C6' });
    await sleep(60);
    const back = chart.update({ startIndi: 'P' });
    await back.finished;
    await third.finished;
    expect(size()).toEqual(first.layout.size);

    // Without animation the size is set at once.
    chart.update({ startIndi: 'C6' });
    expect(size()).toEqual(first.layout.size);
    chart.remeasure();
    expect(size()).toEqual(second.layout.size);
  });

  it('survives helpers that a layer calls after waiting, and waits for them', async () => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);

    let renders = 0;
    const layer: Layer<TextBoxTheme> = {
      id: 'late',
      slot: 'front',
      async render({ group, animation }) {
        const render = ++renders;
        await sleep(10);
        animation.appear(svgElement(group, 'text', `late late-${render}`));
      },
    };
    const chart = makeChart({ animate: true, layers: [layer] });
    await chart.update(OPEN).finished;

    const second = chart.update(OPEN);
    await second.finished;
    // `finished` has waited for the label that came late.
    expect(
      document.querySelector<SVGElement>('text.late-2')!.style.opacity,
    ).toBe('1');

    chart.update(OPEN);
    await sleep(60);
    chart.update(OPEN);
    await sleep(60);
    chart.dispose();
    await sleep(50);
    process.off('unhandledRejection', onRejection);
    expect(rejections).toEqual([]);
  });

  it('keeps the groups of layers by id, whatever the id, in the order of the config', () => {
    const drawOnce = (id: string): Layer<TextBoxTheme> => ({
      id,
      slot: 'back',
      render({ group }) {
        if (!group.firstChild) svgElement(group, 'rect', 'mark');
      },
    });
    const quoted = drawOnce('my "quoted" layer');
    const slashed = drawOnce('ends with a backslash\\');
    const plain = drawOnce('plain');
    const groupIds = () =>
      Array.from(document.querySelectorAll('g.layers-back > g')).map((g) =>
        g.getAttribute('data-layer-id'),
      );

    const chart = makeChart({ layers: [quoted, slashed, plain] });
    chart.update(OPEN);
    chart.update(OPEN);
    expect(groupIds()).toEqual([quoted.id, slashed.id, plain.id]);
    const plainGroup = document.querySelector('g[data-layer-id="plain"]');

    chart.patchConfig({ layers: [plain, slashed, quoted] });
    expect(groupIds()).toEqual([plain.id, slashed.id, quoted.id]);
    expect(document.querySelector('g[data-layer-id="plain"]')).toBe(plainGroup);
    expect(document.querySelectorAll('rect.mark')).toHaveLength(3);

    chart.patchConfig({ layers: [slashed] });
    expect(groupIds()).toEqual([slashed.id]);
  });

  it('lets the default link layer share its slot with a layer that draws links of its own', () => {
    const custom: Layer<TextBoxTheme> = {
      id: 'extra-links',
      slot: 'links',
      render({ group }) {
        if (!group.firstChild) svgElement(group, 'path', 'link extra');
      },
    };
    const chart = makeChart({ layers: [custom, createDefaultLinkLayer()] });
    const { layout } = chart.update(OPEN);
    chart.update(OPEN);

    expect(document.querySelectorAll('path.link.extra')).toHaveLength(1);
    expect(document.querySelectorAll('g.links > path.link')).toHaveLength(
      layout.links.length,
    );

    // Without the default layer in the config only the custom links stay.
    chart.patchConfig({ layers: [custom] });
    expect(document.querySelectorAll('g.links > path.link')).toHaveLength(0);
    expect(document.querySelectorAll('path.link.extra')).toHaveLength(1);
  });

  it('tells a layer when it leaves the config and when the chart is disposed', () => {
    const calls: string[] = [];
    const layer = (id: string): Layer<TextBoxTheme> => ({
      id,
      slot: 'back',
      render({ svgDefs, instanceId }) {
        const defId = `${id}-def-${instanceId}`;
        if (!svgDefs.querySelector(`#${defId}`)) {
          svgElement(svgDefs, 'linearGradient', 'probe').setAttribute(
            'id',
            defId,
          );
        }
      },
      dispose({ group, svgDefs, instanceId }) {
        calls.push(`${id}:${group.getAttribute('data-layer-id')}`);
        svgDefs.querySelector(`#${id}-def-${instanceId}`)?.remove();
      },
    });
    const chart = makeChart({ layers: [layer('one'), layer('two')] });
    chart.update(OPEN);
    expect(document.querySelectorAll('defs .probe')).toHaveLength(2);

    chart.patchConfig({ layers: [layer('two')] });
    expect(calls).toEqual(['one:one']);
    expect(document.querySelectorAll('defs .probe')).toHaveLength(1);

    chart.dispose();
    expect(calls).toEqual(['one:one', 'two:two']);
  });

  it('keeps animating after a remeasure that threw', () => {
    const base = createSimpleNodePlugin({ model: graph });
    let fail = false;
    const animated: boolean[] = [];
    const chart = makeChart({
      animate: true,
      nodePlugin: {
        ...base,
        sizeNodes(nodes, ctx) {
          if (fail) throw new Error('measuring failed');
          return base.sizeNodes(nodes, ctx);
        },
      },
      onLayout: (_layout, info) => animated.push(info.animated),
    });
    chart.update(OPEN);
    fail = true;
    expect(() => chart.remeasure()).toThrow('measuring failed');
    fail = false;
    chart.remeasure();
    chart.update(OPEN);
    expect(animated).toEqual([false, false, true]);
  });

  it('does not remeasure when a font event reports no loaded font', () => {
    const listeners = new Set<(event?: unknown) => void>();
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        check: () => true,
        addEventListener: (_type: string, fn: (event?: unknown) => void) =>
          listeners.add(fn),
        removeEventListener: (_type: string, fn: (event?: unknown) => void) =>
          listeners.delete(fn),
      },
    });
    try {
      let invalidated = 0;
      const chart = makeChart({
        textMeasurer: {
          ...createFixedTextMeasurer(),
          invalidate: () => void invalidated++,
        },
      });
      chart.update(OPEN);
      for (const fn of listeners) fn({ fontfaces: [] });
      expect(invalidated).toBe(0);
      for (const fn of listeners) fn();
      expect(invalidated).toBe(1);
    } finally {
      delete (document as { fonts?: unknown }).fonts;
    }
  });

  it('writes the stylesheet and the classes of marked elements only when they change', () => {
    const scheme: StyleScheme = {
      id: 'probe',
      classifyPerson: ({ viewState }) => `start-${viewState.startIndi}`,
    };
    const chart = makeChart({ schemes: [scheme] });
    chart.update(OPEN);

    const observer = new MutationObserver(() => {});
    observer.observe(document.querySelector('#svg')!, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    const style = document.querySelector('#svg style')!;
    /** What was written to the stylesheet and to the marked elements. */
    const writes = () =>
      observer
        .takeRecords()
        .filter(
          ({ target, attributeName }) =>
            style.contains(target) ||
            ((attributeName === 'class' ||
              attributeName === 'data-topola-tokens') &&
              (target as Element).matches('.person-region, .family-region')),
        )
        .map(({ type, attributeName }) => attributeName ?? type);

    chart.patchConfig({ animate: true });
    chart.patchConfig({ animate: false });
    chart.patchConfig({ onLayout: () => {} });
    chart.update(OPEN);
    expect(writes()).toEqual([]);

    // Changes are still written: the classes for another start person...
    chart.update({ startIndi: 'I2' });
    const classWrites = writes();
    expect(classWrites).toContain('class');
    expect(classWrites).toContain('data-topola-tokens');
    // ...and the stylesheet for another theme.
    chart.patchConfig({ theme: { linkColor: '#123456' } });
    expect(writes()).toContain('childList');
    expect(style.textContent).toContain('#123456');
    observer.disconnect();
    expect(
      document.querySelector('.person-region')!.getAttribute('class'),
    ).toContain('start-I2');
  });

  it('gives a class to a scheme token that starts with a digit, the same one as the palette CSS', () => {
    expect(toClassToken('1st')).toBe('_1st');
    expect(toClassToken('-1')).toBe('_-1');
    expect(toClassToken('-')).toBe('_-');
    expect(toClassToken('')).toBe('');
    expect(toClassToken('a b')).toBe('ab');
    expect(toClassToken('gen-10')).toBe('gen-10');
    expect(toClassToken('--wide')).toBe('--wide');

    const century: StyleScheme = {
      id: 'century',
      palette: { '19th': { fill: '#abcdef', accent: '#123456' } },
      classifyPerson: () => '19th',
      classifyLink: () => '19th',
    };
    const chart = makeChart({ schemes: [century] });
    chart.update(OPEN);
    const css = document.querySelector('#svg style')!.textContent!;
    expect(css).toContain('._19th .background { fill: #abcdef; }');
    expect(css).not.toContain('.19th');
    expect(
      document.querySelector('.person-region')!.classList.contains('_19th'),
    ).toBe(true);
    expect(
      document.querySelector('path.link')!.classList.contains('_19th'),
    ).toBe(true);
  });

  it('rejects a container that is not an SVG <svg> or <g>', () => {
    document.body.innerHTML =
      '<div id="chart"></div><svg id="svg"><rect id="rect"></rect></svg>';
    expect(() => makeChart({}, '#chart')).toThrow(
      'Selector "#chart" is <div>, expected an SVG <svg> or <g> element.',
    );
    expect(() => makeChart({}, '#rect')).toThrow('<rect>');
    expect(() =>
      createChart({
        svg: document.createElement('g') as unknown as SVGGElement,
        config: {
          graph,
          chart: 'hourglass',
          nodePlugin: createSimpleNodePlugin({ model: graph }),
        },
      }),
    ).toThrow('expected an SVG <svg> or <g> element');
    expect(document.querySelector('#chart')!.children).toHaveLength(0);
  });

  it('gives charts of two copies of the library different scope classes', async () => {
    document.body.innerHTML = '<svg id="svg"></svg><svg id="other"></svg>';
    // Two fresh copies of the module, each counting its charts from 1.
    for (const svg of ['#svg', '#other']) {
      vi.resetModules();
      const copy = await import('../../src/core/index.js');
      expect(copy.createChart).not.toBe(createChart);
      const chart = copy.createChart({
        svg,
        config: {
          graph,
          chart: 'hourglass',
          nodePlugin: createSimpleNodePlugin({ model: graph }),
          textMeasurer: createFixedTextMeasurer(),
        },
      });
      charts.push(chart);
    }

    const scopes = Array.from(
      document.querySelectorAll('svg > g'),
      (g) => g.getAttribute('class')!,
    );
    expect(scopes).toEqual(['topola-1', 'topola-2']);
  });

  it('measures text with the canvas and the fonts of the given document', () => {
    const checked: string[] = [];
    const fakeDocument = {
      createElement: (tag: string) => {
        expect(tag).toBe('canvas');
        return {
          getContext: () => ({
            font: '',
            measureText: (text: string) => ({ width: text.length * 7 }),
          }),
        };
      },
      fonts: {
        check: (font: string) => {
          checked.push(font);
          return true;
        },
      },
    } as unknown as Document;

    const measurer = createCanvasTextMeasurer(fakeDocument);
    const font = { fontFamily: 'Frame Font', fontSize: 10 };
    expect(measurer.measureWidth('abcd', font)).toBe(28);
    expect(checked).toEqual(['normal normal 10px Frame Font']);

    // A document without a canvas: the fixed measurer answers.
    const noCanvas = {
      createElement: () => {
        throw new Error('no canvas');
      },
    } as unknown as Document;
    expect(createCanvasTextMeasurer(noCanvas).measureWidth('abcd', font)).toBe(
      createFixedTextMeasurer().measureWidth('abcd', font),
    );

    // Skips caching while fonts.check === false, caches once true, invalidates,
    // and evicts oldest entry FIFO at 200,000 entries.
    let measuredCalls = 0;
    let ready = false;
    const fifoDoc = {
      createElement: () => ({
        getContext: () => ({
          font: '',
          measureText: (text: string) => {
            measuredCalls++;
            return { width: text.length };
          },
        }),
      }),
      fonts: { check: () => ready },
    } as unknown as Document;
    const fifoMeasurer = createCanvasTextMeasurer(fifoDoc);
    expect(fifoMeasurer.measureWidth('preload', font)).toBe(7);
    expect(fifoMeasurer.measureWidth('preload', font)).toBe(7);
    expect(measuredCalls).toBe(2);

    ready = true;
    expect(fifoMeasurer.measureWidth('preload', font)).toBe(7);
    expect(fifoMeasurer.measureWidth('preload', font)).toBe(7);
    expect(measuredCalls).toBe(3);

    fifoMeasurer.invalidate!();
    expect(fifoMeasurer.measureWidth('preload', font)).toBe(7);
    expect(measuredCalls).toBe(4);

    fifoMeasurer.invalidate!();
    measuredCalls = 0;
    for (let i = 0; i < 200_000; i++) {
      fifoMeasurer.measureWidth(`k${i}`, font);
    }
    expect(measuredCalls).toBe(200_000);
    // Adding entry #200,001 evicts k0 while keeping k1..k200000 cached
    fifoMeasurer.measureWidth('k200000', font);
    expect(measuredCalls).toBe(200_001);
    fifoMeasurer.measureWidth('k1', font);
    fifoMeasurer.measureWidth('k200000', font);
    expect(measuredCalls).toBe(200_001);
    fifoMeasurer.measureWidth('k0', font);
    expect(measuredCalls).toBe(200_002);
  });

  it('returns the layout and the end of the animation from patchConfig and setConfig', async () => {
    const chart = makeChart({ animate: true });
    // Nothing is drawn before the first view state.
    expect(
      chart.patchConfig({ theme: { siblingSpacing: 20 } }),
    ).toBeUndefined();
    expect(
      chart.setConfig({
        graph,
        chart: 'hourglass',
        animate: true,
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      }),
    ).toBeUndefined();
    chart.update(OPEN);

    // A change that does not show draws nothing.
    expect(chart.patchConfig({ animate: true })).toBeUndefined();

    const refocus = chart.patchConfig({ direction: 'right' }, FOLDED);
    expect(refocus!.layout.direction).toBe('right');
    expect(refocus!.layout.nodes).toHaveLength(2);
    const root = document.querySelector<SVGElement>('#svg > g')!;
    const before = root.getAttribute('transform');
    await refocus!.finished;
    expect(root.getAttribute('transform')).not.toBe(before);

    const replaced = chart.setConfig(
      {
        graph,
        chart: 'relatives',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      },
      OPEN,
    );
    expect(replaced!.layout.nodes).toHaveLength(3);
    await replaced!.finished;
  });

  it('calls the expander handler that the config has when the click comes', () => {
    const calls: string[] = [];
    const chart = makeChart({
      expanders: true,
      onExpanderClick: () => void calls.push('a'),
    });
    chart.update(OPEN);
    const expander = document.querySelector('g.expander')!;
    const click = () =>
      expander.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    click();
    // A new handler alone does not draw the chart.
    expect(
      chart.patchConfig({ onExpanderClick: () => void calls.push('b') }),
    ).toBeUndefined();
    click();
    chart.patchConfig({ onExpanderClick: undefined });
    click();
    expect(calls).toEqual(['a', 'b']);
    expect(document.querySelector('g.expander')).toBe(expander);
  });

  it('paints the default link layer among the other link layers in the order of the config', () => {
    const extra = (id: string): Layer<TextBoxTheme> => ({
      id,
      slot: 'links',
      render({ group }) {
        if (!group.firstChild) svgElement(group, 'path', 'link extra');
      },
    });
    /** The children of the links slot, a run of paths counted once. */
    const order = () =>
      Array.from(
        document.querySelector('g.links')!.children,
        (child) => child.getAttribute('data-layer-id') ?? child.tagName,
      ).filter((name, i, all) => name !== all[i - 1]);

    const chart = makeChart({
      layers: [createDefaultLinkLayer(), extra('over')],
    });
    chart.update(FOLDED);
    expect(order()).toEqual(['path', 'over']);
    // A link that comes later is under the layer that follows, too.
    const { layout } = chart.update(OPEN);
    expect(order()).toEqual(['path', 'over']);
    expect(document.querySelectorAll('g.links > path.link')).toHaveLength(
      layout.links.length,
    );
    expect(layout.links.length).toBe(2);

    chart.patchConfig({
      layers: [extra('under'), createDefaultLinkLayer(), extra('over')],
    });
    expect(order()).toEqual(['under', 'path', 'over']);
    chart.update(FOLDED);
    chart.update(OPEN);
    expect(order()).toEqual(['under', 'path', 'over']);

    chart.patchConfig({
      layers: [extra('over'), extra('under'), createDefaultLinkLayer()],
    });
    expect(order()).toEqual(['over', 'under', 'path']);
    chart.update(FOLDED);
    chart.update(OPEN);
    expect(order()).toEqual(['over', 'under', 'path']);
  });

  it('disposes a layer that stands in for the default link layer, and is removed also when a layer fails to dispose', () => {
    const calls: string[] = [];
    const wrapped: Layer<TextBoxTheme> = {
      ...createDefaultLinkLayer<TextBoxTheme>(),
      dispose: ({ group }) =>
        void calls.push(`wrapped:${group.getAttribute('class')}`),
    };
    const chart = makeChart({ layers: [wrapped] });
    chart.update(OPEN);
    expect(document.querySelectorAll('g.links > path.link')).toHaveLength(2);

    // It leaves the config...
    chart.patchConfig({ layers: [labelLayer('links')] });
    expect(calls).toEqual(['wrapped:links']);
    expect(document.querySelectorAll('g.links > path.link')).toHaveLength(0);
    // ...or the chart is disposed.
    chart.patchConfig({ layers: [wrapped] });
    chart.dispose();
    expect(calls).toEqual(['wrapped:links', 'wrapped:links']);
    expect(document.querySelector('#svg')!.children).toHaveLength(0);

    const failing: Layer<TextBoxTheme> = {
      id: 'failing',
      slot: 'back',
      render() {},
      dispose() {
        throw new Error('dispose failed');
      },
    };
    const after: Layer<TextBoxTheme> = {
      id: 'after',
      slot: 'front',
      render() {},
      dispose: () => void calls.push('after'),
    };
    const second = makeChart({ layers: [failing, after] });
    second.update(OPEN);
    expect(document.querySelector('#svg')!.children).toHaveLength(2);
    expect(() => second.dispose()).toThrow('dispose failed');
    // The other layer was told, and nothing of the chart is left.
    expect(calls.at(-1)).toBe('after');
    expect(document.querySelector('#svg')!.children).toHaveLength(0);

    // A layer that fails when it leaves the config still loses its group, and
    // the rest of the draw (later leaving layers, default links, expanders, onLayout) still completes.
    let layouts = 0;
    const third = makeChart({
      layers: [failing, after],
      expanders: true,
      onLayout: () => void layouts++,
    });
    third.update(OPEN);
    calls.length = 0;
    layouts = 0;
    expect(() => third.patchConfig({ layers: [] }, FOLDED)).toThrow(
      'dispose failed',
    );
    expect(calls).toEqual(['after']);
    expect(document.querySelector('g[data-layer-id="failing"]')).toBeNull();
    expect(document.querySelector('g[data-layer-id="after"]')).toBeNull();
    expect(document.querySelectorAll('g.links > path.link').length).toBeGreaterThan(
      0,
    );
    expect(layouts).toBe(1);
    expect(third.update(OPEN).layout.nodes).toHaveLength(3);
  });

  it('hands the group of a layer to a new layer object with the same id, and disposes the one that drew last', () => {
    const calls: string[] = [];
    const layer = (name: string): Layer<TextBoxTheme> => ({
      id: 'same',
      slot: 'back',
      render({ group }) {
        svgElement(group, 'rect', name);
      },
      dispose: () => void calls.push(name),
    });
    const chart = makeChart({ layers: [layer('first')] });
    chart.update(OPEN);
    const group = document.querySelector('g[data-layer-id="same"]')!;

    chart.patchConfig({ layers: [layer('second')] });
    expect(document.querySelector('g[data-layer-id="same"]')).toBe(group);
    expect(Array.from(group.children, (c) => c.getAttribute('class'))).toEqual(
      ['first', 'second'],
    );
    expect(calls).toEqual([]);

    chart.dispose();
    expect(calls).toEqual(['second']);
  });

  it('takes moves that a layer makes after waiting, during the next update or when the first move is under way', async () => {
    const errors: unknown[] = [];
    let wait = 100;
    let targetW = 100;
    let targetH = 10;
    const layer: Layer<TextBoxTheme> = {
      id: 'bar',
      slot: 'front',
      async render({ group, animation }) {
        const w = targetW;
        const h = targetH;
        const bar =
          group.querySelector<SVGElement>('rect.bar') ??
          svgElement(group, 'rect', 'bar');
        try {
          animation.move(bar, { width: w });
          await sleep(wait);
          animation.move(bar, { height: h });
        } catch (error) {
          errors.push(error);
        }
      },
    };
    const chart = makeChart({ animate: true, layers: [layer] });
    await chart.update(OPEN).finished;
    const bar = document.querySelector('rect.bar')!;

    // The next update comes while the layer waits: the superseded async render
    // from update 1 (100x10) must NOT overwrite update 2's targets (999x99).
    targetW = 100;
    targetH = 10;
    chart.update(OPEN);
    await sleep(50);
    targetW = 999;
    targetH = 99;
    await chart.update(OPEN).finished;
    await sleep(300);
    expect(errors).toEqual([]);
    expect(bar.getAttribute('width')).toBe('999');
    expect(bar.getAttribute('height')).toBe('99');

    // The second move comes when the first one is under way: the bar still
    // arrives at both targets, and remains interruptible if a static update
    // arrives right after the first transition finishes.
    wait = 300;
    targetW = 200;
    targetH = 20;
    bar.setAttribute('width', '0');
    bar.setAttribute('height', '0');
    await chart.update(OPEN).finished;
    expect(errors).toEqual([]);
    expect(bar.getAttribute('width')).toBe('200');
    expect(bar.getAttribute('height')).toBe('20');

    // Sequential helper moves interrupted after the first transition ends (~700ms):
    // static update at 750ms must cancel the second transition so height stays 77.
    wait = 600;
    targetW = 50;
    targetH = 80;
    chart.update(OPEN);
    await sleep(750);
    targetW = 77;
    targetH = 77;
    chart.update(OPEN, { animate: false });
    await sleep(650);
    expect(bar.getAttribute('width')).toBe('77');
    expect(bar.getAttribute('height')).toBe('77');

    // Disposing while an async layer awaits ignores its post-await helper calls.
    wait = 80;
    targetW = 333;
    targetH = 33;
    chart.update(OPEN, { animate: true });
    chart.dispose();
    await sleep(150);
    expect(errors).toEqual([]);
  });

  it('puts back the group of a layer that was removed, and takes a container whose tag name has a prefix', () => {
    const layer: Layer<TextBoxTheme> = {
      id: 'x',
      slot: 'front',
      render({ group }) {
        if (!group.firstChild) svgElement(group, 'rect', 'mark');
      },
    };
    const chart = makeChart({ layers: [layer] });
    chart.update(OPEN);
    document.querySelector('g[data-layer-id="x"]')!.remove();
    chart.update(OPEN);
    expect(
      document.querySelectorAll('g.layers-front > g[data-layer-id="x"]'),
    ).toHaveLength(1);

    // As in an XML document, where the tag name of <svg:g> is "svg:g".
    const prefixed = document.createElementNS(SVG_NS, 'svg:g');
    expect(prefixed.tagName).toBe('svg:g');
    document.querySelector('#svg')!.appendChild(prefixed);
    const inside = createChart<TextBoxTheme>({
      svg: prefixed as SVGGElement,
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    charts.push(inside);
    inside.update(OPEN);
    expect(prefixed.querySelectorAll('g.node')).toHaveLength(3);
    // A <g> is not sized by the chart.
    expect(prefixed.hasAttribute('width')).toBe(false);
  });

  it('keeps the wider and the taller size of two layouts while the chart moves between them', async () => {
    // From W the chart is wide and low, from T it is narrow and high.
    const kids = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'];
    const data: ModelData = {
      indis: [
        { id: 'W', fams: ['FW'] },
        ...kids.map((id) => ({ id, famc: 'FW' })),
        { id: 'T', fams: ['FT'] },
        { id: 'T1', famc: 'FT', fams: ['FT1'] },
        { id: 'T2', famc: 'FT1', fams: ['FT2'] },
        { id: 'T3', famc: 'FT2' },
      ],
      fams: [
        { id: 'FW', husb: 'W', children: kids },
        { id: 'FT', husb: 'T', children: ['T1'] },
        { id: 'FT1', husb: 'T1', children: ['T2'] },
        { id: 'FT2', husb: 'T2', children: ['T3'] },
      ],
    };
    const both = createModelGraph(data);
    const chart = makeChart({
      graph: both,
      nodePlugin: createSimpleNodePlugin({ model: both }),
      animate: true,
    });
    const svg = document.querySelector('#svg')!;
    const size = () => [
      Number(svg.getAttribute('width')),
      Number(svg.getAttribute('height')),
    ];

    const wide = chart.update({ startIndi: 'W' }).layout.size;
    const tall = chart.update({ startIndi: 'T' });
    const [tallWidth, tallHeight] = tall.layout.size;
    expect(tallWidth).toBeLessThan(wide[0]);
    expect(tallHeight).toBeGreaterThan(wide[1]);
    expect(size()).toEqual([wide[0], tallHeight]);
    await tall.finished;
    expect(size()).toEqual([tallWidth, tallHeight]);

    const back = chart.update({ startIndi: 'W' });
    expect(size()).toEqual([wide[0], tallHeight]);
    await back.finished;
    expect(size()).toEqual(wide);
  });

  it('draws the nodes again when a patch puts a field back to its default with undefined', () => {
    const chart = makeChart({ theme: { cornerRadius: 20 } });
    chart.update(OPEN);
    const corner = () =>
      document.querySelector('rect.background')!.getAttribute('rx');
    expect(corner()).toBe('20');

    chart.patchConfig({ theme: undefined });
    const standard = corner();
    expect(standard).not.toBe('20');
    chart.patchConfig({ theme: { cornerRadius: 20 } });
    expect(corner()).toBe('20');
    chart.patchConfig({ theme: {} });
    expect(corner()).toBe(standard);

    // The direction as well: the boxes of a couple are side by side again.
    const across = () =>
      Array.from(
        document.querySelectorAll<SVGElement>(
          'g.node[data-node-id="F_ROOT"] .person-region',
        ),
        (box) => box.getAttribute('transform'),
      );
    const down = across();
    chart.patchConfig({ direction: 'right' });
    expect(across()).not.toEqual(down);
    chart.patchConfig({ direction: undefined });
    expect(across()).toEqual(down);
  });

  it('shows records that were edited in place after remeasure()', () => {
    const data = structuredClone(SAMPLE_DATA);
    const own = createModelGraph(data);
    const chart = makeChart({
      graph: own,
      nodePlugin: createSimpleNodePlugin({ model: own }),
    });
    chart.update(OPEN);
    const texts = () =>
      Array.from(document.querySelectorAll('g.node text'), (t) =>
        t.textContent?.trim(),
      );
    expect(texts()).toContain('Alice');

    data.indis[0]!.firstName = 'Alicia';
    chart.remeasure();
    expect(texts()).toContain('Alicia');
    expect(texts()).not.toContain('Alice');
  });

  it('says what is wrong with a config that a script without types can pass', () => {
    const nodePlugin = createSimpleNodePlugin({ model: graph });
    const plainData = SAMPLE_DATA as unknown as FamilyGraph;
    expect(() =>
      createChart({
        svg: '#svg',
        config: { graph: plainData, chart: 'hourglass', nodePlugin },
      }),
    ).toThrow(
      'ChartConfig.graph has to implement FamilyGraph. Wrap plain { indis, fams } data with createModelGraph().',
    );
    expect(() =>
      createChart({
        svg: '#svg',
        config: { graph, chart: 'hourglass' } as unknown as ChartConfig,
      }),
    ).toThrow('ChartConfig.nodePlugin is missing.');
    expect(() =>
      createChart({ svg: '#svg' } as unknown as CreateChartOptions),
    ).toThrow('A chart needs a config');
    expect(() =>
      createChart({
        svg: document.getElementById('nowhere') as unknown as SVGGElement,
        config: { graph, chart: 'hourglass', nodePlugin },
      }),
    ).toThrow('The chart container is missing');
    // None of them has left anything in the SVG.
    expect(document.querySelector('#svg')!.children).toHaveLength(0);

    expect(() =>
      computeLayout(OPEN, { graph: plainData, chart: 'hourglass', nodePlugin }),
    ).toThrow('createModelGraph()');

    // A patch that cannot work leaves the chart as it is.
    const chart = makeChart();
    chart.update(OPEN);
    expect(() => chart.patchConfig({ graph: plainData })).toThrow(
      'createModelGraph()',
    );
    expect(() =>
      chart.setConfig({ graph, chart: 'hourglass' } as unknown as ChartConfig<TextBoxTheme>),
    ).toThrow('nodePlugin');
    expect(chart.update(OPEN).layout.nodes).toHaveLength(3);
  });

  it('offers the slots, the keys of expanders and the types of what a chart hands out', () => {
    expect(SLOTS).toEqual(['indiParents', 'spouseParents', 'children']);
    const key: ExpanderKey = expanderKey('F_ROOT', 'children');
    expect(key).toBe('F_ROOT:children');

    const clicks: ExpanderClickInfo[] = [];
    const chart = makeChart({
      expanders: true,
      onExpanderClick: (info) => void clicks.push(info),
    });
    const folded: ChartUpdateResult = chart.update({
      startIndi: 'I1',
      collapsed: new Set([key]),
    });
    expect(folded.layout.nodes).toHaveLength(2);
    document
      .querySelector('g.expander[data-slot="children"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks.map(({ nodeId, slot }) => expanderKey(nodeId, slot))).toEqual(
      [key],
    );
  });

  it('animates a single drawing, or draws it at once, when the caller says so', () => {
    const animated: boolean[] = [];
    const config: ChartConfig<TextBoxTheme> = {
      graph,
      chart: 'hourglass',
      nodePlugin: createSimpleNodePlugin({ model: graph }),
      textMeasurer: createFixedTextMeasurer(),
      onLayout: (_layout, info) => void animated.push(info.animated),
    };
    const chart = makeChart({ ...config, animate: true });
    // The first drawing is never animated.
    chart.update(OPEN, { animate: true });
    chart.update(FOLDED, { animate: false });
    chart.update(OPEN);
    chart.patchConfig({ direction: 'right' }, undefined, { animate: false });
    chart.patchConfig({ direction: 'down' }, FOLDED);
    // A chart that does not animate by itself.
    chart.setConfig(config, OPEN, { animate: true });
    chart.update(FOLDED);
    chart.update(OPEN, { animate: true });
    chart.update(FOLDED, {});
    expect(animated).toEqual([
      false,
      false,
      true,
      false,
      true,
      true,
      false,
      true,
      false,
    ]);
  });

  it('names the chart with the scope id of the host', () => {
    document.body.innerHTML = '<svg id="svg"></svg><svg id="other"></svg>';
    const seen: string[] = [];
    const probe: Layer<TextBoxTheme> = {
      id: 'probe',
      slot: 'back',
      render({ instanceId, scopeSelector }) {
        seen.push(instanceId, scopeSelector);
      },
    };
    const config: ChartConfig<TextBoxTheme> = {
      graph,
      chart: 'hourglass',
      nodePlugin: createSimpleNodePlugin({ model: graph }),
      textMeasurer: createFixedTextMeasurer(),
      layers: [probe],
    };
    const chart = createChart({ svg: '#svg', scopeId: 'tree 7f3a/x', config });
    charts.push(chart);
    chart.update(OPEN);
    expect(document.querySelector('#svg > g')!.getAttribute('class')).toBe(
      'topola-tree7f3ax',
    );
    expect(document.querySelector('#svg > style')!.getAttribute('class')).toBe(
      'topola-style-tree7f3ax',
    );
    expect(seen).toEqual(['tree7f3ax', '.topola-tree7f3ax']);
    expect(document.querySelector('#svg > style')!.textContent).toContain(
      '.topola-tree7f3ax .link {',
    );

    // Without a character that a class name can have, the chart numbers
    // itself as it does without a scope id.
    const numbered = createChart({ svg: '#other', scopeId: '%%', config });
    charts.push(numbered);
    expect(document.querySelector('#other > g')!.getAttribute('class')).toMatch(
      /^topola-\d+$/,
    );
  });

  it('sets the size of the <svg> only when it changes', () => {
    const chart = makeChart();
    const svg = document.querySelector('#svg')!;
    const first = chart.update(OPEN).layout.size;
    expect(svg.getAttribute('width')).toBe(String(first[0]));

    const observer = new MutationObserver(() => {});
    observer.observe(svg, { attributes: true });
    const sizeWrites = () =>
      observer
        .takeRecords()
        .map(({ attributeName }) => attributeName)
        .filter((name) => name === 'width' || name === 'height');

    // The same chart again, and another look of the same size.
    chart.update(OPEN);
    chart.patchConfig({ theme: { linkColor: '#123456' } });
    chart.remeasure();
    expect(sizeWrites()).toEqual([]);

    // A chart of another size is still sized: each dimension that differs,
    // once.
    const folded = chart.update(FOLDED).layout.size;
    expect(folded).not.toEqual(first);
    const changed: string[] = [];
    if (folded[1] !== first[1]) changed.push('height');
    if (folded[0] !== first[0]) changed.push('width');
    expect(sizeWrites().sort()).toEqual(changed);
    expect([
      Number(svg.getAttribute('width')),
      Number(svg.getAttribute('height')),
    ]).toEqual(folded);
    observer.disconnect();
  });

  it('makes expanders and clickable regions usable by keyboard on request only', () => {
    const clicks: string[] = [];
    const chart = makeChart({
      expanders: true,
      onExpanderClick: ({ nodeId, slot, event }) =>
        void clicks.push(`${nodeId}:${slot}:${event.type}:${event.shiftKey}`),
      onPersonClick: ({ id, event }) => void clicks.push(`${id}:${event.type}`),
    });
    chart.update(OPEN);
    const marked = () =>
      document.querySelectorAll(
        '#svg [tabindex], #svg [role], #svg [aria-expanded], #svg [aria-label]',
      ).length;
    /** Presses a key on the element; true if nothing took the key. */
    const press = (element: Element, key: string, init: KeyboardEventInit = {}) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
          ...init,
        }),
      );
    const children = document.querySelector(
      'g.expander[data-slot="children"]',
    )!;
    const parents = document.querySelector(
      'g.expander:not([data-slot="children"])',
    )!;
    const person = document.querySelector('.person-region')!;

    // Off by default: no tab stops, and keys do nothing.
    expect(marked()).toBe(0);
    expect(press(children, 'Enter')).toBe(true);
    expect(press(person, 'Enter')).toBe(true);
    expect(clicks).toEqual([]);

    chart.patchConfig({ keyboard: true });
    expect(document.querySelector('.person-region')).toBe(person);
    for (const expander of [children, parents]) {
      expect(expander.getAttribute('tabindex')).toBe('0');
      expect(expander.getAttribute('role')).toBe('button');
      expect(expander.getAttribute('aria-expanded')).toBe('true');
    }
    expect(children.getAttribute('aria-label')).toBe('Children');
    expect(parents.getAttribute('aria-label')).toBe('Parents');
    expect(press(children, 'Enter', { shiftKey: true })).toBe(false);
    expect(press(children, ' ')).toBe(false);
    expect(press(children, 'a')).toBe(true);
    expect(press(children, 'Enter', { repeat: true })).toBe(true);
    expect(clicks).toEqual([
      'F_ROOT:children:click:true',
      'F_ROOT:children:click:false',
    ]);

    // People can be clicked, families cannot: no handler for them.
    expect(person.getAttribute('tabindex')).toBe('0');
    expect(person.getAttribute('role')).toBe('button');
    expect(document.querySelectorAll('.person-region[tabindex]')).toHaveLength(
      document.querySelectorAll('.person-region').length,
    );
    expect(document.querySelectorAll('.family-region[tabindex]')).toHaveLength(
      0,
    );
    clicks.length = 0;
    expect(press(person, 'Enter')).toBe(false);
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatch(/^I\d:click$/);

    // A folded branch says so.
    chart.update(FOLDED);
    expect(children.getAttribute('aria-expanded')).toBe('false');

    // The host names the expanders, with full node & state context, while narrower
    // ({ nodeId, slot }) => string callbacks stay assignable.
    const narrowLabel = ({ slot }: { nodeId: string; slot: Slot }) =>
      `fold ${slot}`;
    chart.patchConfig({ expanderLabel: narrowLabel });
    expect(children.getAttribute('aria-label')).toBe('fold children');

    const richLabel = (info: ExpanderLabelInfo) =>
      `${info.state}:${info.node.indiId ?? ''}:${info.slot}`;
    chart.patchConfig({ expanderLabel: richLabel });
    expect(children.getAttribute('aria-label')).toBe('plus:I1:children');

    // An earlier keydown listener calling preventDefault() suppresses synthetic click
    const cancelOnce = (e: Event) => e.preventDefault();
    children.addEventListener('keydown', cancelOnce, { capture: true, once: true });
    clicks.length = 0;
    expect(press(children, 'Enter')).toBe(false);
    expect(clicks).toEqual([]);

    // The handler goes without a drawing: the tab stop goes with it.
    expect(chart.patchConfig({ onPersonClick: undefined })).toBeUndefined();
    expect(document.querySelectorAll('.person-region[tabindex]')).toHaveLength(
      0,
    );
    expect(person.hasAttribute('role')).toBe(false);

    chart.patchConfig({ keyboard: false });
    expect(marked()).toBe(0);
    expect(press(children, 'Enter')).toBe(true);
  });

  it('strips keyboard attributes and disables activation on exiting nodes and expanders, rescues exiting elements, and guards duplicate default-links, single-dimension svg shrink, and bad viewState', async () => {
    const threeGen = createModelGraph({
      indis: [
        { id: 'I1', fams: ['F1'] },
        { id: 'I2', famc: 'F1', fams: ['F2'] },
        { id: 'I3', famc: 'F2' },
      ],
      fams: [
        { id: 'F1', husb: 'I1', children: ['I2'] },
        { id: 'F2', husb: 'I2', children: ['I3'] },
      ],
    });
    const clicks: string[] = [];
    let rescue = false;
    const rescueLayer: Layer<TextBoxTheme> = {
      id: 'rescue',
      slot: 'front',
      render({ group, layout, animation }) {
        let badge = group.querySelector<SVGElement>('rect.rescue');
        if (layout.nodes.length >= 3 || rescue) {
          if (!badge) badge = svgElement(group, 'rect', 'rescue');
          animation.move(badge, { width: 42 });
        } else if (badge) {
          animation.disappear(badge);
        }
      },
    };

    const svg = document.querySelector('#svg')!;

    const chart = makeChart({
      graph: threeGen,
      nodePlugin: createSimpleNodePlugin({ model: threeGen }),
      layers: [
        createDefaultLinkLayer(),
        createDefaultLinkLayer(),
        rescueLayer,
      ],
      animate: true,
      expanders: true,
      keyboard: true,
      onPersonClick: ({ id }) => void clicks.push(`p:${id}`),
      onExpanderClick: ({ nodeId, slot }) =>
        void clicks.push(`e:${nodeId}:${slot}`),
    });

    // Invalid viewState throws without corrupting chart state
    expect(() =>
      chart.update('I1' as unknown as { startIndi: string }),
    ).toThrow('{ startIndi }');

    chart.update({ startIndi: 'I1' });
    const f2Node = document.querySelector<SVGGElement>(
      'g.node[data-node-id="F2"]',
    )!;
    const f2Person = f2Node.querySelector<SVGElement>('.person-region')!;
    const f2Expander = document.querySelector<SVGGElement>(
      'g.expander[data-node-id="F2"]',
    )!;
    expect(f2Person.getAttribute('tabindex')).toBe('0');
    expect(f2Expander.getAttribute('tabindex')).toBe('0');

    // Simulate an <svg> that currently has only `height="900"` (no `width` attribute)
    // right before an animated shrink: `width` must not become `"NaN"`.
    svg.removeAttribute('width');
    svg.setAttribute('height', '900');
    chart.update({
      startIndi: 'I1',
      collapsed: new Set(['F1:children']),
    });
    expect(svg.getAttribute('width')).not.toBe('NaN');
    expect(Number.isFinite(Number(svg.getAttribute('width')))).toBe(true);
    expect(svg.getAttribute('height')).toBe('900');

    // Exiting node & expander lose keyboard attributes and ignore click/keydown during fade-out
    expect(f2Person.hasAttribute('tabindex')).toBe(false);
    expect(f2Person.hasAttribute('role')).toBe(false);
    expect(f2Expander.hasAttribute('tabindex')).toBe(false);
    expect(f2Expander.hasAttribute('aria-expanded')).toBe(false);
    f2Person.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    f2Expander.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    f2Expander.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    expect(clicks).toEqual([]);

    // Rescue rect.rescue AND re-enter exiting f2Expander + F2 node mid-fade (50ms into 200ms fade)
    await sleep(50);
    rescue = true;
    const rescued = chart.update({ startIndi: 'I1' });
    await rescued.finished;
    expect(document.querySelector('rect.rescue')).not.toBeNull();
    expect(document.querySelector('rect.rescue')!.getAttribute('width')).toBe(
      '42',
    );
    expect(f2Expander.isConnected).toBe(true);
    expect(f2Expander.hasAttribute('data-exiting')).toBe(false);
    expect(f2Expander.style.pointerEvents).toBe('');
    expect(f2Expander.getAttribute('tabindex')).toBe('0');
    expect(f2Expander.getAttribute('role')).toBe('button');
    expect(f2Expander.getAttribute('aria-expanded')).toBe('true');
    expect(f2Expander.getAttribute('aria-label')).toBe('Children');

    const reenteredNodes = document.querySelectorAll('g.node[data-node-id="F2"]');
    expect(reenteredNodes).toHaveLength(1);
    const reenteredPerson =
      reenteredNodes[0]!.querySelector<SVGElement>('.person-region')!;
    expect(reenteredPerson.getAttribute('tabindex')).toBe('0');

    f2Expander.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    reenteredPerson.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(clicks).toEqual(['e:F2:children', 'p:I2']);
  });

  it('interrupts detached transitions on dispose and leaving layers, unblocks finished on superseded async layers, keeps appear() delayed after cutShort, and preserves lastViewState when computeLayout throws', async () => {
    // 1. dispose() interrupts exiting nodes & resolves finished promptly
    const c1 = makeChart({ animate: true });
    c1.update(OPEN);
    const exitingChildNode = document.querySelector<SVGGElement>(
      'g.node[data-node-id="I3"]',
    )!;
    const collapseUpdate = c1.update(FOLDED);
    await sleep(20);
    expect(
      (exitingChildNode as unknown as { __transition?: unknown }).__transition,
    ).toBeTruthy();
    const t0 = Date.now();
    c1.dispose();
    await collapseUpdate.finished;
    expect(Date.now() - t0).toBeLessThan(80);
    expect(
      (exitingChildNode as unknown as { __transition?: unknown }).__transition,
    ).toBeUndefined();

    // 2. Removing a layer mid-disappear interrupts detached layer transitions
    document.body.innerHTML = '<svg id="svg"></svg>';
    let disappearingEl: SVGElement | undefined;
    const vanishLayer: Layer<TextBoxTheme> = {
      id: 'vanish',
      slot: 'front',
      render({ group, layout, animation }) {
        let el = group.querySelector<SVGElement>('rect.vanish');
        if (layout.nodes.length >= 3) {
          if (!el) el = svgElement(group, 'rect', 'vanish');
          animation.move(el, { width: 20 });
        } else if (el) {
          disappearingEl = el;
          animation.disappear(el);
        }
      },
    };
    const c2 = makeChart({ animate: true, layers: [vanishLayer] });
    c2.update(OPEN);
    c2.update(FOLDED);
    await sleep(20);
    expect(
      (disappearingEl as unknown as { __transition?: unknown }).__transition,
    ).toBeTruthy();
    c2.patchConfig({ layers: [] });
    expect(
      (disappearingEl as unknown as { __transition?: unknown }).__transition,
    ).toBeUndefined();

    // 3. Superseded/disposed async layer unblocks finished & late throw causes no unhandledRejection
    document.body.innerHTML = '<svg id="svg"></svg>';
    const hungLayer: Layer<TextBoxTheme> = {
      id: 'hung',
      slot: 'front',
      render() {
        return new Promise<void>(() => {});
      },
    };
    const c3 = makeChart({ animate: true, layers: [hungLayer] });
    const u1 = c3.update(OPEN);
    c3.update(FOLDED);
    c3.dispose();
    const settledQuickly = await Promise.race([
      u1.finished.then(() => true),
      sleep(80).then(() => false),
    ]);
    expect(settledQuickly).toBe(true);

    document.body.innerHTML = '<svg id="svg"></svg>';
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      const rejectingLayer: Layer<TextBoxTheme> = {
        id: 'rejecting',
        slot: 'back',
        render() {
          return new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('async boom')), 10),
          );
        },
      };
      const cReject = makeChart({
        layers: [rejectingLayer],
        onLayout() {
          throw new Error('sync onLayout throw');
        },
      });
      expect(() => cReject.update(OPEN)).toThrow('sync onLayout throw');
      await sleep(30);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    // 4. Async appear() after cutShort keeps opacity at 0 through the move phase
    document.body.innerHTML = '<svg id="svg"></svg>';
    let badgeEl: SVGElement | undefined;
    const asyncAppearLayer: Layer<TextBoxTheme> = {
      id: 'async-appear',
      slot: 'front',
      async render({ group, animation }) {
        let el = group.querySelector<SVGElement>('rect.badge');
        if (!el) el = svgElement(group, 'rect', 'badge');
        badgeEl = el;
        await sleep(20);
        animation.appear(el);
      },
    };
    const c4 = makeChart({ animate: true, layers: [asyncAppearLayer] });
    c4.update(OPEN);
    c4.update(FOLDED);
    await sleep(60);
    const uAppear = c4.update(OPEN);
    await sleep(400);
    expect(Number(badgeEl!.style.opacity)).toBe(0);
    await uAppear.finished;
    expect(badgeEl!.style.opacity).toBe('1');

    // 5. Throwing computeLayout does not overwrite lastViewState
    document.body.innerHTML = '<svg id="svg"></svg>';
    const basePlugin = createSimpleNodePlugin({ model: graph });
    const pickyPlugin: NodePlugin<TextBoxTheme> = {
      ...basePlugin,
      sizeNodes(nodes, ctx) {
        if (nodes.some((n) => n.indiId === 'I3')) {
          throw new Error('I3 measurement failed');
        }
        return basePlugin.sizeNodes(nodes, ctx);
      },
    };
    const c5 = makeChart({ nodePlugin: pickyPlugin });
    c5.update(FOLDED);
    expect(() => c5.update(OPEN)).toThrow('I3 measurement failed');
    const patched = c5.patchConfig({ theme: { linkColor: '#ff0000' } });
    expect(patched?.layout.nodes.map((n) => n.id)).toEqual(['F_PARENTS', 'F_ROOT']);
  });
});
