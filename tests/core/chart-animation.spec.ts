// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createChart,
  createFixedTextMeasurer,
  createLinkRouter,
  type ChartConfig,
  type ClickInfo,
  type Layer,
  type LayerRenderContext,
  type NodePlugin,
  type Slot,
  type StyleScheme,
} from '../../src/core/index.js';
import { DEFAULT_CORE_THEME } from '../../src/core/layout.js';
import { createModelGraph, type ModelData } from '../../src/model/index.js';
import { createSimpleNodePlugin } from '../../src/presets/index.js';
import type { TextBoxTheme } from '../../src/toolkit/index.js';

const SAMPLE_DATA: ModelData = {
  indis: [
    { id: 'I1', firstName: 'Alice', lastName: 'Smith', sex: 'F', famc: 'F_PARENTS', fams: ['F_ROOT'] },
    { id: 'I2', firstName: 'Bob', lastName: 'Jones', sex: 'M', fams: ['F_ROOT'] },
    { id: 'I3', firstName: 'Charlie', lastName: 'Jones', sex: 'M', famc: 'F_ROOT' },
    { id: 'I4', firstName: 'David', lastName: 'Smith', sex: 'M', fams: ['F_PARENTS'] },
    { id: 'I5', firstName: 'Eva', lastName: 'Smith', sex: 'F', fams: ['F_PARENTS'] },
  ],
  fams: [
    { id: 'F_PARENTS', husb: 'I4', wife: 'I5', children: ['I1'] },
    { id: 'F_ROOT', husb: 'I2', wife: 'I1', children: ['I3'] },
  ],
};

