/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from 'jsdom-global';

import { RelativesChart } from '../src/relatives-chart';
import { JsonDataProvider, JsonGedcomData } from '../src/data';

import { FakeRenderer } from './fake_renderer';

// Initialize DOM.
(jsdomGlobal as any)(); // tslint:disable-line

describe('Relatives chart', () => {
  beforeEach(() => {
    document.body.innerHTML = '<svg></svg>';
  });

  it('should work for a single person', () => {
    const json: JsonGedcomData = { fams: [], indis: [{ id: 'I1' }] };
    const data = new JsonDataProvider(json);
    const chart = new RelativesChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(1);
  });

  it('should work with a family with no parents defined', () => {
    const json: JsonGedcomData = {
      fams: [{ id: 'F1', children: ['I1']}],
      indis: [{ id: 'I1', famc: 'F1' }],
    };
    const data = new JsonDataProvider(json);
    const chart = new RelativesChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(1);
  });

  it('should work with a family with only the wife', () => {
    const json: JsonGedcomData = {
      fams: [{ id: 'F1', children: ['I1'], wife: 'I2' }],
      indis: [{ id: 'I1', famc: 'F1' }, { id: 'I2', fams: ['F1']}],
    };
    const data = new JsonDataProvider(json);
    const chart = new RelativesChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(2);
  });

  // Regression test for an ancestor whose family-as-child records only
  // children and no parents. Such a family is pruned during hierarchy
  // construction, but the referencing ancestor node was already given an
  // indi/spouseParentNodeId pointing at it, leaving a dangling reference.
  // Here F5 (only child I5, no parents) is pruned while F3 keeps a real
  // child node (F4), so the parent-node lookup in
  // layOutAncestorDescendants() runs and finds no match. The unguarded
  // lookup previously threw "Cannot read properties of undefined (reading
  // 'data')". Reduced from a real exported tree.
  it('should render when an ancestor family-as-child has no parents defined', () => {
    const json: JsonGedcomData = {
      indis: [
        { id: 'I1', fams: ['F1'] },
        { id: 'I2', famc: 'F3', fams: ['F2'] },
        { id: 'I3', famc: 'F2', fams: ['F1'] },
        { id: 'I4', famc: 'F4', fams: ['F3'] },
        { id: 'I5', famc: 'F5', fams: ['F3'] },
        { id: 'I6', fams: ['F4'] },
      ],
      fams: [
        { id: 'F1', husb: 'I3', wife: 'I1' },
        { id: 'F2', wife: 'I2', children: ['I3'] },
        { id: 'F3', husb: 'I4', wife: 'I5', children: ['I2'] },
        { id: 'F4', wife: 'I6', children: ['I4'] },
        { id: 'F5', children: ['I5'] },
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new RelativesChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(4);
  });

  it('shows siblings when their shared family has no parents', () => {
    const json: JsonGedcomData = {
      fams: [{ id: 'F1', children: ['I1', 'I2'] }],
      indis: [{ id: 'I1', famc: 'F1' }, { id: 'I2', famc: 'F1' }],
    };
    const data = new JsonDataProvider(json);
    const chart = new RelativesChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    // Start individual, the parentless shared family, and sibling I2.
    expect(document.querySelectorAll('g.node').length).toEqual(3);
  });

  it('shows a parent-level sibling from a descendant start', () => {
    // Starting from I3, climbing through I1's parentless family F1 still
    // surfaces I1's sibling I2.
    const json: JsonGedcomData = {
      fams: [
        { id: 'F1', children: ['I1', 'I2'] },
        { id: 'F2', husb: 'I1', children: ['I3'] },
      ],
      indis: [
        { id: 'I1', famc: 'F1', fams: ['F2'] },
        { id: 'I2', famc: 'F1' },
        { id: 'I3', famc: 'F2' },
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new RelativesChart({
      data,
      startIndi: 'I3',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    // I3, I1, the parentless family F1, and sibling I2.
    expect(document.querySelectorAll('g.node').length).toEqual(4);
  });
});
