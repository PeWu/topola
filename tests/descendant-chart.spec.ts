/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from 'jsdom-global';

import {JsonDataProvider, JsonGedcomData} from '../src/data';
import {DescendantChart} from '../src/descendant-chart';

import {FakeRenderer} from './fake_renderer';

// Initialize DOM.
(jsdomGlobal as any)();  // tslint:disable-line

describe('Descendant chart', () => {
  beforeEach(() => {
    document.body.innerHTML = '<svg></svg>';
  });

  it('should work for a single person', () => {
    const json: JsonGedcomData = {fams: [], indis: [{id: 'I1'}]};
    const data = new JsonDataProvider(json);
    const chart = new DescendantChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(1);
  });

  it('should work with a common descendant of two siblings', () => {
    // I1+I2
    //   F1
    //   |
    //  +-++
    //  |  |
    //  I3+I4
    //    F2
    //    |
    //    I5
    const json: JsonGedcomData = {
      fams: [
        {id: 'F1', husb: 'I1', wife: 'I2', children: ['I3', 'I4']},
        {id: 'F2', husb: 'I3', wife: 'I4', children: ['I5']},
      ],
      indis: [
        {id: 'I1', fams: ['F1']},
        {id: 'I2', fams: ['F1']},
        {id: 'I3', fams: ['F2'], famc: 'F1'},
        {id: 'I4', fams: ['F2'], famc: 'F1'},
        {id: 'I5', famc: 'F2'},
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new DescendantChart({
      data,
      startFam: 'F1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
  });
});
