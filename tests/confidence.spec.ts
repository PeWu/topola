import { propagateConfidence } from '../src/confidence';
import { JsonGedcomData } from '../src/data';
import { gedcomToJson } from '../src/gedcom';

describe('QUAY confidence', () => {
  describe('parsing', () => {
    const gedcom = [
      '0 HEAD',
      '0 @I1@ INDI',
      '1 NAME John /Doe/',
      '1 SOUR @S1@',
      '2 QUAY 1',
      '1 BIRT',
      '2 DATE 1900',
      '2 SOUR @S1@',
      '3 QUAY 1',
      '2 SOUR @S2@',
      '3 QUAY 3',
      '1 DEAT',
      '2 DATE 1950',
      '1 FAMS @F1@',
      '0 @I2@ INDI',
      '1 NAME Jane /Doe/',
      '1 SOUR @S1@',
      '2 PAGE no rating',
      '1 FAMS @F1@',
      '0 @F1@ FAM',
      '1 HUSB @I1@',
      '1 WIFE @I2@',
      '1 MARR',
      '2 DATE 1920',
      '2 SOUR @S1@',
      '3 QUAY 0',
      '0 TRLR',
    ].join('\n');
    const json = gedcomToJson(gedcom);
    const john = json.indis.find((indi) => indi.id === 'I1')!;
    const jane = json.indis.find((indi) => indi.id === 'I2')!;

    it('uses the highest QUAY among an event’s citations', () => {
      expect(john.birth!.confidence).toEqual(3);
      expect(john.death!.confidence).toBeUndefined();
      expect(json.fams[0].marriage!.confidence).toEqual(0);
    });

    it('rates individuals by their own and birth citations', () => {
      expect(john.confidence).toEqual(3);
      expect(jane.confidence).toBeUndefined();
    });
  });

  describe('propagation', () => {
    // I1 (me, unrated) is a child of F1: I2 (father, QUAY 2) and I3 (mother, 3).
    // I2 is a child of F2: I4 (3) and I5 (unrated). I7 (uncle, 3) is another
    // child of F2. I4 is a child of F3: I6 (unrated).
    const data: JsonGedcomData = {
      indis: [
        { id: 'I1', famc: 'F1' },
        { id: 'I2', famc: 'F2', fams: ['F1'], confidence: 2 },
        { id: 'I3', fams: ['F1'], confidence: 3 },
        { id: 'I4', famc: 'F3', fams: ['F2'], confidence: 3 },
        { id: 'I5', fams: ['F2'] },
        { id: 'I6', fams: ['F3'] },
        { id: 'I7', famc: 'F2', confidence: 3 },
      ],
      fams: [
        { id: 'F1', husb: 'I2', wife: 'I3', children: ['I1'] },
        { id: 'F2', husb: 'I4', wife: 'I5', children: ['I2', 'I7'] },
        { id: 'F3', husb: 'I6', children: ['I4'] },
      ],
    };
    const confidences = (start: string) =>
      Object.fromEntries(
        propagateConfidence(data, start).indis.map((indi) => [
          indi.id,
          indi.confidence,
        ]),
      );

    it('passes a weak parent link on to everyone beyond it', () => {
      expect(confidences('I1')).toEqual({
        I1: undefined,
        I2: 2,
        I3: 3,
        I4: 2,
        I5: 2,
        I6: 2,
        I7: 2,
      });
    });

    it('uses the best path and depends on the start individual', () => {
      expect(confidences('I7')).toEqual({
        I1: 2,
        I2: 2,
        I3: 2,
        I4: 3,
        I5: 3,
        I6: 3,
        I7: 3,
      });
    });

    it('does not modify the input', () => {
      propagateConfidence(data, 'I1');
      expect(data.indis[4].confidence).toBeUndefined();
    });
  });
});
