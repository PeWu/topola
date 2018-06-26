import * as jsdomGlobal from 'jsdom-global';

import {AncestorChart} from '../src/ancestor-chart';
import {JsonDataProvider, JsonGedcomData} from '../src/data';

import {FakeRenderer} from './fake_renderer';

(jsdomGlobal as any)();  // tslint:disable-line
document.body.innerHTML = '<svg></svg>';


describe('Ancestor chart', () => {
  it('should work for a single person', () => {
    const json: JsonGedcomData = {fams: [], indis: [{id: 'I1'}]};
    const data = new JsonDataProvider(json);
    const chart = new AncestorChart({
      data,
      startIndi: 'I1',
      renderer: new FakeRenderer(),
    });
    chart.render();
    expect(document.querySelectorAll('g.node').length).toEqual(1);
  });
});
