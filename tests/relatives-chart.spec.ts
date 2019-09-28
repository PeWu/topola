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
      fams: [{ id: 'F1' }],
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
});
