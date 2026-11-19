// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  computeLayout,
  createChart,
  createFixedTextMeasurer,
  type AnimationHelpers,
  type DrawHelpers,
  type LayoutNode,
  type Problem,
} from '../../src/core/index.js';
import { generateChartCss } from '../../src/core/css-generator.js';
import { resolveChartTheme } from '../../src/core/layout.js';
import {
  computeConfidenceMap,
  createModelGraph,
  type ModelData,
  type ModelDataInput,
} from '../../src/model/index.js';
import { isModelGraph, toModelGraph } from '../../src/model/graph-adapter.js';
import {
  createCircleNodePlugin,
  createDetailedNodePlugin,
  createFancyConfig,
  createSimpleNodePlugin,
  generationScheme,
  quayScheme,
  sexScheme,
  type CircleTheme,
  type FancyTheme,
} from '../../src/presets/index.js';
import { defaultCircleLabel } from '../../src/presets/circle.js';
import {
  detailedFamilyContent,
  detailedPersonContent,
} from '../../src/presets/detailed.js';
import {
  createFancyBranchLayer,
  createFancyLeavesLayer,
} from '../../src/presets/fancy.js';
import { generationColorIndex } from '../../src/presets/schemes.js';
import { SIMPLE_BOX_THEME, simpleContent } from '../../src/presets/simple.js';
import {
  createCoupleAssembler,
  createTextBox,
  type BoxPlugin,
  type FamilyBoxContext,
  type PersonBoxContext,
  type TextBoxTheme,
} from '../../src/toolkit/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const FAMILY: ModelData = {
  indis: [
    { id: 'I1', firstName: 'Root', sex: 'M', fams: ['F1'] },
    { id: 'I2', firstName: 'Wife', sex: 'F', fams: ['F1'] },
    { id: 'I3', firstName: 'Child', famc: 'F1' },
  ],
  fams: [{ id: 'F1', husb: 'I1', wife: 'I2', children: ['I3'] }],
};

/** Helpers that act at once, as in a chart that does not animate. */
const staticAnimation: AnimationHelpers = {
  move(element, attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, String(value));
    }
  },
  appear() {},
  disappear(element) {
    element.remove();
  },
};
const staticHelpers: DrawHelpers = {
  ...staticAnimation,
  markPerson() {},
  markFamily() {},
};

