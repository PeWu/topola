/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from 'jsdom-global';

import { JsonDataProvider, JsonIndi } from '../src/data';
import { DetailedRenderer } from '../src/detailed-renderer';

// Initialize DOM.
(jsdomGlobal as any)(); // tslint:disable-line

describe('DetailedRenderer', () => {
  beforeAll(() => {
    // jsdom does not lay out text, so approximate its width.
    (window as any).SVGElement.prototype.getComputedTextLength = function () {
      return (this.textContent || '').length * 6;
    };
  });

  beforeEach(() => {
    document.body.innerHTML = '<svg></svg>';
  });

  function indiHeight(json: JsonIndi): number {
    const data = new JsonDataProvider({ indis: [json], fams: [] });
    const renderer = new DetailedRenderer({ data });
    return renderer.getPreferredIndiSize(json.id)[1];
  }

  const indi: JsonIndi = {
    id: 'I1',
    firstName: 'John',
    lastName: 'Doe',
    hideId: true,
    hideSex: true,
    birth: { date: { year: 1900 } },
    occupations: ['Farmer', 'Mayor'],
    titles: ['Baron'],
  };

  // A death date adds exactly one line of details.
  function lineHeight(): number {
    const height = indiHeight({ ...indi, death: { date: { year: 1980 } } }) - indiHeight(indi);
    expect(height).toBeGreaterThan(0);
    return height;
  }

  it('hides occupations and titles by default', () => {
    const withoutDetails = { ...indi };
    delete withoutDetails.occupations;
    delete withoutDetails.titles;
    expect(indiHeight(indi)).toEqual(indiHeight(withoutDetails));
  });

  it('adds one line per occupation when shown', () => {
    expect(indiHeight({ ...indi, showOccupations: true })).toEqual(indiHeight(indi) + 2 * lineHeight());
  });

  it('adds one line per title when shown', () => {
    expect(indiHeight({ ...indi, showTitles: true })).toEqual(indiHeight(indi) + lineHeight());
  });

  it('shows occupations and titles independently', () => {
    expect(indiHeight({ ...indi, showOccupations: true, showTitles: true })).toEqual(
      indiHeight(indi) + 3 * lineHeight(),
    );
  });
});
