/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from 'jsdom-global';

import {AncestorChart} from '../src/ancestor-chart';
import {JsonDataProvider, JsonGedcomData} from '../src/data';

import {FakeRenderer} from './fake_renderer';

// Initialize DOM.
(jsdomGlobal as any)();  // tslint:disable-line

describe('Ancestor chart', () => {
  beforeEach(() => {
    document.body.innerHTML = '<svg></svg>';
  });

  it('should work for a single person', () => {
    const json: JsonGedcomData = {fams: [], indis: [{id: 'I1'}]};
    const data = new JsonDataProvider(json);
    const chart = new AncestorChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(1);
  });

  it('should work with a common ancestor of two spouses', () => {
    // I5+I6
    //   F3
    //   |
    //   I3+I4
    //     F2
    //     |
    //   +-++
    //   |  |
    //   I1+I2
    //     F1
    const json: JsonGedcomData = {
      fams: [
        {id: 'F1', husb: 'I1', wife: 'I2'},
        {id: 'F2', husb: 'I3', wife: 'I4', children: ['I1', 'I2']},
        {id: 'F3', husb: 'I5', wife: 'I6', children: ['I3']},
      ],
      indis: [
        {id: 'I1', fams: ['F1'], famc: 'F2'},
        {id: 'I2', fams: ['F1'], famc: 'F2'},
        {id: 'I3', fams: ['F2'], famc: 'F3'},
        {id: 'I4', fams: ['F2']},
        {id: 'I5', fams: ['F3']},
        {id: 'I6', fams: ['F3']},
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new AncestorChart({
      data,
      startFam: json.fams[0].id,
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
  });

  it('should work with FAM values only', () => {
    // I5+I6
    //   F3
    //   |
    //   I3+I4
    //     F2
    //     |
    //   +-++
    //   |  |
    //   I1+I2
    //     F1
    const json: JsonGedcomData = {
      fams: [
        {id: 'F1', children: []},
      ],
      indis: [
        {id: 'I1', fams: ['F1'], sex: "M"},
        {id: 'I2', fams: ['F1'], sex: "F"},
        {id: 'I3', famc: 'F1', sex: "F"},
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new AncestorChart({
      data,
      startFam: json.fams[0].id,
      renderer: new FakeRenderer(),
      svgSelector: 'svg',
    });
    chart.render();
  });

});