describe('Toolkit and presets: edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '<svg id="svg"></svg>';
  });

  it('Fancy leaves follow a new glow colour, and their gradient leaves with the layer', () => {
    const graph = createModelGraph(FAMILY);
    const measurer = createFixedTextMeasurer();
    // The chart is also to show a look with text boxes.
    const chart = createChart<FancyTheme & TextBoxTheme>({
      svg: '#svg',
      config: createFancyConfig({ model: graph, textMeasurer: measurer }),
    });
    chart.update({ startIndi: 'I1' });
    const stopColors = () =>
      Array.from(document.querySelectorAll('radialGradient stop'), (stop) =>
        stop.getAttribute('stop-color'),
      );
    expect(stopColors()).toEqual(['#88ff88', '#88ff88', '#88ff88']);

    chart.patchConfig({
      theme: {
        generationSpacing: 100,
        leafGlowColor: '#ff0000',
        leafSolidColor: '#0000ff',
      },
    });
    expect(stopColors()).toEqual(['#ff0000', '#ff0000', '#ff0000']);
    expect(
      document.querySelector('.fancy-leaf-solid')!.getAttribute('fill'),
    ).toBe('#0000ff');
    expect(document.querySelectorAll('radialGradient')).toHaveLength(1);

    // Another look: nothing of the leaves stays behind.
    chart.setConfig({
      graph,
      chart: 'hourglass',
      nodePlugin: createSimpleNodePlugin({ model: graph }),
      textMeasurer: measurer,
    });
    expect(document.querySelectorAll('radialGradient')).toHaveLength(0);
    chart.dispose();
  });

  it('Circle lets style schemes reach the border of a person', () => {
    const graph = createModelGraph(FAMILY);
    const chart = createChart<CircleTheme>({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: createCircleNodePlugin({ model: graph }),
        schemes: [sexScheme(graph)],
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    chart.update({ startIndi: 'I1' });
    const count = (selector: string) =>
      document.querySelectorAll(selector).length;

    // A person alone has the border in its own group, whatever the target.
    expect(count('.male .frame, .female .frame, .unknown .frame')).toBe(1);
    expect(count('g.node[data-node-id="I3"] .unknown circle.frame')).toBe(1);
    // A couple shares one border while frames are not coloured.
    expect(count('g.node[data-node-id="F1"] .frame')).toBe(1);
    expect(count('g.node[data-node-id="F1"] .person-region .frame')).toBe(0);

    // With frames as the colour target each partner has a half of it.
    chart.patchConfig({ theme: { colorTarget: 'frame' } });
    const css = document.querySelector('#svg style')!.textContent!;
    expect(css).toMatch(/\.circle \.male \.frame \{ stroke: #1565c0; \}/);
    expect(count('g.node[data-node-id="F1"] .male path.frame')).toBe(1);
    expect(count('g.node[data-node-id="F1"] .female path.frame')).toBe(1);
    expect(count('g.node[data-node-id="F1"] .frame')).toBe(2);
    expect(count('g.node[data-node-id="I3"] .unknown circle.frame')).toBe(1);
    chart.dispose();
  });

  it('gives lines of an unknown role the font size they are measured with', () => {
    const box = createTextBox<PersonBoxContext, TextBoxTheme>({
      namespace: 'x',
      defaultTheme: SIMPLE_BOX_THEME,
      content: () => ({ lines: [{ role: 'occupation', text: 'Blacksmith' }] }),
    });
    const theme = resolveChartTheme<TextBoxTheme>({
      nodePlugin: createCoupleAssembler({ personBox: box }),
    });
    const sizes: number[] = [];
    const problems: Problem[] = [];
    box.measureBox(
      { personId: 'I1', nodeId: 'n', generation: 0, isRoot: true },
      {
        theme,
        problems,
        measurer: {
          measureWidth(text, font) {
            sizes.push(font.fontSize);
            return text.length * 6;
          },
        },
      },
    );
    expect(sizes).toEqual([12]);
    expect(problems.map((p) => p.code)).toEqual(['UNKNOWN_LINE_ROLE']);

    const css = box.getCss('.s', theme, []);
    expect(css).toMatch(/^\.s \.x text \{[^}]*font-size: 12px;/m);
    // The rules of the roles come later and are more specific.
    expect(css).toContain('.s .x .name { font-size:');
  });

  it('keeps the CSS of a family box that shares the namespace of the person box', () => {
    const personBox = createTextBox<PersonBoxContext, TextBoxTheme>({
      namespace: 'n',
      defaultTheme: SIMPLE_BOX_THEME,
      content: () => ({ lines: [{ role: 'name', text: 'Name' }] }),
    });
    const familyBox = createTextBox<FamilyBoxContext, TextBoxTheme>({
      namespace: 'n',
      defaultTheme: {
        ...SIMPLE_BOX_THEME,
        roles: {
          ...SIMPLE_BOX_THEME.roles,
          date: { fontSize: 9, lineHeight: 11 },
        },
      },
      content: () => ({ lines: [{ role: 'date', text: '1900' }] }),
    });
    const plugin = createCoupleAssembler<TextBoxTheme>({ personBox, familyBox });
    const theme = resolveChartTheme<TextBoxTheme>({ nodePlugin: plugin });
    const rules = plugin.getCss!('.s', theme, []).split('\n');
    expect(rules).toContain('.s .n .date { font-size: 9px; }');
    // Shared rules are there once.
    expect(new Set(rules).size).toBe(rules.length);
    expect(rules.filter((rule) => rule.startsWith('.s .n text '))).toHaveLength(
      1,
    );

    // Detailed: its two boxes agree, nothing is added.
    const graph = createModelGraph(FAMILY);
    const detailed = createDetailedNodePlugin({ model: graph });
    const detailedTheme = resolveChartTheme<TextBoxTheme>({
      nodePlugin: detailed,
    });
    const detailedRules = detailed
      .getCss!('.s', detailedTheme, [generationScheme()])
      .split('\n');
    expect(new Set(detailedRules).size).toBe(detailedRules.length);
    // No selector has two rules either: the family box overrides nothing.
    const selectors = detailedRules.map((rule) =>
      rule.slice(0, rule.indexOf('{')).trim(),
    );
    expect(new Set(selectors).size).toBe(selectors.length);
  });

  it('merges the CSS of boxes that share a namespace rule by rule, however it is broken into lines', () => {
    const box = <TContext,>(css: string): BoxPlugin<TContext, TextBoxTheme> => ({
      namespace: 'n',
      defaultTheme: {},
      getCss: (scopeSelector) => css.replaceAll('{scope}', scopeSelector),
      measureBox: () => ({ width: 10, height: 10 }),
      drawBox() {},
    });
    const personCss = [
      '{scope} .n text {',
      '  fill: black;',
      '}',
      '{scope} .n .frame {',
      '  fill: white;',
      '}',
    ].join('\n');
    const familyCss = [
      '{scope} .n text {',
      '  fill: black;',
      '}',
      '{scope} .n .date {',
      '  fill: black;',
      '}',
      '{scope} .n .ring {',
      '  fill: white;',
      '}',
    ].join('\n');
    const rule = /[^{}]+\{[^{}]*\}/g;
    const theme = resolveChartTheme<TextBoxTheme>({
      nodePlugin: createSimpleNodePlugin({ model: FAMILY }),
    });

    const merged = createCoupleAssembler<TextBoxTheme>({
      personBox: box<PersonBoxContext>(personCss),
      familyBox: box<FamilyBoxContext>(familyCss),
    }).getCss!('.s', theme, []);
    // Whole rules, with all their braces, and the shared one once.
    expect(merged.replace(rule, '').trim()).toBe('');
    expect(
      merged.match(rule)!.map((text) => text.replace(/\s+/g, ' ').trim()),
    ).toEqual([
      '.s .n text { fill: black; }',
      '.s .n .frame { fill: white; }',
      '.s .n .date { fill: black; }',
      '.s .n .ring { fill: white; }',
    ]);

    // CSS that is more than a list of rules is kept as it is.
    const printCss = '@media print {\n  {scope} .n text {\n  fill: black;\n}\n}';
    const kept = createCoupleAssembler<TextBoxTheme>({
      personBox: box<PersonBoxContext>(personCss),
      familyBox: box<FamilyBoxContext>(printCss),
    }).getCss!('.s', theme, []);
    expect(kept).toBe(
      `${personCss}\n${printCss}`.replaceAll('{scope}', '.s'),
    );

    // Comments containing braces, quoted strings, and empty personCss never leave unclosed /* comments
    const commentedPerson =
      "/* header { person } */\n{scope} .n text { font-family: 'Open Sans', sans-serif; fill: black; }";
    const commentedFamily = [
      '/* header { family } */',
      "{scope} .n text { font-family: 'Open Sans', sans-serif; fill: black; }",
      '{scope} .n [data-x="{y}"] { content: "}"; --b: "{"; }',
      '{scope} .n .date { font-size: 9px; }',
    ].join('\n');
    const withComments = createCoupleAssembler<TextBoxTheme>({
      personBox: box<PersonBoxContext>(commentedPerson),
      familyBox: box<FamilyBoxContext>(commentedFamily),
    }).getCss!('.s', theme, []);
    expect((withComments.match(/\/\*/g) ?? []).length).toBe(
      (withComments.match(/\*\//g) ?? []).length,
    );
    expect(withComments).toContain('.s .n .date { font-size: 9px; }');
    expect(withComments).toContain('.s .n [data-x="{y}"]');

    const emptyPersonMerged = createCoupleAssembler<TextBoxTheme>({
      personBox: box<PersonBoxContext>(''),
      familyBox: box<FamilyBoxContext>('{scope} .n .date { font-size: 9px; }'),
    }).getCss!('.s', theme, []);
    expect(emptyPersonMerged).toBe('.s .n .date { font-size: 9px; }');
  });

  it('Fancy keeps the spacing of its generations when the theme of the chart is replaced', () => {
    const graph = createModelGraph(FAMILY);
    const textMeasurer = createFixedTextMeasurer();
    const config = createFancyConfig({ model: graph, textMeasurer });
    expect(resolveChartTheme(config).generationSpacing).toBe(100);

    const chart = createChart<FancyTheme>({ svg: '#svg', config });
    const before = chart.update({ startIndi: 'I1' }).layout.size;
    const recoloured = chart.patchConfig({ theme: { skyColor: 'pink' } })!;
    expect(recoloured.layout.size).toEqual(before);
    expect(document.querySelector('.fancy-sky')!.getAttribute('fill')).toBe(
      'pink',
    );

    // The host can still choose another spacing, at the start or later.
    expect(
      resolveChartTheme(
        createFancyConfig({ model: graph, theme: { generationSpacing: 60 } }),
      ).generationSpacing,
    ).toBe(60);
    const closer = chart.patchConfig({ theme: { generationSpacing: 60 } })!;
    expect(closer.layout.size[1]).toBeLessThan(before[1]);
    chart.dispose();
  });

  it('takes read-only data wherever a model is passed in', () => {
    const frozen = {
      indis: [
        { id: 'A', sex: 'M', fams: ['F'], confidence: 2 },
        { id: 'K', famc: 'F' },
      ],
      fams: [{ id: 'F', husb: 'A', children: ['K'] }],
    } as const;
    const input: ModelDataInput = frozen;
    Object.freeze(frozen.indis);
    Object.freeze(frozen.indis[0]);

    const graph = createModelGraph(input);
    expect(graph.problems).toEqual([]);
    expect(isModelGraph(frozen)).toBe(false);
    expect(toModelGraph(frozen).getFamilyChildren('F')).toEqual(['K']);
    expect([...computeConfidenceMap(frozen, 'K')]).toEqual([['A', 2]]);

    const viewState = { startIndi: 'A' };
    const person = { personId: 'A', nodeId: 'F', generation: 0, viewState };
    expect(sexScheme(frozen).classifyPerson!(person)).toBe('male');
    expect(sexScheme({ model: frozen }).classifyPerson!(person)).toBe('male');
    expect(quayScheme(frozen).classifyPerson!(person)).toBe('quay-2');
    for (const nodePlugin of [
      createSimpleNodePlugin({ model: frozen }),
      createDetailedNodePlugin({ model: frozen }),
    ]) {
      const layout = computeLayout(viewState, {
        graph,
        chart: 'hourglass',
        nodePlugin,
        textMeasurer: createFixedTextMeasurer(),
      });
      expect(layout.nodes.map((n) => n.id)).toEqual(['F', 'K']);
    }
    expect(
      computeLayout(viewState, {
        graph,
        chart: 'hourglass',
        nodePlugin: createCircleNodePlugin({ model: frozen }),
        textMeasurer: createFixedTextMeasurer(),
      }).nodes,
    ).toHaveLength(2);
    expect(createFancyConfig({ model: frozen }).graph.hasPerson('K')).toBe(
      true,
    );

    // Preset content/label helpers accept read-only ModelDataInput records directly
    expect(
      simpleContent({
        person: frozen.indis[0],
        personId: 'A',
        nodeId: 'F',
        generation: 0,
        isRoot: true,
      }).lines,
    ).toBeDefined();
    expect(
      detailedPersonContent({
        person: frozen.indis[0],
        personId: 'A',
        nodeId: 'F',
        generation: 0,
        isRoot: true,
      }).lines,
    ).toBeDefined();
    expect(
      detailedFamilyContent({
        family: frozen.fams[0],
        familyId: 'F',
        nodeId: 'F',
        generation: 0,
        isRoot: true,
      }).symbolLines,
    ).toEqual([]);
    expect(defaultCircleLabel(frozen.indis[0])).toBe('');

    // Standalone createFancyBranchLayer carries generationSpacing: 100, and createFancyConfig
    // accepts custom nodePlugins (e.g. TextBoxTheme) plus keyboard & expanderLabel
    expect(createFancyBranchLayer().defaultTheme?.generationSpacing).toBe(100);
    const fancySimple = createFancyConfig({
      model: frozen,
      nodePlugin: createSimpleNodePlugin({ model: frozen }),
      keyboard: true,
      expanderLabel: ({ node }) => node.id,
      theme: { skyColor: '#ddeeff', cornerRadius: 4 },
    });
    expect(fancySimple.keyboard).toBe(true);
    expect(typeof fancySimple.expanderLabel).toBe('function');
    expect(resolveChartTheme(fancySimple).generationSpacing).toBe(100);
  });

  it('takes generations that are no whole numbers and a sex that is no table key', () => {
    expect(generationColorIndex(1.5)).toBe(1);
    expect(generationColorIndex(-0.5)).toBe(11);
    expect(generationColorIndex(NaN)).toBe(0);
    expect(generationColorIndex(Infinity)).toBe(0);
    const scheme = generationScheme();
    const token = scheme.classifyPerson!({
      personId: 'I1',
      nodeId: 'n',
      generation: 1.5,
      viewState: { startIndi: 'I1' },
    });
    expect(token).toBe('gen-1');
    expect(scheme.palette![token!]).toBeDefined();

    for (const sex of ['constructor', 'toString', '__proto__', 'X']) {
      const content = detailedPersonContent({
        person: { id: 'I1', sex },
        personId: 'I1',
        nodeId: 'n',
        generation: 0,
        isRoot: true,
      });
      expect(content.badges!.map((badge) => badge.role)).toEqual(['id']);
    }
    const male = detailedPersonContent({
      person: { id: 'I1', sex: 'M' },
      personId: 'I1',
      nodeId: 'n',
      generation: 0,
      isRoot: true,
    });
    expect(male.badges!.map((badge) => badge.text)).toEqual(['I1', '\u2642']);
  });

  it('suppresses a marriage box whose lines have no text, and resizes a box whose methods are used on their own', () => {
    const theme = resolveChartTheme<TextBoxTheme>({
      nodePlugin: createSimpleNodePlugin({ model: FAMILY }),
    });
    const measureCtx = {
      theme,
      measurer: createFixedTextMeasurer(),
      problems: [],
    };
    const family: FamilyBoxContext = {
      familyId: 'F1',
      nodeId: 'n',
      generation: 0,
      isRoot: true,
    };
    const empty = createTextBox<FamilyBoxContext, TextBoxTheme>({
      namespace: 'fam',
      defaultTheme: SIMPLE_BOX_THEME,
      suppressWhenEmpty: true,
      content: () => ({
        lines: [{ role: 'details', text: '' }],
        symbolLines: [{ role: 'details', symbol: '', text: '' }],
      }),
    });
    expect(empty.measureBox(family, measureCtx)).toEqual({
      width: 0,
      height: 0,
    });
    const symbolOnly = createTextBox<FamilyBoxContext, TextBoxTheme>({
      namespace: 'fam',
      defaultTheme: SIMPLE_BOX_THEME,
      suppressWhenEmpty: true,
      content: () => ({
        symbolLines: [{ role: 'details', symbol: '+', text: '' }],
      }),
    });
    expect(symbolOnly.measureBox(family, measureCtx).width).toBeGreaterThan(0);

    // A box drawn at no size is drawn anew by resizeBox, also when the
    // method is called without the box.
    const { drawBox, resizeBox } = symbolOnly;
    const group = document.createElementNS(SVG_NS, 'g');
    drawBox(group, family, 0, 0, { theme });
    expect(group.children).toHaveLength(0);
    resizeBox!(group, family, 40, 20, { theme, animation: staticAnimation });
    expect(group.querySelector('rect.frame')!.getAttribute('width')).toBe('40');
  });

  it('resizes both boxes of a node that has one person in both places', () => {
    const plugin = createSimpleNodePlugin({
      model: { indis: [{ id: 'I1', firstName: 'Solo' }], fams: [] },
    });
    const theme = resolveChartTheme<TextBoxTheme>({ nodePlugin: plugin });
    const node = (extra: number): LayoutNode => ({
      id: 'n',
      generation: 0,
      isRoot: true,
      indiId: 'I1',
      spouseId: 'I1',
      x: 0,
      y: 0,
      bounds: { x: -50 - extra, y: -30, width: 100 + 2 * extra, height: 30 },
      extents: {
        alongBefore: 30,
        alongAfter: 0,
        acrossBefore: 50 + extra,
        acrossAfter: 50 + extra,
      },
      anchors: {
        indiParents: { x: -25, y: -30 },
        spouseParents: { x: 25, y: -30 },
        children: { x: 0, y: 0 },
      },
      expanderAnchors: {
        indiParents: { x: -25, y: -30 },
        spouseParents: { x: 25, y: -30 },
        children: { x: 0, y: 0 },
      },
      expanders: {},
      regions: [
        { kind: 'person', id: 'I1', x: -50 - extra, y: -30, width: 50 + extra, height: 30 },
        { kind: 'person', id: 'I1', x: 0, y: -30, width: 50 + extra, height: 30 },
      ],
    });
    const group = document.createElementNS(SVG_NS, 'g');
    plugin.drawNode(group, node(0), {
      direction: 'down',
      theme,
      helpers: staticHelpers,
    });
    const boxes = () =>
      Array.from(
        group.querySelectorAll('[data-topola-region]'),
        (box) =>
          `${box.getAttribute('transform')} ${box.querySelector('rect.frame')!.getAttribute('width')}`,
      );
    expect(boxes()).toEqual(['translate(-50, -30) 50', 'translate(0, -30) 50']);

    plugin.resizeNode!(group, node(10), {
      direction: 'down',
      theme,
      animation: staticAnimation,
    });
    expect(boxes()).toEqual(['translate(-60, -30) 60', 'translate(0, -30) 60']);
  });

  it('ignores explicit undefined theme fields, scopes clipPath ids cleanly, and handles null/fractional event confidence and year 0', () => {
    const graph = createModelGraph({
      indis: [
        {
          id: 'I1',
          firstName: 'Portrait',
          images: [{ url: 'https://example.com/a.jpg' }],
        },
      ],
      fams: [],
    });
    const measurer = createFixedTextMeasurer();
    const undefinedTheme = {
      fontFamily: undefined,
      minWidth: undefined,
      minHeight: undefined,
      boxStrokeWidth: undefined,
      colorTarget: undefined,
      padding: { top: undefined, right: 8, bottom: 6, left: 4 },
      roles: { name: undefined },
    } as unknown as Partial<TextBoxTheme>;

    const detailed = createDetailedNodePlugin({
      model: graph,
      namespace: 'topola-card',
    });
    const layout = computeLayout(
      { startIndi: 'I1' },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: detailed,
        textMeasurer: measurer,
        theme: undefinedTheme,
      },
    );
    expect(layout.size[0]).toBeGreaterThan(0);
    expect(Number.isFinite(layout.nodes[0]!.bounds.width)).toBe(true);

    const resolved = resolveChartTheme<TextBoxTheme>({
      nodePlugin: detailed,
      theme: undefinedTheme,
    });
    const css = generateChartCss({
      scopeSelector: '.topola-1',
      theme: resolved,
      nodePlugin: detailed,
      layers: [],
      schemes: [],
      hasPersonClick: false,
      hasFamilyClick: false,
    });
    expect(css).not.toContain('undefined');

    const circleLayout = computeLayout(
      { startIndi: 'I1' },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: createCircleNodePlugin({ model: graph }),
        textMeasurer: measurer,
        theme: {
          singleDiameter: undefined,
          coupleDiameter: undefined,
          fontFamily: undefined,
        } as unknown as Partial<CircleTheme>,
      },
    );
    expect(circleLayout.size[0]).toBeGreaterThan(0);

    // clipPath ID uses chart scopeId even when box namespace starts with topola- or rootG has extra classes
    const chart = createChart({
      svg: '#svg',
      scopeId: 'session-uuid-1',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: detailed,
        textMeasurer: measurer,
      },
    });
    document.querySelector('#svg > g')!.classList.add('exported');
    chart.update({ startIndi: 'I1' });
    const clipId = document.querySelector('#svg clipPath')!.getAttribute('id')!;
    expect(clipId).toMatch(/^topola-session-uuid-1-clip-\d+$/);
    chart.dispose();

    // Detached drawBox honors BoxDrawContext.instanceScopeId
    const box = createTextBox<PersonBoxContext, TextBoxTheme>({
      namespace: 'topola-card',
      defaultTheme: { ...SIMPLE_BOX_THEME, imageWidth: 50, imageMinHeight: 50 },
      content: () => ({ imageUrl: 'https://example.com/p.jpg' }),
    });
    const detached = document.createElementNS(SVG_NS, 'g');
    box.drawBox(
      detached,
      { personId: 'I1', nodeId: 'I1', generation: 0, isRoot: true },
      120,
      60,
      { theme: resolved, instanceScopeId: 'custom-scope-42' },
    );
    expect(detached.querySelector('clipPath')!.getAttribute('id')).toMatch(
      /^topola-custom-scope-42-clip-\d+$/,
    );

    // Detailed uncertainSuffix: null -> no '?', 1.5 -> ' ?'
    const nullConf = JSON.parse(
      '{"id":"I1","birth":{"date":{"year":1900},"confidence":null}}',
    );
    expect(
      detailedPersonContent({
        person: nullConf,
        personId: 'I1',
        nodeId: 'I1',
        generation: 0,
        isRoot: true,
      }).symbolLines?.[0]?.text,
    ).toBe('1900');
    expect(
      detailedPersonContent({
        person: { id: 'I1', birth: { date: { year: 1900 }, confidence: 1.5 } },
        personId: 'I1',
        nodeId: 'I1',
        generation: 0,
        isRoot: true,
      }).symbolLines?.[0]?.text,
    ).toBe('1900 ?');

    // Simple content: year 0 is rendered, while NaN is omitted
    expect(
      simpleContent({
        person: { id: 'I1', firstName: 'Zero', birth: { date: { year: 0 } } },
        personId: 'I1',
        nodeId: 'I1',
        generation: 0,
        isRoot: true,
      }).lines?.[1]?.text,
    ).toBe('0 \u2013 ');
    expect(
      simpleContent({
        person: { id: 'I1', firstName: 'Bad', birth: { date: { year: NaN } } },
        personId: 'I1',
        nodeId: 'I1',
        generation: 0,
        isRoot: true,
      }).lines,
    ).toEqual([{ role: 'name', text: 'Bad' }]);
    expect(
      detailedPersonContent({
        person: JSON.parse('{"id":"I1","birth":{"date":{"year":1900},"confidence":""}}'),
        personId: 'I1',
        nodeId: 'I1',
        generation: 0,
        isRoot: true,
      }).symbolLines?.[0]?.text,
    ).toBe('1900');
  });

  it('guards prototype role names, invalid/null role specs, negative box and circle dimensions, wide Fancy leaf counts, and bare topola- clipPath scope prefixes', () => {
    const measurer = createFixedTextMeasurer();
    const graph = createModelGraph({
      indis: [{ id: 'I1', firstName: 'Jan' }],
      fams: [],
    });

    // 1. Prototype role names ('constructor', 'toString') report UNKNOWN_LINE_ROLE instead of NaN
    const protoBox = createTextBox<PersonBoxContext, TextBoxTheme>({
      namespace: 'proto',
      defaultTheme: { ...SIMPLE_BOX_THEME, imageWidth: 40, imageMinHeight: 40 },
      content: () => ({
        lines: [{ role: 'constructor', text: 'Jan' }],
        imageUrl: 'https://example.com/p.jpg',
      }),
    });
    const badRolesTheme = resolveChartTheme<TextBoxTheme>({
      nodePlugin: createCoupleAssembler({ personBox: protoBox }),
      theme: JSON.parse(
        '{"minWidth":-50,"minHeight":-20,"cornerRadius":-4,"boxStrokeWidth":-2,"roles":{"name":null,"details":{"fontSize":null,"lineHeight":-5,"fontWeight":null,"fontStyle":null,"color":null}}}',
      ),
    });
    (badRolesTheme.roles as Record<string, unknown>).custom = {
      fontSize: NaN,
      lineHeight: Infinity,
    };
    const problems: Problem[] = [];
    const size = protoBox.measureBox(
      { personId: 'I1', nodeId: 'I1', generation: 0, isRoot: true },
      { theme: badRolesTheme, measurer, problems },
    );
    expect(Number.isFinite(size.width) && size.width > 0).toBe(true);
    expect(Number.isFinite(size.height) && size.height > 0).toBe(true);
    expect(problems.map((p) => p.code)).toEqual(['UNKNOWN_LINE_ROLE']);

    const css = protoBox.getCss('.s', badRolesTheme, []);
    expect(css).not.toContain('NaN');
    expect(css).not.toContain('Infinity');
    expect(css).not.toContain('null');

    // 2. Bare 'topola-!!!' instanceScopeId falls back to ancestor .topola-<id>
    const chartRoot = document.createElementNS(SVG_NS, 'g');
    chartRoot.setAttribute('class', 'topola-chart42');
    const nodeG = document.createElementNS(SVG_NS, 'g');
    nodeG.setAttribute('class', 'node');
    const boxG = document.createElementNS(SVG_NS, 'g');
    nodeG.appendChild(boxG);
    chartRoot.appendChild(nodeG);
    protoBox.drawBox(
      boxG,
      { personId: 'I1', nodeId: 'I1', generation: 0, isRoot: true },
      size.width,
      size.height,
      { theme: badRolesTheme, instanceScopeId: 'topola-!!!' },
    );
    expect(boxG.querySelector('clipPath')!.getAttribute('id')).toMatch(
      /^topola-chart42-clip-\d+$/,
    );

    // 3. Negative Circle diameters/fontSize/strokeWidth fall back to positive defaults
    const circlePlugin = createCircleNodePlugin({ model: graph });
    const circleRes = computeLayout(
      { startIndi: 'I1' },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: circlePlugin,
        textMeasurer: measurer,
        theme: {
          singleDiameter: -80,
          coupleDiameter: -100,
          circleFontSize: 0,
          circleStrokeWidth: -3,
        },
      },
    );
    expect(circleRes.nodes[0]!.extents.alongBefore).toBeGreaterThan(0);
    expect(circleRes.nodes[0]!.regions[0]!.width).toBeGreaterThan(0);

    // 4. createFancyLeavesLayer handles >125k leaf nodes without call-stack RangeError
    const wideNodes: LayoutNode[] = Array.from({ length: 130_000 }, (_, i) => ({
      ...circleRes.nodes[0]!,
      id: `N${i}`,
      isRoot: i === 0,
      generation: -(i % 10),
      x: i,
      y: -50,
    }));
    const leavesBounds = createFancyLeavesLayer<CircleTheme>().getBounds!(
      { nodes: wideNodes, links: [], direction: 'up' },
      { theme: resolveChartTheme({ nodePlugin: circlePlugin }), measurer },
    );
    expect(leavesBounds).not.toBeNull();
    expect(Number.isFinite(leavesBounds!.width)).toBe(true);
  });
});
