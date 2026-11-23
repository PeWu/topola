/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from 'jsdom-global';
import { AncestorChart } from '../src/ancestor-chart';
import { DescendantChart } from '../src/descendant-chart';
import { JsonDataProvider, JsonGedcomData } from '../src/data';
import { FakeRenderer } from './fake_renderer';

(jsdomGlobal as any)();
const json: JsonGedcomData = {
  indis: [
    { id: 'I1', fams: ['F1'] },
    { id: 'I2', famc: 'F1', fams: ['F2', 'F4'] },
    { id: 'I3', famc: 'F2', fams: ['F3'] },
    { id: 'I4', famc: 'F3' },
    { id: 'I5', fams: ['F4'] },
  ],
  fams: [
    { id: 'F1', husb: 'I1', children: ['I2'] },
    { id: 'F2', husb: 'I2', children: ['I3'] },
    { id: 'F3', husb: 'I3', children: ['I4'] },
    { id: 'F4', husb: 'I2', wife: 'I5' },
  ],
};
const options = {
  data: new JsonDataProvider(json),
  renderer: new FakeRenderer(),
  svgSelector: 'svg',
};

describe('generation limits', () => {
  test.each([0, 1, 2, 3, undefined])(
    'limits ancestors to %s generations',
    (limit) => {
      const root = new AncestorChart({
        ...options,
        startIndi: 'I4',
        ...(limit === undefined ? {} : { maxAncestorGenerations: limit }),
      }).createHierarchy();
      expect(root.descendants().map((n) => n.data.indi?.id)).toEqual(
        ['I4', 'I3', 'I2', 'I1'].slice(0, limit === undefined ? 4 : limit + 1),
      );
    },
  );
  test.each([0, 1, 2, undefined])(
    'limits descendants to %s generations',
    (limit) => {
      const root = new DescendantChart({
        ...options,
        startFam: 'F1',
        ...(limit === undefined ? {} : { maxDescendantGenerations: limit }),
      }).createHierarchy();
      const ids = root.descendants().map((n) => n.data.indi?.id);
      expect(ids.includes('I2')).toBe(limit !== 0);
      expect(ids.includes('I3')).toBe(limit === undefined || limit >= 2);
      expect(ids.includes('I4')).toBe(limit === undefined);
    },
  );
  test('multiple root marriages do not consume a generation', () => {
    const root = new DescendantChart({
      ...options,
      startIndi: 'I2',
      maxDescendantGenerations: 1,
    }).createHierarchy();
    expect(root.descendants().some((n) => n.data.indi?.id === 'I3')).toBe(true);
    expect(root.descendants().some((n) => n.data.indi?.id === 'I4')).toBe(
      false,
    );
  });
  test('family ancestor root counts as generation zero', () => {
    const root = new AncestorChart({
      ...options,
      startFam: 'F3',
      maxAncestorGenerations: 0,
    }).createHierarchy();
    expect(root.descendants().map((n) => n.data.indi?.id)).toEqual(['I3']);
  });
  test.each([-1, 0.5, NaN, Infinity])('rejects invalid limit %s', (limit) => {
    expect(() =>
      new AncestorChart({
        ...options,
        startIndi: 'I4',
        ...(limit === undefined ? {} : { maxAncestorGenerations: limit }),
      }).createHierarchy(),
    ).toThrow(RangeError);
    expect(() =>
      new DescendantChart({
        ...options,
        startFam: 'F1',
        ...(limit === undefined ? {} : { maxDescendantGenerations: limit }),
      }).createHierarchy(),
    ).toThrow(RangeError);
  });
});

import { RelativesChart } from '../src/relatives-chart';
import { createChart } from '../src/simple-api';

test('simple API passes the ancestor limit', () => {
  document.body.innerHTML = '<svg></svg>';
  const chart = createChart({
    json,
    chartType: AncestorChart,
    renderer: FakeRenderer,
    maxAncestorGenerations: 0,
  });
  chart.render({ startIndi: 'I4' });
  expect(document.querySelectorAll('g.node').length).toBe(1);
});

test.each([0, 1])(
  'relatives descendants stop at selected-root limit %s',
  (limit) => {
    document.body.innerHTML = '<svg></svg>';
    const relatives: JsonGedcomData = {
      indis: [
        { id: 'root', famc: 'parents' },
        { id: 'parent', fams: ['parents'] },
        { id: 'sibling', famc: 'parents', fams: ['siblingFamily'] },
        { id: 'nephew', famc: 'siblingFamily', fams: ['nephewFamily'] },
        { id: 'grandnephew', famc: 'nephewFamily' },
      ],
      fams: [
        { id: 'parents', husb: 'parent', children: ['root', 'sibling'] },
        { id: 'siblingFamily', husb: 'sibling', children: ['nephew'] },
        { id: 'nephewFamily', husb: 'nephew', children: ['grandnephew'] },
      ],
    };
    const chart = new RelativesChart({
      ...options,
      data: new JsonDataProvider(relatives),
      startIndi: 'root',
      maxDescendantGenerations: limit,
    });
    chart.render();
    const nodes = Array.from(document.querySelectorAll('g.node')).map(
      (el) => (el as any).__data__.data,
    );
    const ids = nodes.flatMap((n) => [n.indi?.id, n.spouse?.id]);
    expect(ids).toContain('sibling');
    expect(ids.includes('nephew')).toBe(limit === 1);
    expect(ids).not.toContain('grandnephew');
  },
);
