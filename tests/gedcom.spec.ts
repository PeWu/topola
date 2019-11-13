import {getDate} from '../src/gedcom';


describe('GEDCOM parser', () => {
  it('should parse a simple date', () => {
    expect(getDate('9 JUN 2019')).toEqual({date: {day: 9, month: 6, year: 2019}});
  });
  it('should parse partial dates', () => {
    expect(getDate('2019')).toEqual({date: {year: 2019}});
    expect(getDate('JUN 2019')).toEqual({date: {month: 6, year: 2019}});
    expect(getDate('9 JUN')).toEqual({date: {day: 9, month: 6}});
  });
  it('should parse dates before year 1000', () => {
    expect(getDate('6')).toEqual({date: {year: 6}});
    expect(getDate('66')).toEqual({date: {year: 66}});
    expect(getDate('966')).toEqual({date: {year: 966}});
    expect(getDate('JUN 966')).toEqual({date: {month: 6, year: 966}});
    expect(getDate('9 JUN 966')).toEqual({date: {day: 9, month: 6, year: 966}});
  });
});
