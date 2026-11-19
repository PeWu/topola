// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  computeLayout,
  createChart,
  createFixedTextMeasurer,
} from '../../src/core/index.js';
import { resolveChartTheme } from '../../src/core/layout.js';
import {
  createCoupleAssembler,
  drawBoxParts,
  resizeBoxParts,
  type BoxPart,
} from '../../src/toolkit/index.js';
import { createModelGraph, type ModelData } from '../../src/model/index.js';
import {
  createCircleNodePlugin,
  createDetailedNodePlugin,
  createFancyConfig,
  createSimpleNodePlugin,
} from '../../src/presets/index.js';
import { simpleContent } from '../../src/presets/simple.js';

describe('Presets (Simple, Detailed) and Toolkit (TextBox, CoupleAssembler)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const data: ModelData = {
    indis: [
      {
        id: 'private_very_long_wikitree_identifier_12345',
        firstName: 'Jan',
        lastName: 'Kowalski',
        sex: 'M',
        birth: {
          date: { day: 12, month: 5, year: 1890 },
          place: 'Warszawa',
          confidence: 1,
        },
        death: { confirmed: true },
        images: [{ url: 'https://example.com/jan.jpg' }],
        fams: ['F1'],
        extras: { occupation: 'Blacksmith' },
      },
      {
        id: 'I2',
        firstName: 'Anna',
        lastName: 'Kowalska',
        maidenName: 'Nowak',
        sex: 'F',
        images: [{ url: 'javascript:alert(1)' }], // unsafe scheme -> must be filtered!
        fams: ['F1'],
      },
    ],
    fams: [
      {
        id: 'F1',
        husb: 'private_very_long_wikitree_identifier_12345',
        wife: 'I2',
        marriage: {
          date: { year: 1915 },
          place: 'Kraków',
          confidence: 0,
        },
      },
    ],
  };

  it('formats Detailed maiden names, QUAY ? suffixes, confirmed death +, portraits, and rejects unsafe image URLs', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(data);
    const plugin = createDetailedNodePlugin({ model: graph, locale: 'en' });

    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: plugin,
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    chart.update({ startIndi: 'I2' });

    const texts = Array.from(document.querySelectorAll('text')).map(
      (t) => t.textContent,
    );
    expect(texts).toContain('Kowalska (Nowak)');
    expect(texts).toContain('12 May 1890 ?');
    expect(texts).toContain('1915 ?');
    expect(texts).toContain('\u26AD');
    expect(texts).toContain('+');

    const images = Array.from(document.querySelectorAll('image'));
    expect(images.length).toBe(1);
    expect(images[0]!.getAttribute('href')).toBe('https://example.com/jan.jpg');

    chart.dispose();
  });

  it('supports boolean and predicate hideId/hideSex and excludes hidden badges from box width', () => {
    const narrowPersonData: ModelData = {
      indis: [
        {
          id: 'private_extremely_long_identifier_that_widens_box_significantly_99999',
          firstName: 'Al',
          sex: 'M',
        },
      ],
      fams: [],
    };
    const graph = createModelGraph(narrowPersonData);
    const measurer = createFixedTextMeasurer();

    const withIdLayout = computeLayout(
      { startIndi: narrowPersonData.indis[0]!.id },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: createDetailedNodePlugin({ model: graph }),
        textMeasurer: measurer,
      },
    );

    const hiddenByPredicateLayout = computeLayout(
      { startIndi: narrowPersonData.indis[0]!.id },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: createDetailedNodePlugin({
          model: graph,
          hideId: (p) => p.id.startsWith('private_'),
          hideSex: true,
        }),
        textMeasurer: measurer,
      },
    );

    expect(hiddenByPredicateLayout.nodes[0]!.bounds.width).toBeLessThan(
      withIdLayout.nodes[0]!.bounds.width,
    );
  });

  it('supports custom external Simple + occupation variant, namespace override, and unknown line-role fallback with Problem reporting', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(data);
    const measurer = createFixedTextMeasurer();

    const customPlugin = createSimpleNodePlugin({
      model: graph,
      namespace: 'simple-occu',
      content: (ctx) => {
        const base = simpleContent(ctx);
        const occu = ctx.person?.extras?.occupation as string | undefined;
        return {
          lines: [
            ...(base.lines ?? []),
            ...(occu ? [{ role: 'undeclaredRole', text: occu }] : []),
          ],
        };
      },
    });

    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: customPlugin,
        textMeasurer: measurer,
      },
    });

    const { layout } = chart.update({ startIndi: 'I2' });
    expect(
      layout.problems.some(
        (p) =>
          p.code === 'UNKNOWN_LINE_ROLE' && p.entityId === 'undeclaredRole',
      ),
    ).toBe(true);
    expect(document.querySelector('g.simple-occu')).not.toBeNull();
    expect(document.querySelector('style')!.textContent).toContain(
      '.simple-occu',
    );
    const texts = Array.from(document.querySelectorAll('text')).map(
      (t) => t.textContent,
    );
    expect(texts).toContain('Blacksmith');

    chart.dispose();
  });

  it('resizes text boxes in place: frames, badges, portraits and centred text follow the new size', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const data: ModelData = {
      indis: [
        {
          id: 'I1',
          firstName: 'Anna',
          lastName: 'Kowalska',
          sex: 'F',
          fams: ['F1'],
          birth: { date: { year: 1900 } },
          images: [{ url: 'https://example.com/anna.jpg' }],
        },
        { id: 'I2', firstName: 'Jan', sex: 'M', fams: ['F1'] },
      ],
      fams: [{ id: 'F1', husb: 'I2', wife: 'I1' }],
    };
    const graph = createModelGraph(data);
    const plugin = createDetailedNodePlugin({ model: graph });
    const config = {
      graph,
      chart: 'hourglass' as const,
      nodePlugin: plugin,
      textMeasurer: createFixedTextMeasurer(),
    };
    const chart = createChart({ svg: '#svg', config });
    const { layout } = chart.update({ startIndi: 'I1' });
    const node = layout.nodes[0]!;
    const group = document.querySelector<SVGGElement>('g.node')!;
    const annaGroup = group.querySelector<SVGGElement>(
      '[data-topola-region="person:I1"]',
    )!;
    const attributes = (selector: string, root: Element = annaGroup) => {
      const el = root.querySelector(selector)!;
      return Object.fromEntries(
        Array.from(el.attributes).map((a) => [a.name, a.value]),
      );
    };
    const before = {
      elements: Array.from(annaGroup.children),
      frame: attributes('rect.frame'),
      name: attributes('text.name'),
      id: attributes('text.id'),
      image: attributes('image'),
      clip: attributes('clipPath rect'),
      box: annaGroup.getAttribute('transform'),
    };

    // The node 30px taller and 20px wider, as after a change of its row.
    const grown = {
      ...node,
      regions: node.regions.map((r) =>
        r.kind === 'person'
          ? { ...r, y: r.y - 30, width: r.width + 20, height: r.height + 30 }
          : r,
      ),
    };
    const moved: Element[] = [];
    plugin.resizeNode!(group, grown, {
      direction: 'down',
      theme: resolveChartTheme(config),
      // Stands in for the chart: applies every change at once.
      animation: {
        move(element, changes) {
          moved.push(element);
          for (const [name, value] of Object.entries(changes)) {
            element.setAttribute(name, String(value));
          }
        },
        appear() {},
        disappear(element) {
          element.remove();
        },
      },
    });

    // The same elements, adapted.
    expect(Array.from(annaGroup.children)).toEqual(before.elements);
    const frame = attributes('rect.frame');
    expect(Number(frame.width)).toBe(Number(before.frame.width) + 20);
    expect(Number(frame.height)).toBe(Number(before.frame.height) + 30);
    expect(frame.rx).toBe(before.frame.rx);
    // The box itself moved up with its top edge.
    const boxY = (transform: string | null) =>
      Number(/,\s*(-?[\d.]+)\)/.exec(transform ?? '')![1]);
    expect(boxY(annaGroup.getAttribute('transform'))).toBe(
      boxY(before.box) - 30,
    );
    // The centred name follows the wider text area; its line stays put.
    const xy = (t: string) =>
      /translate\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(t)!.slice(1).map(Number);
    expect(xy(attributes('text.name').transform!)).toEqual([
      xy(before.name.transform!)[0]! + 10,
      xy(before.name.transform!)[1]!,
    ]);
    // The id badge stays at the bottom.
    expect(xy(attributes('text.id').transform!)).toEqual([
      xy(before.id.transform!)[0]!,
      xy(before.id.transform!)[1]! + 30,
    ]);
    // The portrait stays at the right edge, as tall as the box, clipped to it.
    expect(xy(attributes('image').transform!)[0]).toBe(
      xy(before.image.transform!)[0]! + 20,
    );
    expect(Number(attributes('image').height)).toBe(
      Number(before.image.height) + 30,
    );
    expect(attributes('image')['clip-path']).toBe(before.image['clip-path']);
    expect(Number(attributes('clipPath rect').width)).toBe(
      Number(before.clip.width) + 20,
    );
    // Jan's box is in the same node and of the same row: it grew as well.
    expect(
      moved.some(
        (el) =>
          el.getAttribute('data-topola-region') === 'person:I2' ||
          el.closest('[data-topola-region="person:I2"]') !== null,
      ),
    ).toBe(true);

    chart.dispose();
  });

  it('draws a box without a resize step again inside its group when the node is resized', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph({ indis: [{ id: 'I1' }], fams: [] });
    // A custom box that can only draw itself.
    const plugin = createCoupleAssembler({
      personBox: {
        namespace: 'plain',
        defaultTheme: {},
        getCss: () => '',
        measureBox: () => ({ width: 40, height: 20 }),
        drawBox(group, _item, width, height) {
          drawBoxParts(group, [{ tag: 'rect', sized: { width, height } }]);
        },
      },
    });
    const config = {
      graph,
      chart: 'hourglass' as const,
      nodePlugin: plugin,
      textMeasurer: createFixedTextMeasurer(),
    };
    const chart = createChart({ svg: '#svg', config });
    const { layout } = chart.update({ startIndi: 'I1' });
    const group = document.querySelector<SVGGElement>('g.node')!;
    const boxGroup = group.querySelector('[data-topola-region="person:I1"]')!;
    const rectBefore = boxGroup.querySelector('rect')!;
    expect(rectBefore.getAttribute('height')).toBe('20');

    const node = layout.nodes[0]!;
    plugin.resizeNode!(
      group,
      { ...node, regions: node.regions.map((r) => ({ ...r, height: 50 })) },
      {
        direction: 'down',
        theme: resolveChartTheme(config),
        animation: {
          move(element, changes) {
            for (const [name, value] of Object.entries(changes)) {
              element.setAttribute(name, String(value));
            }
          },
          appear() {},
          disappear() {},
        },
      },
    );
    // The group (which is what the chart has marked) stays, its content is new.
    expect(group.querySelector('[data-topola-region="person:I1"]')).toBe(
      boxGroup,
    );
    expect(boxGroup.querySelectorAll('rect').length).toBe(1);
    expect(boxGroup.querySelector('rect')).not.toBe(rectBefore);
    expect(boxGroup.querySelector('rect')!.getAttribute('height')).toBe('50');

    chart.dispose();
  });

  it('draws and resizes boxes from parts', () => {
    document.body.innerHTML = '<svg id="svg"><g id="box"></g></svg>';
    const group = document.querySelector<SVGGElement>('#box')!;
    const parts = (width: number): BoxPart[] => [
      { tag: 'rect', fixed: { class: 'frame' }, sized: { width, height: 20 } },
      { tag: 'text', sized: { x: width - 4 }, text: 'label' },
    ];
    const changes: Array<Record<string, string | number>> = [];
    const animation = {
      move(element: SVGElement, attrs: Record<string, string | number>) {
        changes.push(attrs);
        for (const [name, value] of Object.entries(attrs)) {
          element.setAttribute(name, String(value));
        }
      },
      appear() {},
      disappear() {},
    };

    drawBoxParts(group, parts(100));
    expect(group.innerHTML).toBe(
      '<rect class="frame" width="100" height="20"></rect><text x="96">label</text>',
    );
    // Only what differs is moved.
    expect(resizeBoxParts(group, parts(120), animation)).toBe(true);
    expect(changes).toEqual([{ width: 120 }, { x: 116 }]);
    expect(resizeBoxParts(group, parts(120), animation)).toBe(true);
    expect(changes.length).toBe(2);
    // Other parts than the ones drawn: nothing is touched.
    expect(resizeBoxParts(group, [{ tag: 'circle' }], animation)).toBe(false);
    expect(changes.length).toBe(2);
  });

  it('scopes clipPath IDs uniquely across duplicate appearances and multiple charts', () => {
    document.body.innerHTML = '<svg id="c1"></svg><svg id="c2"></svg>';
    const cousinPortraitData: ModelData = {
      indis: [
        { id: 'I1', fams: ['F1'] },
        { id: 'I2', fams: ['F1'] },
        { id: 'I3', famc: 'F1', fams: ['F2'] },
        { id: 'I4', famc: 'F1', fams: ['F2'] },
        {
          id: 'I5',
          firstName: 'DupPortrait',
          famc: 'F2',
          images: [{ url: 'https://example.com/dup.jpg' }],
        },
      ],
      fams: [
        { id: 'F1', husb: 'I1', wife: 'I2', children: ['I3', 'I4'] },
        { id: 'F2', husb: 'I3', wife: 'I4', children: ['I5'] },
      ],
    };
    const graph = createModelGraph(cousinPortraitData);
    const plugin = createDetailedNodePlugin({ model: graph });

    const chart1 = createChart({
      svg: '#c1',
      config: {
        graph,
        chart: 'hourglass',
        maxAncestorGenerations: 0,
        nodePlugin: plugin,
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    const chart2 = createChart({
      svg: '#c2',
      config: {
        graph,
        chart: 'hourglass',
        maxAncestorGenerations: 0,
        nodePlugin: plugin,
        textMeasurer: createFixedTextMeasurer(),
      },
    });

    chart1.update({ startIndi: 'I1' });
    chart2.update({ startIndi: 'I1' });

    const clipIds = Array.from(document.querySelectorAll('clipPath')).map((c) =>
      c.getAttribute('id'),
    );
    expect(clipIds.length).toBe(4);
    expect(new Set(clipIds).size).toBe(4);

    chart1.dispose();
    chart2.dispose();
  });

  it('sizes Circle by person count (fixing single-parent 80px sizing), sets perimeter expanderAnchors, and expands Fancy bounds for leaves & trunk', () => {
    document.body.innerHTML = '<svg id="fancy1"></svg><svg id="fancy2"></svg>';
    const treeData: ModelData = {
      indis: [
        { id: 'I1', firstName: 'RootFather', fams: ['F_COUPLE'] },
        { id: 'I2', firstName: 'RootMother', fams: ['F_COUPLE'] },
        { id: 'I3', firstName: 'SingleParentChild', famc: 'F_COUPLE', fams: ['F_SINGLE'] },
        { id: 'I4', firstName: 'Grandchild', famc: 'F_SINGLE' },
      ],
      fams: [
        { id: 'F_COUPLE', husb: 'I1', wife: 'I2', children: ['I3'] },
        { id: 'F_SINGLE', husb: 'I3', children: ['I4'] },
      ],
    };

    const graph = createModelGraph(treeData);
    const circlePlugin = createCircleNodePlugin({ model: graph });
    const measurer = createFixedTextMeasurer();

    const circleLayout = computeLayout(
      { startIndi: 'I1' },
      {
        graph,
        chart: 'hourglass',
        maxAncestorGenerations: 0,
        nodePlugin: circlePlugin,
        textMeasurer: measurer,
      },
    );

    const coupleNode = circleLayout.nodes.find((n) => n.id === 'F_COUPLE')!;
    const singleFamNode = circleLayout.nodes.find((n) => n.id === 'F_SINGLE')!;
    // 2 people -> 120 + 5 stroke = 125; 1 person (even in a family!) -> 80 + 5 stroke = 85
    expect(coupleNode.bounds.width).toBe(125);
    expect(singleFamNode.bounds.width).toBe(85);
    // Link anchors at center (0, 0), expanderAnchors on outer perimeter!
    expect(coupleNode.anchors.children).toEqual({ x: 0, y: 0 });
    expect(coupleNode.expanderAnchors.children.y).toBe(62.5);

    // Fancy config expands layout bounds to enclose leaf canopy and y+90 trunk
    const fancyCfg1 = createFancyConfig({
      model: graph,
      textMeasurer: measurer,
    });
    expect(fancyCfg1.animate).toBe(false);
    expect(fancyCfg1.direction).toBe('up');
    expect(fancyCfg1.maxAncestorGenerations).toBe(0);

    const c1 = createChart({ svg: '#fancy1', config: fancyCfg1 });
    const c2 = createChart({
      svg: '#fancy2',
      config: createFancyConfig({ model: graph, textMeasurer: measurer }),
    });
    const { layout: fl1 } = c1.update({ startIndi: 'I1' });
    c2.update({ startIndi: 'I1' });

    expect(fl1.size[0]).toBeGreaterThan(circleLayout.size[0]);
    expect(fl1.size[1]).toBeGreaterThan(circleLayout.size[1]);

    // Gradient IDs are scoped per chart instance
    const gradIds = Array.from(
      document.querySelectorAll('radialGradient'),
    ).map((g) => g.getAttribute('id'));
    expect(gradIds.length).toBe(2);
    expect(new Set(gradIds).size).toBe(2);

    c1.dispose();
    c2.dispose();
  });
});
