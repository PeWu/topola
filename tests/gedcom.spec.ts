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

    it('should handle calendar type specification', () => {
      expect(getDate('@#DJULIAN@ 9 JUN 1539'))
          .toEqual({date: {day: 9, month: 6, year: 1539}});
    });

    it('should handle arbitrary date phrase in parentheses', () => {
      expect(getDate('(August)')).toEqual({date: {text: 'August'}});
    });

    it('should handle parsable date in parentheses', () => {
      expect(getDate('(9 JUN)')).toEqual({date: {day: 9, month: 6}});
    });

    it('should handle arbitrary date phrase if parsing fails', () => {
      expect(getDate('(August 2022)')).toEqual({date: {text: 'August 2022'}});
    });
  });

  describe('Name', () => {
    it('should parse name', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NAME John /Doe/
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].firstName).toBe('John');
      expect(sut.indis[0].lastName).toBe('Doe');
    });

    it('should parse maiden name', () => {
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

    it('should consider the first NAME record as main', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NAME John /Doe/
      1 NAME Jane /Adams/
      1 NAME /Smith/
      2 TYPE maiden
      1 NAME Tony /Stark/
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].firstName).toBe('John');
      expect(sut.indis[0].lastName).toBe('Doe');
      expect(sut.indis[0].maidenName).toBe('Smith');
    });

    it('should parse NAME with maiden', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NAME /Smith/
      2 TYPE maiden
      1 NAME John /Doe/
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].firstName).toBe('John');
      expect(sut.indis[0].lastName).toBe('Doe');
      expect(sut.indis[0].maidenName).toBe('Smith');
    });

    it('should treat maiden first name is the main if nothing else provided', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NAME John /Smith/
      2 TYPE maiden
      1 NAME /Doe/
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].firstName).toBe('John');
      expect(sut.indis[0].lastName).toBe('Doe');
      expect(sut.indis[0].maidenName).toBe('Smith');
    });

    it('should parse correctly if no main NAME', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NAME /Smith/
      2 TYPE maiden
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].firstName).toBeUndefined();
      expect(sut.indis[0].lastName).toBeUndefined();
      expect(sut.indis[0].maidenName).toBe('Smith');
    });
  });

  describe('Notes', () => {
    it('should parse single note', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NOTE Hello
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].notes!.length).toBe(1);
      expect(sut.indis[0].notes![0]).toBe('Hello');
    });

    it('should parse single note', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NOTE Hello
      2 CONT World
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].notes!.length).toBe(2);
      expect(sut.indis[0].notes![0]).toBe('Hello');
      expect(sut.indis[0].notes![1]).toBe('World');
    });
  });

  describe('Meta', () => {
    it('should parse number of children', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NCHI 10
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].numberOfChildren).toBe(10);
    });

    it('should parse number of marriages', () => {
      let gedcom = `
      0 @I1@ INDI
      1 NMR 5
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].numberOfMarriages).toBe(5);
    });
  });

  describe('Events', () => {
    it('should parse events', () => {
      let gedcom = `
      0 @I1@ INDI
      1 EVEN
      2 TYPE Simple
      2 DATE 1 Jan 1980
      2 PLAC 131 W 3rd St, New York, NY 10012
      2 NOTE line1
      3 CONT line2
      3 CONT line3
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].events!.length).toBe(1);
      expect(sut.indis[0].events![0].type).toBe('Simple');
      expect(sut.indis[0].events![0].date!.day).toBe(1);
      expect(sut.indis[0].events![0].date!.month).toBe(1);
      expect(sut.indis[0].events![0].date!.year).toBe(1980);
      expect(sut.indis[0].events![0].place).toBe('131 W 3rd St, New York, NY 10012');
      expect(sut.indis[0].events![0].notes![0]).toBe('line1');
      expect(sut.indis[0].events![0].notes![1]).toBe('line2');
      expect(sut.indis[0].events![0].notes![2]).toBe('line3');
    });

    it('should parse birthday', () => {
      let gedcom = `
      0 @I1@ INDI
      1 BIRT
      2 DATE 23 Sep 1926
      2 PLAC 247 Candlewood Path, Dix Hills, NY 11746
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].birth!.date!.day).toBe(23);
      expect(sut.indis[0].birth!.date!.month).toBe(9);
      expect(sut.indis[0].birth!.date!.year).toBe(1926);
      expect(sut.indis[0].birth!.place).toBe('247 Candlewood Path, Dix Hills, NY 11746');
    });
  });

  describe('Images', () => {
    it('should parse multiple image objects', () => {
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

    it('should parse images as separate OBJE objects', () => {
      let gedcom = `
      0 @I1@ INDI
      1 OBJE @O1@
      0 @O1@ OBJE
      1 FILE image.jpg
      1 TITL description
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis.length).toBe(1);

      expect(sut.indis[0].images!.length).toBe(1);
      expect(sut.indis[0].images![0].url).toBe('image.jpg');
      expect(sut.indis[0].images![0].title).toBe('description');
    });

    it('should handle @VOID@ object references', () => {
      let gedcom = `
      0 @I1@ INDI
      1 OBJE @VOID@
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis.length).toBe(1);

      expect(sut.indis[0].images!.length).toBe(0);
    });
  });

  describe('References', () => {
    it('should ignore @VOID@ references', () => {
      let gedcom = `
      0 @I1@ INDI
      1 FAMC @VOID@
      2 FAMS @VOID@
      0 @F1@ FAM
      1 HUSB @VOID@
      1 WIFE @VOID@
      1 CHIL @VOID@
      `;

      let sut = gedcomToJson(gedcom);
      expect(sut.indis[0].famc).toBeUndefined();
      expect(sut.indis[0].fams?.length).toBe(0);
      expect(sut.fams[0].husb).toBeUndefined();
      expect(sut.fams[0].wife).toBeUndefined();
      expect(sut.fams[0].children?.length).toBe(0);
    });
  });
});