describe('Chart lifecycle, diffing, animation, style isolation, and expanders', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('places <style> immediately before g.topola-<id>, isolates multiple charts, and escapes </style', () => {
    document.body.innerHTML = `
      <svg id="svg1"></svg>
      <svg id="svg2"><g id="viewport"></g></svg>
    `;

    const graph = createModelGraph(SAMPLE_DATA);
    const plugin = createSimpleNodePlugin({ model: graph });

    const chart1 = createChart({
      svg: '#svg1',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: plugin,
        textMeasurer: createFixedTextMeasurer(),
        overrideCss: '/* test </style><script>alert(1)</script> */',
      },
    });
    const { layout: l1 } = chart1.update({ startIndi: 'I1' });

    const svg1 = document.querySelector('#svg1')!;
    expect(svg1.getAttribute('width')).toBe(String(l1.size[0]));
    expect(svg1.getAttribute('height')).toBe(String(l1.size[1]));

    const firstChild = svg1.children[0]!;
    const secondChild = svg1.children[1]!;
    expect(firstChild.tagName.toLowerCase()).toBe('style');
    expect(secondChild.tagName.toLowerCase()).toBe('g');
    expect(firstChild.textContent).not.toContain('</style>');
    expect(firstChild.textContent).toContain('<\\/style>');

    const scopeClass1 = secondChild.getAttribute('class')!;
    expect(scopeClass1).toMatch(/^topola-\d+$/);
    expect(firstChild.textContent).toContain(`.${scopeClass1} text`);

    // Second chart mounted inside <g id="viewport"> (like topola-viewer)
    const viewportG = document.querySelector('#viewport') as unknown as SVGGElement;
    viewportG.setAttribute('transform', 'scale(1.5)');

    const chart2 = createChart({
      svg: viewportG,
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: plugin,
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    chart2.update({ startIndi: 'I1' });

    // Outer <g id="viewport"> transform is untouched and svg2 width/height are untouched!
    expect(viewportG.getAttribute('transform')).toBe('scale(1.5)');
    expect(document.querySelector('#svg2')!.getAttribute('width')).toBeNull();
    const scopeClass2 = viewportG.children[1]!.getAttribute('class')!;
    expect(scopeClass2).not.toBe(scopeClass1);

    chart1.dispose();
    chart2.dispose();
    expect(svg1.children.length).toBe(0);
    expect(viewportG.children.length).toBe(0);
  });

  it('retains unchanged node DOM, refreshes scheme classes in place, and redraws on a spouse swap or a generation change', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(SAMPLE_DATA);
    const plugin = createSimpleNodePlugin({ model: graph });

    const clicks: ClickInfo[] = [];
    const dynamicScheme: StyleScheme = {
      id: 'focus',
      classifyPerson: ({ generation, viewState }) =>
        `start-${viewState.startIndi}-gen-${generation}`,
    };

    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: plugin,
        schemes: [dynamicScheme],
        textMeasurer: createFixedTextMeasurer(),
        onPersonClick: (info) => clicks.push(info),
      },
    });
    const backgroundOf = (nodeId: string) =>
      document.querySelector(
        `g.node[data-node-id="${nodeId}"] rect.background`,
      )!;

    // Initial render starting at I1 (wife in F_ROOT -> indiId=I1, spouseId=I2)
    chart.update({ startIndi: 'I1', baseGeneration: 0 });
    const parentsBefore = backgroundOf('F_PARENTS');
    const rootBefore = backgroundOf('F_ROOT');

    // Navigate to I3, the child of F_ROOT, one generation below I1.
    // F_PARENTS keeps its people, size and generation, so its DOM is kept.
    // F_ROOT swaps its partners (and stops being the root), so it is redrawn.
    chart.update({ startIndi: 'I3', baseGeneration: 1 });
    expect(backgroundOf('F_PARENTS')).toBe(parentsBefore);
    expect(backgroundOf('F_ROOT')).not.toBe(rootBefore);

    // Scheme classes are refreshed on the kept node.
    const davidRegion = () =>
      document.querySelector(
        'g.node[data-node-id="F_PARENTS"] .person-region',
      ) as SVGElement;
    expect(davidRegion().getAttribute('class')).toContain('start-I3-gen--1');
    expect(davidRegion().getAttribute('class')).not.toContain('start-I1');

    // A plug-in may draw a node from its generation, so a node whose
    // generation changes is redrawn.
    chart.update({ startIndi: 'I3', baseGeneration: 11 });
    expect(backgroundOf('F_PARENTS')).not.toBe(parentsBefore);
    expect(davidRegion().getAttribute('class')).toContain('start-I3-gen-9');

    davidRegion().dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: true }),
    );
    expect(clicks.length).toBe(1);
    expect(clicks[0]!.id).toBe('I4');
    expect(clicks[0]!.generation).toBe(9);
    expect(clicks[0]!.modifiers.shiftKey).toBe(true);

    chart.dispose();
  });

  it('gives layers schemes, view state, measurer and theme defaults, scopes override CSS, reports every layout, and replaces the config', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(SAMPLE_DATA);
    type ProbeTheme = TextBoxTheme & { tint: string; gap: number };

    const measurer = createFixedTextMeasurer();
    const scheme: StyleScheme = { id: 'probe-scheme' };
    let renderCtx: LayerRenderContext<ProbeTheme> | undefined;
    let boundsCtx: { theme: ProbeTheme; measurer: unknown } | undefined;
    const layer: Layer<ProbeTheme> = {
      id: 'probe',
      slot: 'back',
      defaultTheme: { tint: 'layer-default', gap: 1 },
      getBounds(_layout, ctx) {
        boundsCtx = ctx;
        return null;
      },
      render(ctx) {
        renderCtx = ctx;
      },
    };
    const nodePlugin: NodePlugin<ProbeTheme> = {
      ...createSimpleNodePlugin({ model: graph }),
      defaultTheme: { tint: 'plugin-default', siblingSpacing: 77 },
    };

    const layouts: Array<{ width: number; animated: boolean }> = [];
    const config: ChartConfig<ProbeTheme> = {
      graph,
      chart: 'hourglass',
      nodePlugin,
      layers: [layer],
      schemes: [scheme],
      theme: { gap: 5 },
      textMeasurer: measurer,
      overrideCss: '{scope} .link { stroke: red; }',
      onLayout: (layout, info) =>
        layouts.push({ width: layout.size[0], animated: info.animated }),
    };
    const chart = createChart<ProbeTheme>({ svg: '#svg', config });
    const css = () => document.querySelector('#svg style')!.textContent!;
    const scope = () =>
      `.${document.querySelector('#svg > g')!.getAttribute('class')}`;

    chart.update({ startIndi: 'I1' });

    // Theme: core defaults < plug-in defaults < layer defaults < config.
    expect(renderCtx!.theme.siblingSpacing).toBe(77);
    expect(renderCtx!.theme.tint).toBe('layer-default');
    expect(renderCtx!.theme.gap).toBe(5);
    expect(boundsCtx!.theme.gap).toBe(5);
    expect(boundsCtx!.measurer).toBe(measurer);
    expect(renderCtx!.measurer).toBe(measurer);
    expect(renderCtx!.schemes).toEqual([scheme]);
    expect(renderCtx!.viewState.startIndi).toBe('I1');

    // {scope} in the override CSS becomes the selector of this chart.
    expect(css()).toContain(`${scope()} .link { stroke: red; }`);
    expect(css()).not.toContain('{scope}');

    // Every layout is reported: update, config changes that redraw, remeasure.
    expect(layouts.length).toBe(1);
    chart.patchConfig({ theme: { gap: 9 } });
    expect(layouts.length).toBe(2);
    expect(renderCtx!.theme.gap).toBe(9);
    chart.patchConfig({ animate: false });
    expect(layouts.length).toBe(2);
    chart.remeasure();
    expect(layouts.length).toBe(3);

    // A config change can come with a new view state: one layout, not two.
    chart.patchConfig({ theme: { gap: 2 } }, { startIndi: 'I3' });
    expect(layouts.length).toBe(4);
    expect(renderCtx!.viewState.startIndi).toBe('I3');
    expect(layouts.every((l) => !l.animated && l.width > 0)).toBe(true);

    // Replacing the config drops everything the new config does not mention.
    expect(document.querySelector('g[data-layer-id="probe"]')).not.toBeNull();
    chart.setConfig({
      graph,
      chart: 'hourglass',
      nodePlugin: createSimpleNodePlugin({ model: graph }),
      textMeasurer: measurer,
    });
    expect(document.querySelector('g[data-layer-id="probe"]')).toBeNull();
    expect(css()).not.toContain('stroke: red');
    // The old onLayout is gone as well.
    expect(layouts.length).toBe(4);

    chart.dispose();
  });

  it('animates elements of layers with the animation helpers', async () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(SAMPLE_DATA);

    // A layer with one lasting bar and one label that is replaced every time.
    let renders = 0;
    const layer: Layer = {
      id: 'helpers',
      slot: 'front',
      render({ group, animation }) {
        renders++;
        const doc = group.ownerDocument;
        let bar = group.querySelector<SVGElement>('rect.bar');
        if (!bar) {
          bar = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
          bar.setAttribute('class', 'bar');
          bar.setAttribute('width', '0');
          group.appendChild(bar);
        }
        animation.move(bar, { width: renders * 100 });

        for (const old of group.querySelectorAll<SVGElement>('text.current')) {
          old.setAttribute('class', 'old');
          animation.disappear(old);
        }
        const label = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'current');
        label.textContent = `render ${renders}`;
        group.appendChild(label);
        animation.appear(label);
      },
    };
    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        animate: true,
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        layers: [layer],
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    const bar = () => document.querySelector('rect.bar') as SVGElement;
    const labels = () =>
      Array.from(document.querySelectorAll<SVGElement>('#svg text'))
        .filter((el) => /^render/.test(el.textContent ?? ''))
        .map((el) => `${el.textContent}@${el.style.opacity || '1'}`);

    // The first drawing is never animated: everything happens at once.
    await chart.update({ startIndi: 'I1' }).finished;
    expect(bar().getAttribute('width')).toBe('100');
    expect(labels()).toEqual(['render 1@1']);

    // The same view state again, so that only the layer has something to do.
    const second = chart.update({ startIndi: 'I1' });
    expect(bar().getAttribute('width')).toBe('100');
    expect(labels()).toEqual(['render 1@1', 'render 2@0']);
    await second.finished;
    expect(bar().getAttribute('width')).toBe('200');
    expect(labels()).toEqual(['render 2@1']);

    // Remeasuring draws at once, also in an animated chart.
    chart.remeasure();
    expect(bar().getAttribute('width')).toBe('300');
    expect(labels()).toEqual(['render 3@1']);

    // Without animation the helpers act at once as well.
    chart.patchConfig({ animate: false });
    chart.update({ startIndi: 'I1' });
    expect(bar().getAttribute('width')).toBe('400');
    expect(labels()).toEqual(['render 4@1']);

    chart.dispose();
  });

  it('resizes a node in place when only its size changes, redraws it when its content changes, and resumes an interrupted resize', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(SAMPLE_DATA);
    const base = createSimpleNodePlugin({ model: graph });

    // A plug-in whose nodes grow on demand, and that tells what it is asked.
    let extra = 0;
    let drawn: string[] = [];
    let resized: string[] = [];
    let rootSizes: number[] = [];
    let rootDrawnSizes: number[] = [];
    const plugin: typeof base = {
      ...base,
      sizeNodes(nodes, ctx) {
        const measured = base.sizeNodes(nodes, ctx);
        for (const node of measured.values()) {
          node.extents = {
            ...node.extents,
            alongAfter: node.extents.alongAfter + extra,
          };
        }
        return measured;
      },
      drawNode(group, node, ctx) {
        drawn.push(node.id);
        if (node.id === 'F_ROOT') {
          rootDrawnSizes.push(node.extents.alongAfter);
        }
        base.drawNode(group, node, ctx);
      },
      resizeNode(group, node, ctx) {
        resized.push(node.id);
        if (node.id === 'F_ROOT') {
          rootSizes.push(node.extents.alongAfter);
        }
        base.resizeNode!(group, node, ctx);
      },
    };
    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: plugin,
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    const backgroundOf = (nodeId: string) =>
      document.querySelector(
        `g.node[data-node-id="${nodeId}"] rect.background`,
      )!;
    const reset = () => {
      drawn = [];
      resized = [];
      rootSizes = [];
      rootDrawnSizes = [];
    };
    const allNodes = ['F_PARENTS', 'F_ROOT', 'I3'];

    // New nodes are drawn.
    chart.update({ startIndi: 'I1' });
    expect(drawn.sort()).toEqual(allNodes);
    expect(resized).toEqual([]);
    const rootBackground = backgroundOf('F_ROOT');

    // The same nodes at another size are resized, not drawn again.
    reset();
    extra = 10;
    chart.update({ startIndi: 'I1' });
    expect(drawn).toEqual([]);
    expect(resized.sort()).toEqual(allNodes);
    expect(backgroundOf('F_ROOT')).toBe(rootBackground);

    // Nothing changed: nothing to do.
    reset();
    chart.update({ startIndi: 'I1' });
    expect(drawn).toEqual([]);
    expect(resized).toEqual([]);

    // Other content (here another generation) means drawing again, also when
    // the size changes at the same time.
    reset();
    extra = 20;
    chart.update({ startIndi: 'I1', baseGeneration: 5 });
    expect(drawn.sort()).toEqual(allNodes);
    expect(resized).toEqual([]);

    // An animated resize that is interrupted by the next update is taken up
    // again, although the size is the same as in the interrupted update...
    chart.patchConfig({ animate: true });
    reset();
    extra = 30;
    chart.update({ startIndi: 'I1', baseGeneration: 5 });
    expect(resized.sort()).toEqual(allNodes);
    reset();
    chart.update({ startIndi: 'I1', baseGeneration: 5 });
    expect(resized.sort()).toEqual(allNodes);

    // ...until an update has brought it to its end.
    chart.patchConfig({ animate: false });
    reset();
    chart.update({ startIndi: 'I1', baseGeneration: 5 });
    expect(resized.sort()).toEqual(allNodes);
    reset();
    chart.update({ startIndi: 'I1', baseGeneration: 5 });
    expect(resized).toEqual([]);
    expect(drawn).toEqual([]);

    // An interrupted resize that goes back to the size it started from is
    // called for as well: the node may be anywhere in between.
    chart.patchConfig({ animate: true });
    extra = 40;
    chart.update({ startIndi: 'I1', baseGeneration: 5 });
    reset();
    extra = 30;
    chart.update({ startIndi: 'I1', baseGeneration: 5 });
    expect(drawn).toEqual([]);
    expect(resized.sort()).toEqual(allNodes);

    // Content and size changing together in an animated update: the node is
    // drawn again at the size it showed, and resized from there. Each of the
    // two is called once.
    reset();
    extra = 50;
    chart.update({ startIndi: 'I1', baseGeneration: 7 });
    expect(drawn.sort()).toEqual(allNodes);
    expect(resized.sort()).toEqual(allNodes);
    expect(rootDrawnSizes).toHaveLength(1);
    expect(rootSizes).toHaveLength(1);
    expect(rootSizes[0]! - rootDrawnSizes[0]!).toBe(20);
    const rootSize = rootSizes[0]!;

    // Without animation the node is drawn at its new size right away.
    chart.patchConfig({ animate: false });
    reset();
    extra = 60;
    chart.update({ startIndi: 'I1', baseGeneration: 9 });
    expect(drawn.sort()).toEqual(allNodes);
    expect(resized).toEqual([]);
    expect(rootDrawnSizes).toEqual([rootSize + 10]);

    chart.dispose();
  });

  it('exposes the routes of links that the default link layer draws', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(SAMPLE_DATA);
    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    const { layout } = chart.update({ startIndi: 'I1' });
    const route = createLinkRouter(layout, DEFAULT_CORE_THEME);

    const drawn = Array.from(
      document.querySelectorAll<SVGPathElement>('path.link'),
    ).map((path) => path.getAttribute('d'));
    const routed = layout.links.map((link) =>
      route(link)
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' '),
    );
    expect(layout.links.length).toBe(2);
    expect(routed.sort()).toEqual(drawn.sort());
    // A parent-child link is an elbow of four corner points.
    expect(route(layout.links[0]!).length).toBe(4);

    chart.dispose();
  });

  it('draws a straight marriage link with four points, so that it can morph into a stepped one', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    // Both parents of I1 have another marriage: one is next to the main
    // marriage (a straight link), the other is one further out (a stepped one).
    const graph = createModelGraph({
      indis: [
        { id: 'I1', firstName: 'Start', famc: 'F_MAIN' },
        { id: 'I2', firstName: 'Father', sex: 'M', fams: ['F_EXTRA_H', 'F_MAIN'] },
        { id: 'I3', firstName: 'Mother', sex: 'F', fams: ['F_MAIN', 'F_EXTRA_W'] },
        { id: 'I4', firstName: 'SecondWife', sex: 'F', fams: ['F_EXTRA_H'] },
        { id: 'I5', firstName: 'SecondHusb', sex: 'M', fams: ['F_EXTRA_W'] },
      ],
      fams: [
        { id: 'F_MAIN', husb: 'I2', wife: 'I3', children: ['I1'] },
        { id: 'F_EXTRA_H', husb: 'I2', wife: 'I4' },
        { id: 'F_EXTRA_W', husb: 'I5', wife: 'I3' },
      ],
    });
    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'relatives',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    const { layout } = chart.update({ startIndi: 'I1' });
    const route = createLinkRouter(layout, DEFAULT_CORE_THEME);

    // The routes have the corner points of the two shapes...
    const marriageLinks = layout.links.filter(
      (link) => link.kind === 'additionalMarriage',
    );
    const routes = marriageLinks.map(route);
    expect(routes.map((r) => r.length).sort()).toEqual([2, 4]);

    // ...but both are drawn as paths of four points.
    const drawn = Array.from(
      document.querySelectorAll<SVGPathElement>('path.additional-marriage'),
    ).map((path) => path.getAttribute('d')!);
    expect(drawn.map((d) => d.split('L').length).sort()).toEqual([4, 4]);
    const [from, to] = routes.find((r) => r.length === 2)!;
    expect(drawn).toContain(
      `M ${from!.x} ${from!.y} L ${from!.x} ${from!.y} L ${to!.x} ${to!.y} L ${to!.x} ${to!.y}`,
    );

    chart.dispose();
  });

  it('supports directional [+] / [-] expanders and properly updates the + vertical line on state toggles', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(SAMPLE_DATA);
    const plugin = createSimpleNodePlugin({ model: graph });

    const expanderEvents: Array<{ nodeId: string; slot: Slot }> = [];
    const collapsed = new Set<`${string}:${Slot}`>();

    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        direction: 'right',
        expanders: true,
        nodePlugin: plugin,
        textMeasurer: createFixedTextMeasurer(),
        onExpanderClick: ({ nodeId, slot }) => {
          expanderEvents.push({ nodeId, slot });
          const key: `${string}:${Slot}` = `${nodeId}:${slot}`;
          if (collapsed.has(key)) collapsed.delete(key);
          else collapsed.add(key);
          chart.update({ startIndi: 'I1', collapsed });
        },
      },
    });

    chart.update({ startIndi: 'I1', collapsed });

    const childrenExp = document.querySelector(
      'g.expander[data-expander-key="F_ROOT:children"]',
    ) as SVGGElement;
    expect(childrenExp).not.toBeNull();
    expect(childrenExp.getAttribute('data-state')).toBe('minus');
    const vLine = childrenExp.querySelector('line.expander-v') as SVGLineElement;
    expect(vLine.style.display).toBe('none');
    expect(document.querySelector('g.node[data-node-id="I3"]')).not.toBeNull();

    // Click [-] to collapse children -> toggles to [+], hides I3, shows vertical line without duplicating lines
    childrenExp.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(expanderEvents).toEqual([{ nodeId: 'F_ROOT', slot: 'children' }]);
    expect(childrenExp.getAttribute('data-state')).toBe('plus');
    expect(vLine.style.display).toBe('');
    expect(childrenExp.querySelectorAll('line').length).toBe(2);
    expect(document.querySelector('g.node[data-node-id="I3"]')).toBeNull();

    // Click [+] to re-expand children -> toggles back to [-]
    childrenExp.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(childrenExp.getAttribute('data-state')).toBe('minus');
    expect(vLine.style.display).toBe('none');
    expect(document.querySelector('g.node[data-node-id="I3"]')).not.toBeNull();

    chart.dispose();
  });

  it.each([
    ['with', true],
    ['without', false],
  ] as const)('glides swapped spouse boxes inside a redrawn couple node instead of swapping them instantly (plug-in %s a resize step)', async (_name, resizable) => {
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
    const graph = createModelGraph(SAMPLE_DATA);
    // With a resize step the plug-in moves the boxes; without one the chart
    // does, as long as the boxes are placed with a transform.
    const nodePlugin = { ...createSimpleNodePlugin({ model: graph }) };
    if (!resizable) {
      delete nodePlugin.resizeNode;
    }
    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        animate: true,
        nodePlugin,
        textMeasurer: createFixedTextMeasurer(),
      },
    });

    const personBox = (name: string): SVGElement =>
      Array.from(
        document.querySelectorAll<SVGElement>(
          'g.node[data-node-id="F_ROOT"] .person-region',
        ),
      ).find((el) => el.textContent?.includes(name))!;
    const offsetX = (name: string): number =>
      Number(
        /translate\(\s*(-?[\d.]+)/.exec(
          personBox(name).getAttribute('transform')!,
        )![1],
      );

    // Alice (I1) is the start person, so she is on the indi (left) side.
    await chart.update({ startIndi: 'I1' }).finished;
    const aliceStart = offsetX('Alice');
    const bobStart = offsetX('Bob');
    expect(aliceStart).toBeLessThan(0);
    expect(bobStart).toBe(0);

    // Selecting her spouse swaps the two boxes. The node is redrawn, but the
    // boxes must start from where they were...
    const swap = chart.update({ startIndi: 'I2' });
    expect(offsetX('Alice')).toBe(aliceStart);
    expect(offsetX('Bob')).toBe(bobStart);

    // ...and glide to the swapped positions.
    await swap.finished;
    expect(offsetX('Alice')).toBe(0);
    expect(offsetX('Bob')).toBeLessThan(0);
    const bobSwapped = offsetX('Bob');

    // A swap interrupted by an update that does not redraw the node still
    // ends with the boxes in their resting places.
    chart.update({ startIndi: 'I1' });
    await new Promise((r) => setTimeout(r, 400));
    expect(offsetX('Bob')).toBeGreaterThan(bobSwapped);
    expect(offsetX('Bob')).toBeLessThan(0);
    await chart.update({ startIndi: 'I1' }).finished;
    expect(offsetX('Alice')).toBe(aliceStart);
    expect(offsetX('Bob')).toBe(0);

    chart.dispose();
    delete (window.SVGElement.prototype as { transform?: unknown }).transform;
  });

  it('resolves animated transitions cleanly, interrupts mid-flight updates, and remeasures on document.fonts loadingdone', async () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(SAMPLE_DATA);
    const plugin = createSimpleNodePlugin({ model: graph });

    let factor = 0.6;
    let invalidateCalls = 0;
    const customMeasurer = {
      measureWidth(text: string, font: { fontSize: number }) {
        return Math.ceil(text.length * font.fontSize * factor);
      },
      invalidate() {
        invalidateCalls++;
      },
    };

    const listeners = new Map<string, Set<(event?: unknown) => void>>();
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        check: () => true,
        addEventListener: (type: string, fn: (event?: unknown) => void) => {
          const set = listeners.get(type) ?? new Set();
          set.add(fn);
          listeners.set(type, set);
        },
        removeEventListener: (type: string, fn: (event?: unknown) => void) => {
          listeners.get(type)?.delete(fn);
        },
      },
    });

    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        animate: true,
        expanders: true,
        nodePlugin: plugin,
        textMeasurer: customMeasurer,
      },
    });

    // Initial render is static even when animate: true
    const first = chart.update({ startIndi: 'I1' });
    await first.finished;
    const initialWidth = first.layout.size[0];

    // Start an animated update and interrupt it mid-flight with a second update
    const mid1 = chart.update({ startIndi: 'I3' });
    await new Promise((r) => setTimeout(r, 30));
    const mid2 = chart.update({ startIndi: 'I1' });

    // Both promises must settle cleanly without hanging!
    await Promise.all([mid1.finished, mid2.finished]);

    // A font the chart is not drawn with (e.g. a UI font of the host page)
    // finishes loading -> nothing to remeasure.
    const fireLoadingDone = (event?: unknown) => {
      for (const fn of listeners.get('loadingdone') ?? []) {
        fn(event);
      }
    };
    fireLoadingDone({ fontfaces: [{ family: 'Lato' }] });
    expect(invalidateCalls).toBe(0);
    // A font of the chart's theme does trigger remeasure().
    fireLoadingDone({ fontfaces: [{ family: '"Montserrat"' }] });
    expect(invalidateCalls).toBe(1);

    // Simulate web font loading finishing -> triggers remeasure() automatically
    factor = 0.85;
    const setConfigSpy = vi.fn();
    void setConfigSpy;
    for (const fn of listeners.get('loadingdone') ?? []) {
      fn();
    }
    expect(invalidateCalls).toBeGreaterThanOrEqual(1);
    const afterFontWidth = Number(
      document.querySelector('#svg')!.getAttribute('width'),
    );
    expect(afterFontWidth).toBeGreaterThan(initialWidth);

    chart.dispose();
    expect(listeners.get('loadingdone')?.size ?? 0).toBe(0);
  });
});
