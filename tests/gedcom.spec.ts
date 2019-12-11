import {getDate, gedcomToJson} from '../src/gedcom';


describe('GEDCOM parser', () => {
  describe('date', () => {
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

  describe('Name', () => {
    it('should parse name correctly', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NAME John /Doe/
      `;
  
      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].firstName).toBe('John');
      expect(sut.indis[0].lastName).toBe('Doe');
    });
    it('should parse maiden name correctly', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NAME Jane /Doe/
      1 NAME /Smith/
      2 TYPE maiden
      `;
  
      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].firstName).toBe('Jane');
      expect(sut.indis[0].lastName).toBe('Doe');
      expect(sut.indis[0].maidenName).toBe('Smith');
    });
  });

  describe('Meta', () => {
    it('should parse number of children correctly', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NCHI 10
      `;
  
      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].numberOfChildren).toBe(10);
    });
    it('should parse number of marriages correctly', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NMR 5
      `;
  
      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].numberOfMarriages).toBe(5);
    });
  });

  describe('Images', () => {
    it('should parse multiple image objects correctly', () => {
      let gedcom = `
      0 @I1@ INDI
      1 OBJE
      2 FILE main.jpg
      2 TITL some
      1 OBJE
      2 FILE images.jpg
      2 TITL description
      `;
  
      let sut = gedcomToJson(gedcom);
      expect(sut.indis.length).toBe(1);
  
      expect(sut.indis[0].images!.length).toBe(2);
      expect(sut.indis[0].images![0].url).toBe('main.jpg');
      expect(sut.indis[0].images![0].title).toBe('some');
      expect(sut.indis[0].images![1].url).toBe('images.jpg');
      expect(sut.indis[0].images![1].title).toBe('description');
    });
  });
});
