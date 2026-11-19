// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createChart, createFixedTextMeasurer } from '../../src/core/index.js';
import {
  createModelGraph,
  type ModelData,
  type ModelGraph,
} from '../../src/model/index.js';
import { paletteCss } from '../../src/toolkit/index.js';
import { BOX_PART_CLASSES } from '../../src/toolkit/text-box.js';
import {
  createDetailedNodePlugin,
  generationScheme,
  quayScheme,
  sexScheme,
} from '../../src/presets/index.js';
import {
  DEFAULT_GENERATION_PALETTE,
  DEFAULT_SEX_PALETTE,
  generationColorIndex,
} from '../../src/presets/schemes.js';

describe('StyleSchemes (sexScheme, generationScheme, quayScheme) & Two-Tone ColorTargets', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const data: ModelData = {
    indis: [
      {
        id: 'I1',
        firstName: 'Child',
        sex: 'M',
        famc: 'F1',
        confidence: 3,
        parentLinkConfidence: 1,
      },
      { id: 'I2', firstName: 'Father', sex: 'M', fams: ['F1'], confidence: 3 },
      { id: 'I3', firstName: 'Mother', sex: 'F', fams: ['F1'], confidence: 3 },
      { id: 'I4', firstName: 'UnknownSex', fams: ['F2'] },
    ],
    fams: [
      {
        id: 'F1',
        husb: 'I2',
        wife: 'I3',
        children: ['I1', 'I4'],
        marriage: { date: { year: 1900 }, confidence: 0 },
      },
      { id: 'F2', husb: 'I4' },
    ],
  };

  it('paletteCss applies scheme palettes to custom boxes according to the colour target', () => {
    const schemes = [sexScheme(data), quayScheme(data)];
    const prefix = '.topola-1 .my-box';

    // Standard part names by default: soft fill for backgrounds...
    expect(
      paletteCss({ prefix, schemes, colorTarget: 'background' }),
    ).toContain(
      `.topola-1 .my-box .male .background { fill: ${DEFAULT_SEX_PALETTE.male!.fill}; }`,
    );
    // ...strong accent for frames...
    expect(paletteCss({ prefix, schemes, colorTarget: 'frame' })).toContain(
      `.topola-1 .my-box .female .frame { stroke: ${DEFAULT_SEX_PALETTE.female!.accent}; }`,
    );
    // ...and for names, here on a part with a name of its own.
    expect(
      paletteCss({
        prefix,
        schemes,
        colorTarget: 'name',
        parts: { name: '.station-name' },
      }),
    ).toContain(
      `.topola-1 .my-box .male .station-name { fill: ${DEFAULT_SEX_PALETTE.male!.accent}; }`,
    );
    // Schemes without a palette contribute nothing; the default target is
    // the background.
    expect(
      paletteCss({ prefix, schemes: [quayScheme(data)], colorTarget: 'frame' }),
    ).toEqual([]);
    expect(paletteCss({ prefix, schemes, colorTarget: undefined })).toEqual(
      paletteCss({ prefix, schemes, colorTarget: 'background' }),
    );
    expect(BOX_PART_CLASSES.frame).toBe('frame');
  });

  it('cycles generationColorIndex cleanly across positive, negative, and distant generations', () => {
    expect(generationColorIndex(0)).toBe(0);
    expect(generationColorIndex(1)).toBe(1);
    expect(generationColorIndex(11)).toBe(11);
    expect(generationColorIndex(-1)).toBe(11);
    expect(generationColorIndex(-11)).toBe(1);
    expect(generationColorIndex(12)).toBe(0);
    expect(generationColorIndex(13)).toBe(1);
    expect(generationColorIndex(-12)).toBe(0);
    expect(generationColorIndex(-13)).toBe(11);
    expect(generationColorIndex(-25)).toBe(11);
  });

  it('classifies sexScheme (male, female, unknown, neutral marriage box) and emits two-tone CSS for background, frame, and name', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(data);
    const plugin = createDetailedNodePlugin({ model: graph });

    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: plugin,
        schemes: [sexScheme(graph)],
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    chart.update({ startIndi: 'I4' });

    const styleBefore = document.querySelector('style')!.textContent!;
    expect(styleBefore).toContain(
      `.male .background { fill: ${DEFAULT_SEX_PALETTE.male!.fill}; }`,
    );
    expect(styleBefore).toContain(
      `.unknown .background { fill: ${DEFAULT_SEX_PALETTE.unknown!.fill}; }`,
    );
    expect(styleBefore).toContain(
      `.sex-family .background { fill: #eeeeee; }`,
    );

    // Switch colorTarget to 'frame' (Issue #89 print-friendly colored borders)
    chart.patchConfig({ theme: { colorTarget: 'frame' } });
    const styleFrame = document.querySelector('style')!.textContent!;
    expect(styleFrame).toContain(
      `.male .frame { stroke: ${DEFAULT_SEX_PALETTE.male!.accent}; }`,
    );
    expect(styleFrame).toContain(
      `.female .frame { stroke: ${DEFAULT_SEX_PALETTE.female!.accent}; }`,
    );

    // Switch colorTarget to 'name'
    chart.patchConfig({ theme: { colorTarget: 'name' } });
    const styleName = document.querySelector('style')!.textContent!;
    expect(styleName).toContain(
      `.male .name { fill: ${DEFAULT_SEX_PALETTE.male!.accent}; }`,
    );

    // Verify all selectors stay <= 4 classes for canvg/jsPDF compatibility
    const ruleSelectors = styleName
      .split('}')
      .map((b) => b.split('{')[0]?.trim() ?? '')
      .filter(Boolean);
    for (const selGroup of ruleSelectors) {
      for (const sel of selGroup.split(',')) {
        const classCount = (sel.match(/\.[a-zA-Z0-9_-]+/g) ?? []).length;
        expect(classCount, `selector "${sel}" exceeds 4 classes`).toBeLessThanOrEqual(4);
      }
    }

    chart.dispose();
  });

  it('classifies generationScheme across person and marriage boxes and quayScheme across person, family, and parent-child links', () => {
    document.body.innerHTML = '<svg id="svg"></svg>';
    const graph = createModelGraph(data);
    const plugin = createDetailedNodePlugin({ model: graph });

    const chart = createChart({
      svg: '#svg',
      config: {
        graph,
        chart: 'hourglass',
        nodePlugin: plugin,
        schemes: [generationScheme(), quayScheme(graph)],
        textMeasurer: createFixedTextMeasurer(),
      },
    });
    chart.update({ startIndi: 'I1' });

    const css = document.querySelector('style')!.textContent!;
    expect(css).toContain(
      `.gen-11 .background { fill: ${DEFAULT_GENERATION_PALETTE['gen-11']!.fill}; }`,
    );
    expect(css).toContain('.quay-1 .frame { stroke-dasharray: 3 3; }');
    expect(css).toContain('.quay-0 .frame { stroke-dasharray: 1 3; }');
    expect(css).toContain('.link.quay-1 { stroke-dasharray: 3 3; }');

    // Parents I2 and I3 sit at generation -1 (gen-11) and inherit QUAY 1 via I1's parentLinkConfidence=1
    const parentNode = document.querySelector('g.node[data-node-id="F1"]')!;
    const personRegions = parentNode.querySelectorAll('.person-region');
    expect(personRegions[0]!.getAttribute('class')).toContain('gen-11');
    expect(personRegions[0]!.getAttribute('class')).toContain('quay-1');

    // Marriage box F1 has gen-11 and quay-0
    const famRegion = parentNode.querySelector('.family-region')!;
    expect(famRegion.getAttribute('class')).toContain('gen-11');
    expect(famRegion.getAttribute('class')).toContain('quay-0');

    // Link from F1 to I1 has local parentLinkConfidence = 1 -> quay-1
    const linkEl = document.querySelector('path.link')!;
    expect(linkEl.getAttribute('class')).toContain('quay-1');

    chart.dispose();
  });

  it('quayScheme rates links and marriages by the rule for people, whatever number the data has', () => {
    const odd = createModelGraph({
      indis: [
        { id: 'P', fams: ['F', 'G', 'H'] },
        { id: 'K', famc: 'F', confidence: 2.5 },
        { id: 'L', famc: 'F', confidence: 1, parentLinkConfidence: -1 },
        { id: 'M', famc: 'F', confidence: 7 },
        { id: 'N', famc: 'F' },
        { id: 'Q', famc: 'F', confidence: 1, parentLinkConfidence: NaN },
        { id: 'R', famc: 'F', confidence: 1, parentLinkConfidence: 4 },
      ],
      fams: [
        {
          id: 'F',
          husb: 'P',
          children: ['K', 'L', 'M', 'N', 'Q', 'R'],
          marriage: { confidence: 1.5 },
        },
        { id: 'G', husb: 'P', marriage: { confidence: 4 } },
        { id: 'H', husb: 'P', marriage: { confidence: NaN } },
      ],
    });
    const scheme = quayScheme(odd);
    const viewState = { startIndi: 'P' };
    const person = (personId: string) =>
      scheme.classifyPerson!({ personId, nodeId: 'n', generation: 0, viewState });
    const family = (familyId: string) =>
      scheme.classifyFamily!({ familyId, nodeId: 'n', generation: 0, viewState });
    const link = (childIndiId: string) =>
      scheme.classifyLink!({
        link: {
          id: 'l',
          kind: 'parentChild',
          fromNodeId: 'F',
          fromSlot: 'children',
          toNodeId: childIndiId,
          toSlot: 'indiParents',
          childIndiId,
        },
        viewState,
      });

    // The box of K and the link to K agree.
    expect(person('K')).toBe('quay-2');
    expect(link('K')).toBe('quay-2');
    expect(person('L')).toBe('quay-0');
    expect(link('L')).toBe('quay-0');
    expect(link('M')).toBeUndefined();
    expect(link('N')).toBeUndefined();
    expect(link('Q')).toBe('quay-1');
    expect(link('R')).toBeUndefined();
    expect(family('F')).toBe('quay-1');
    expect(family('G')).toBeUndefined();
    expect(family('H')).toBeUndefined();
  });

  it('quayScheme walks a tree without any confidence once, whoever the chart starts from', () => {
    const plain: ModelData = {
      indis: data.indis.map(
        ({ confidence: _c, parentLinkConfidence: _p, ...rest }) => rest,
      ),
      fams: data.fams,
    };
    const graph = createModelGraph(plain);
    let walked = 0;
    const counting: ModelGraph = {
      ...graph,
      getFamilyChildren(familyId) {
        walked++;
        return graph.getFamilyChildren(familyId);
      },
    };
    const scheme = quayScheme(counting);
    const classify = (startIndi: string) =>
      scheme.classifyPerson!({
        personId: 'I1',
        nodeId: 'I1',
        generation: 0,
        viewState: { startIndi },
      });

    expect(classify('I1')).toBeUndefined();
    expect(walked).toBeGreaterThan(0);
    walked = 0;
    for (const start of ['I2', 'I3', 'I4', 'I1', 'I2']) {
      expect(classify(start)).toBeUndefined();
    }
    expect(walked).toBe(0);
  });
});
