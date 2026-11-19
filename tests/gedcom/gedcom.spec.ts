import { describe, expect, it } from 'vitest';
import {
  gedcomEntriesToModel,
  gedcomToModel,
  parseGedcomDate,
  type GedcomEntry,
} from '../../src/gedcom/index.js';
import { bestCitationQuality } from '../../src/gedcom/gedcom-parser.js';

describe('GEDCOM parser (topola/gedcom)', () => {
  describe('parseGedcomDate', () => {
    it('parses simple, partial, pre-1000, Julian, parenthesized, and multi-space dates', () => {
      expect(parseGedcomDate('9 JUN 2019')).toEqual({
        date: { day: 9, month: 6, year: 2019 },
      });
      expect(parseGedcomDate('9   JUN    2019')).toEqual({
        date: { day: 9, month: 6, year: 2019 },
      });
      expect(parseGedcomDate('2019')).toEqual({ date: { year: 2019 } });
      expect(parseGedcomDate('JUN 2019')).toEqual({
        date: { month: 6, year: 2019 },
      });
      expect(parseGedcomDate('9 JUN')).toEqual({ date: { day: 9, month: 6 } });
      expect(parseGedcomDate('6')).toEqual({ date: { year: 6 } });
      expect(parseGedcomDate('66')).toEqual({ date: { year: 66 } });
      expect(parseGedcomDate('9 JUN 966')).toEqual({
        date: { day: 9, month: 6, year: 966 },
      });
      expect(parseGedcomDate('@#DJULIAN@ 9 JUN 1539')).toEqual({
        date: { day: 9, month: 6, year: 1539 },
      });
      expect(parseGedcomDate('(August)')).toEqual({
        date: { text: 'August' },
      });
      expect(parseGedcomDate('(9 JUN)')).toEqual({
        date: { day: 9, month: 6 },
      });
      expect(parseGedcomDate('(August 2022)')).toEqual({
        date: { text: 'August 2022' },
      });
    });

    it('handles BET..AND, BEF, AFT, and malformed BET without AND cleanly', () => {
      expect(parseGedcomDate('BET 1900 AND 1910')).toEqual({
        dateRange: { from: { year: 1900 }, to: { year: 1910 } },
      });
      expect(parseGedcomDate('BEF 1850')).toEqual({
        dateRange: { to: { year: 1850 } },
      });
      expect(parseGedcomDate('AFT 1850')).toEqual({
        dateRange: { from: { year: 1850 } },
      });
      // Malformed BET without AND must not slice off the final year token
      expect(parseGedcomDate('BET 1905')).toEqual({
        dateRange: { from: { year: 1905 } },
      });

      // Word boundaries on bet/bef/aft, lone range keywords, separate parens, and day without month
      expect(parseGedcomDate('Bethlehem 1900')).toEqual({
        date: { text: 'Bethlehem 1900' },
      });
      expect(parseGedcomDate('Afternoon of 5 JUN 1920')).toEqual({
        date: { text: 'Afternoon of 5 JUN 1920' },
      });
      expect(parseGedcomDate('BEF')).toEqual({ date: { text: 'BEF' } });
      expect(parseGedcomDate('AFT')).toEqual({ date: { text: 'AFT' } });
      expect(parseGedcomDate('BET AND')).toEqual({ date: { text: 'BET AND' } });
      expect(parseGedcomDate('(early) 1900 (approx)')).toEqual({
        date: { text: '(early) 1900 (approx)' },
      });
      expect(parseGedcomDate('(1900 (approx))')).toEqual({
        date: { text: '1900 (approx)' },
      });
      expect(parseGedcomDate('03 1900')).toEqual({
        date: { text: '03 1900' },
      });

      // Free-text phrases starting with bet/bef/aft stay verbatim text rather than becoming dateRange
      expect(parseGedcomDate('Between the wars')).toEqual({
        date: { text: 'Between the wars' },
      });
      expect(parseGedcomDate('Between spring and autumn')).toEqual({
        date: { text: 'Between spring and autumn' },
      });
      expect(parseGedcomDate('Before the war')).toEqual({
        date: { text: 'Before the war' },
      });
      expect(parseGedcomDate('After moving to London')).toEqual({
        date: { text: 'After moving to London' },
      });
      expect(parseGedcomDate('BET 1914 AND unknown')).toEqual({
        dateRange: { from: { year: 1914 }, to: { text: 'unknown' } },
      });
    });
  });

  describe('Names, Notes (CONT/CONC), QUAY, Events, Images, and References', () => {
    it('parses main and maiden NAME records in any order', () => {
      const m1 = gedcomToModel(`
0 @I1@ INDI
1 NAME /Smith/
2 TYPE maiden
1 NAME Jane /Doe/
`);
      expect(m1.indis[0]!.firstName).toBe('Jane');
      expect(m1.indis[0]!.lastName).toBe('Doe');
      expect(m1.indis[0]!.maidenName).toBe('Smith');

      const m2 = gedcomToModel(`
0 @I1@ INDI
1 NAME John /Smith/
2 TYPE maiden
1 NAME /Doe/
`);
      expect(m2.indis[0]!.firstName).toBe('John');
      expect(m2.indis[0]!.lastName).toBe('Doe');
      expect(m2.indis[0]!.maidenName).toBe('Smith');
    });

    it('parses NOTE with CONT and CONC continuations', () => {
      const sut = gedcomToModel(`
0 @I1@ INDI
1 NOTE line1part1
2 CONC line1part2
2 CONT line2
`);
      expect(sut.indis[0]!.notes).toEqual(['line1part1line1part2', 'line2']);
    });

    it('parses NCHI, NMR, BIRT, EVEN (filtering empty EVENs without undefined leaks), and QUAY', () => {
      const sut = gedcomToModel(`
0 @I1@ INDI
1 NAME John /Doe/
1 NCHI 4
1 NMR 2
1 SOUR @S1@
2 QUAY 1
1 BIRT
2 DATE 23 Sep 1926
2 PLAC Dix Hills, NY
2 SOUR @S2@
3 QUAY 3
1 EVEN
2 TYPE EmptyEventWithoutDateOrPlace
1 EVEN
2 TYPE Valid
2 DATE 1 Jan 1980
2 PLAC New York
`);
      const indi = sut.indis[0]!;
      expect(indi.numberOfChildren).toBe(4);
      expect(indi.numberOfMarriages).toBe(2);
      expect(indi.confidence).toBe(3);
      expect(indi.parentLinkConfidence).toBe(3);
      expect(indi.birth?.confidence).toBe(3);
      // Empty EVEN must be filtered out rather than leaving `undefined` in events[]!
      expect(indi.events?.length).toBe(1);
      expect(indi.events?.[0]).toBeDefined();
      expect(indi.events?.[0]?.place).toBe('New York');
      expect(indi.events?.[0]?.type).toBe('Valid');
    });

    it('ignores white space at the end of lines', () => {
      const sut = gedcomToModel(
        [
          '0 @I1@ INDI ',
          '1 SEX M ',
          '1 FAMS @F1@ ',
          '1 DEAT Y ',
          '1 NCHI 2 ',
          '0 @I2@ INDI',
          '1 FAMC @F1@ ',
          '1 BIRT',
          '2 PLAC Kraków ',
          '0 @F1@ FAM',
          '1 HUSB @I1@ ',
          '1 CHIL @I2@ ',
        ].join('\n'),
      );
      expect(sut.indis[0]).toMatchObject({
        id: 'I1',
        sex: 'M',
        fams: ['F1'],
        death: { confirmed: true },
        numberOfChildren: 2,
      });
      expect(sut.indis[1]!.famc).toBe('F1');
      expect(sut.indis[1]!.birth?.place).toBe('Kraków');
      expect(sut.fams[0]).toMatchObject({ husb: 'I1', children: ['I2'] });
    });

    it('reads files with CR, CR LF and LF line ends and a byte order mark alike', () => {
      const lines = [
        '0 HEAD',
        '0 @I1@ INDI',
        '1 NAME Ada /Lovelace/',
        '1 FAMS @F1@',
        '0 @F1@ FAM',
        '1 WIFE @I1@',
        '0 TRLR',
      ];
      const expected = gedcomToModel(lines.join('\n'));
      expect(expected.indis[0]).toMatchObject({
        firstName: 'Ada',
        lastName: 'Lovelace',
        fams: ['F1'],
      });
      expect(expected.fams[0]!.wife).toBe('I1');
      expect(gedcomToModel(lines.join('\r'))).toEqual(expected);
      expect(gedcomToModel(lines.join('\r\n'))).toEqual(expected);
      expect(gedcomToModel('\uFEFF' + lines.join('\r\n'))).toEqual(expected);
    });

    it('says that text is not GEDCOM instead of failing inside the tokenizer', () => {
      for (const text of [
        'hello 1 world',
        '<html><body>404 1 x</body></html>',
        '1 NAME starts /at level 1/',
      ]) {
        let error: unknown;
        try {
          gedcomToModel(text);
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/^Invalid GEDCOM/);
        expect((error as Error).cause).toBeInstanceOf(Error);
      }
      // No line at all is an empty file, not an error.
      expect(gedcomToModel('')).toEqual({ indis: [], fams: [] });
    });

    it('says that text without any GEDCOM line is not GEDCOM, and takes an empty file', () => {
      for (const text of [
        'hello world',
        '<!doctype html><html><body>Not Found</body></html>',
        '<!DOCTYPE html>\n<html><head><style>body { margin: 0 auto; }</style></head><body>404 Not Found</body></html>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>',
        '{"indis":[],"fams":[]}',
        '{"status": 200, "message": "Found 0 records"}',
        '\u0000\u0001\u0002PNG',
        '\x89PNG\r\n\x1a\n\x00\x000 IHDR',
        'Error: returned 0 items from server',
      ]) {
        expect(() => gedcomToModel(text), text).toThrow(/^Invalid GEDCOM/);
      }
      // An empty file is no error, and neither is GEDCOM without people.
      for (const blank of ['', ' \n\t\r\n', '\uFEFF']) {
        expect(gedcomToModel(blank)).toEqual({ indis: [], fams: [] });
      }
      expect(gedcomToModel('0 HEAD\n1 CHAR UTF-8\n0 TRLR')).toEqual({
        indis: [],
        fams: [],
      });
      expect(gedcomEntriesToModel([])).toEqual({ indis: [], fams: [] });

      // Something that is no text at all is not reported as a bad file.
      for (const value of [undefined, null, new ArrayBuffer(4), 7]) {
        let error: unknown;
        try {
          gedcomToModel(value as unknown as string);
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(TypeError);
        expect((error as Error).message).toContain('as a string');
      }
    });

    it('trims the file and the title of a picture and the type of an event', () => {
      const sut = gedcomToModel(
        [
          '0 @I1@ INDI',
          '1 OBJE',
          '2 FILE a.jpg ',
          '2 TITL portrait ',
          '1 EVEN',
          '2 TYPE Valid ',
          '2 DATE 1 JAN 1900',
        ].join('\n'),
      );
      expect(sut.indis[0]!.images).toEqual([
        { url: 'a.jpg', title: 'portrait' },
      ]);
      expect(sut.indis[0]!.events?.[0]?.type).toBe('Valid');
    });

    it('reads a partner that is listed twice once, and nobody as both partners', () => {
      const sut = gedcomToModel(
        [
          '0 @I1@ INDI',
          '0 @I2@ INDI',
          '0 @F1@ FAM',
          '1 HUSB @I1@',
          '1 HUSB @I1@',
          '1 HUSB @I2@',
          '0 @F2@ FAM',
          '1 HUSB @I1@',
          '1 WIFE @I1@',
          '0 @F3@ FAM',
          '1 HUSB @I1@',
          '1 WIFE @I1@',
          '1 WIFE @I2@',
          '0 @F4@ FAM',
          '1 WIFE @I2@',
          '1 WIFE @I2@',
        ].join('\n'),
      );
      const partners = sut.fams.map(({ id, husb, wife }) => [id, husb, wife]);
      expect(partners).toEqual([
        ['F1', 'I1', 'I2'],
        ['F2', 'I1', undefined],
        ['F3', 'I1', 'I2'],
        ['F4', undefined, 'I2'],
      ]);
    });

    it('leaves out records without an id, references to records of another kind, and counts that are no numbers', () => {
      const sut = gedcomToModel(`
0 INDI
1 NAME No /Id/
0 FAM
0 @I1@ INDI
1 FAMS @I2@
1 FAMS @F1@
1 FAMS @F1@
1 FAMC @S1@
1 FAMC @NOWHERE@
1 NMR two
1 NCHI
0 @I2@ INDI
0 @S1@ SOUR
0 @F1@ FAM
1 HUSB @S1@
1 WIFE @I1@
1 CHIL @F1@
1 CHIL @I2@
1 CHIL @I2@
`);
      expect(sut.indis.map((i) => i.id)).toEqual(['I1', 'I2']);
      expect(sut.fams.map((f) => f.id)).toEqual(['F1']);
      const indi = sut.indis[0]!;
      expect(indi.fams).toEqual(['F1']);
      expect(indi.famc).toBeUndefined();
      expect('numberOfMarriages' in indi).toBe(false);
      expect('numberOfChildren' in indi).toBe(false);
      expect(sut.fams[0]).toEqual({ id: 'F1', wife: 'I1', children: ['I2'] });
      expect(JSON.parse(JSON.stringify(sut))).toEqual(sut);
    });

    it('recognises a maiden name in any case (GEDCOM 7 writes MAIDEN)', () => {
      for (const type of ['maiden', 'MAIDEN', 'Maiden ']) {
        const sut = gedcomToModel(`
0 @I1@ INDI
1 NAME Jane /Doe/
1 NAME Jane /Smith/
2 TYPE ${type}
`);
        expect(sut.indis[0]!.lastName).toBe('Doe');
        expect(sut.indis[0]!.maidenName).toBe('Smith');
      }
    });

    it('reads shared notes, several notes and empty lines, and no note without text', () => {
      const sut = gedcomToModel(`
0 @I1@ INDI
1 NOTE @N1@
1 NOTE first
2 CONT
2 CONT third
1 NOTE @VOID@
1 NOTE @N404@
1 BIRT
2 DATE 1900
2 NOTE @N1@
0 @I2@ INDI
1 NOTE
0 @N1@ NOTE shared
1 CONC -text
1 CONT more
`);
      expect(sut.indis[0]!.notes).toEqual([
        'shared-text',
        'more',
        'first',
        '',
        'third',
      ]);
      expect(sut.indis[0]!.birth?.notes).toEqual(['shared-text', 'more']);
      expect('notes' in sut.indis[1]!).toBe(false);
    });

    it('parses qualifiers, lower-case months, marriages and confirmed deaths', () => {
      expect(parseGedcomDate('ABT 1850')).toEqual({
        date: { qualifier: 'abt', year: 1850 },
      });
      expect(parseGedcomDate('cal 3 mar 1850')).toEqual({
        date: { qualifier: 'cal', day: 3, month: 3, year: 1850 },
      });
      expect(parseGedcomDate('EST jun 1850')).toEqual({
        date: { qualifier: 'est', month: 6, year: 1850 },
      });
      // What is no date stays text.
      expect(parseGedcomDate('ABT')).toEqual({ date: { text: 'ABT' } });
      expect(parseGedcomDate('32 JAN 2000')).toEqual({
        date: { text: '32 JAN 2000' },
      });
      expect(parseGedcomDate('0 JAN 2000')).toEqual({
        date: { text: '0 JAN 2000' },
      });
      expect(parseGedcomDate('31 JAN 2000')).toEqual({
        date: { day: 31, month: 1, year: 2000 },
      });

      const sut = gedcomToModel(`
0 @I1@ INDI
1 DEAT Y
1 FAMS @F1@
0 @I2@ INDI
1 FAMS @F1@
0 @F1@ FAM
1 WIFE @I1@
1 WIFE @I2@
1 MARR
2 DATE 4 JUL 1876
2 PLAC Boston
`);
      expect(sut.indis[0]!.death).toEqual({ confirmed: true });
      expect(sut.fams[0]).toEqual({
        id: 'F1',
        children: [],
        husb: 'I1',
        wife: 'I2',
        marriage: {
          date: { day: 4, month: 7, year: 1876 },
          place: 'Boston',
          confirmed: true,
        },
      });
    });

    it('parses inline and referenced OBJE images while ignoring @VOID@', () => {
      const sut = gedcomToModel(`
0 @I1@ INDI
1 OBJE
2 FILE inline.jpg
2 TITL Inline
1 OBJE @O1@
1 OBJE @VOID@
0 @O1@ OBJE
1 FILE ref.jpg
1 TITL Ref
`);
      expect(sut.indis[0]!.images).toEqual([
        { url: 'inline.jpg', title: 'Inline' },
        { url: 'ref.jpg', title: 'Ref' },
      ]);
    });

    it('skips @VOID@ in multi-FAMC and preserves same-sex FAM partners', () => {
      const sut = gedcomToModel(`
0 @I1@ INDI
1 FAMC @VOID@
1 FAMC @F_PARENTS@
0 @I2@ INDI
1 FAMS @F_SAME_M@
0 @I3@ INDI
1 FAMS @F_SAME_M@
0 @F_PARENTS@ FAM
1 CHIL @I1@
0 @F_SAME_M@ FAM
1 HUSB @I2@
1 HUSB @I3@
`);
      expect(sut.indis[0]!.famc).toBe('F_PARENTS');
      const sameSexFam = sut.fams.find((f) => f.id === 'F_SAME_M')!;
      expect(sameSexFam.husb).toBe('I2');
      expect(sameSexFam.wife).toBe('I3');
    });

    it('accepts pre-parsed GedcomEntry[] via gedcomEntriesToModel', () => {
      const sut = gedcomEntriesToModel([
        {
          level: 0,
          pointer: '@I1@',
          tag: 'INDI',
          data: '',
          tree: [{ level: 1, pointer: '', tag: 'NAME', data: 'Ada /Lovelace/', tree: [] }],
        },
      ]);
      expect(sut.indis[0]!.firstName).toBe('Ada');
      expect(sut.indis[0]!.lastName).toBe('Lovelace');

      // Hand-built entries omitting optional leaf `tree` / `data` fields
      const minimal = gedcomEntriesToModel([
        {
          level: 0,
          pointer: '@I1@',
          tag: 'INDI',
          data: '',
          tree: [{ level: 1, pointer: '', tag: 'NAME' } as unknown as GedcomEntry],
        },
      ]);
      expect(minimal.indis[0]!.id).toBe('I1');
    });

    it('keeps inline OBJE with payload text, concatenates CONC on values, and validates QUAY digits strictly', () => {
      const sut = gedcomToModel(
        [
          '0 @I1@ INDI',
          '1 NAME Jan ',
          '2 CONC Karol /Kowal',
          '2 CONC ski/',
          '1 OBJE portrait',
          '2 FILE https://example.com/path/',
          '3 CONC portrait.jpg',
          '2 TITL Main ',
          '3 CONC Portrait',
          '3 CONT Painted in Krakow',
          '3 CONC , Poland',
          '1 BIRT',
          '2 DATE 9 ',
          '3 CONT JUN 1900',
          '2 PLAC Street 1',
          '3 CONT Warsaw, ',
          '3 CONC Poland',
          '2 SOUR @S1@',
          '3 QUAY 2x',
          '2 SOUR @S2@',
          '3 QUAY -0',
          '2 SOUR @S3@',
          '3 QUAY 3.9',
          '0 @VOID@ INDI',
          '1 NAME Ghost /Void/',
          '0 @VOID@ FAM',
        ].join('\n'),
      );
      expect(sut.indis).toHaveLength(1);
      expect(sut.fams).toHaveLength(0);
      const indi = sut.indis[0]!;
      expect(indi.firstName).toBe('Jan Karol');
      expect(indi.lastName).toBe('Kowalski');
      expect(indi.images).toEqual([
        {
          url: 'https://example.com/path/portrait.jpg',
          title: 'Main Portrait\nPainted in Krakow, Poland',
        },
      ]);
      expect(indi.birth).toMatchObject({
        date: { day: 9, month: 6, year: 1900 },
        place: 'Street 1\nWarsaw, Poland',
      });
      expect(indi.confidence).toBeUndefined();
      expect(
        gedcomEntriesToModel([
          { level: 0, pointer: 'I', tag: 'INDI', data: '', tree: [] },
        ]).indis.map((i) => i.id),
      ).toEqual(['I']);
      expect(
        bestCitationQuality([
          {
            level: 1,
            pointer: '',
            tag: 'BIRT',
            data: '',
            tree: [
              {
                level: 2,
                pointer: '',
                tag: 'SOUR',
                data: '@S1@',
                tree: [{ level: 3, pointer: '', tag: 'QUAY', data: '2', tree: [] }],
              },
            ],
          },
        ]),
      ).toBe(2);
    });
  });
});
