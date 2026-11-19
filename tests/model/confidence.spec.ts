import { describe, expect, it } from 'vitest';
import {
  computeConfidenceMap,
  createModelGraph,
  type ModelData,
  type ModelGraph,
} from '../../src/model/index.js';
import { propagateConfidence } from '../../src/model/confidence.js';

describe('QUAY widest-path confidence propagation (topola/model)', () => {
  const data: ModelData = {
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

  it('passes a weak parent link on to everyone reachable only through it', () => {
    const map = computeConfidenceMap(data, 'I1');
    expect(map.get('I1')).toBeUndefined();
    expect(map.get('I2')).toBe(2);
    expect(map.get('I3')).toBe(3);
    expect(map.get('I4')).toBe(2);
    expect(map.get('I5')).toBe(2);
    expect(map.get('I6')).toBe(2);
    expect(map.get('I7')).toBe(2);
  });

  it('uses the widest path and depends on startIndi', () => {
    const map = computeConfidenceMap(data, 'I7');
    expect(Object.fromEntries(map.entries())).toEqual({
      I1: 2,
      I2: 2,
      I3: 2,
      I4: 3,
      I5: 3,
      I6: 3,
      I7: 3,
    });
  });

  it('rates parent links by parentLinkConfidence while keeping parentLinkConfidence intact', () => {
    const linked: ModelData = {
      indis: [
        { id: 'A', famc: 'F', confidence: 3, parentLinkConfidence: 1 },
        { id: 'B', fams: ['F'], confidence: 3, parentLinkConfidence: 3 },
      ],
      fams: [{ id: 'F', husb: 'B', children: ['A'] }],
    };
    const result = propagateConfidence(linked, 'A').indis;
    expect(result[0]!.confidence).toBe(3);
    expect(result[1]!.confidence).toBe(1);
    expect(result[1]!.parentLinkConfidence).toBe(3);
  });

  it('reconciles one-sided family links and never mutates caller input', () => {
    const asymmetric: ModelData = {
      indis: [
        { id: 'C', confidence: 1 }, // famc omitted, only listed in F.children!
        { id: 'P', confidence: 3 }, // fams omitted, only listed in F.husb!
      ],
      fams: [{ id: 'F', husb: 'P', children: ['C'] }],
    };
    const map = computeConfidenceMap(asymmetric, 'C');
    expect(map.get('P')).toBe(1);
    expect(asymmetric.indis[1]!.confidence).toBe(3);
    expect(asymmetric.indis[0]!.famc).toBeUndefined();
  });

  it('takes confidences that are no whole number from 0 to 3', () => {
    const data: ModelData = {
      indis: [
        { id: 'A', famc: 'F', confidence: 2.5 },
        { id: 'B', famc: 'F', confidence: -1 },
        { id: 'C', famc: 'F', confidence: 7 },
        { id: 'D', famc: 'F', confidence: NaN },
        { id: 'P', fams: ['F'], confidence: 3 },
      ],
      fams: [{ id: 'F', husb: 'P', children: ['A', 'B', 'C', 'D'] }],
    };
    // From P every child is reached over its own parent link.
    expect([...computeConfidenceMap(data, 'P')].sort()).toEqual([
      ['A', 2],
      ['B', 0],
      ['P', 3],
    ]);
    // From B everything lies behind the link of B.
    expect([...computeConfidenceMap(data, 'B')].sort()).toEqual([
      ['A', 0],
      ['B', 0],
      ['C', 0],
      ['D', 0],
      ['P', 0],
    ]);
  });

  it('lists unrelated people for data, and only reachable people for a graph', () => {
    const data: ModelData = {
      indis: [
        { id: 'A', confidence: 2 },
        { id: 'Z', confidence: 1 },
      ],
      fams: [],
    };
    expect([...computeConfidenceMap(data, 'A')]).toEqual([
      ['A', 2],
      ['Z', 1],
    ]);
    expect([...computeConfidenceMap(createModelGraph(data), 'A')]).toEqual([
      ['A', 2],
    ]);
    // Unrelated people keep their confidence when it is propagated.
    expect(propagateConfidence(data, 'A').indis).toEqual(data.indis);
  });

  it('takes null, as data read from JSON has it, for no confidence', () => {
    const data = JSON.parse(
      JSON.stringify({
        indis: [
          { id: 'A', famc: 'F', confidence: null, parentLinkConfidence: null },
          { id: 'P', fams: ['F'] },
        ],
        fams: [{ id: 'F', husb: 'P', children: ['A'] }],
      }),
    ) as ModelData;
    expect([...computeConfidenceMap(data, 'P')]).toEqual([]);
    expect([...computeConfidenceMap(createModelGraph(data), 'P')]).toEqual([]);

    // Next to somebody who is rated, too.
    data.indis.push({ id: 'Q', famc: 'F', confidence: 1 });
    expect([...computeConfidenceMap(data, 'P')]).toEqual([['Q', 1]]);
    expect([...computeConfidenceMap(data, 'Q')].sort()).toEqual([
      ['A', 1],
      ['P', 1],
      ['Q', 1],
    ]);
  });

  it('answers at once for a start person whose relatives are known to have no confidence', () => {
    // Two trees that are not related: U1 to U3 without any confidence, R1
    // and R2 with one.
    const data: ModelData = {
      indis: [
        { id: 'U1', fams: ['FU'] },
        { id: 'U2', fams: ['FU'] },
        { id: 'U3', famc: 'FU' },
        { id: 'R1', fams: ['FR'] },
        { id: 'R2', famc: 'FR', confidence: 1 },
      ],
      fams: [
        { id: 'FU', husb: 'U1', wife: 'U2', children: ['U3'] },
        { id: 'FR', husb: 'R1', children: ['R2'] },
      ],
    };
    const graph = createModelGraph(data);
    let walked = 0;
    const counting: ModelGraph = {
      ...graph,
      getFamilyChildren(familyId) {
        walked++;
        return graph.getFamilyChildren(familyId);
      },
    };

    const unrated = new Set<string>();
    expect(computeConfidenceMap(counting, 'U3', unrated).size).toBe(0);
    expect(walked).toBeGreaterThan(0);
    expect([...unrated].sort()).toEqual(['U1', 'U2', 'U3']);

    // The relatives of U3 need no second walk over the tree.
    walked = 0;
    for (const start of ['U1', 'U2', 'U3']) {
      const map = computeConfidenceMap(counting, start, unrated);
      expect(map.size).toBe(0);
      // Every caller gets a map of its own.
      map.set('x', 1);
    }
    expect(walked).toBe(0);

    // A tree with a confidence is searched as ever, and not remembered.
    expect([...computeConfidenceMap(counting, 'R1', unrated)]).toEqual([
      ['R2', 1],
    ]);
    expect(walked).toBeGreaterThan(0);
    expect([...unrated].sort()).toEqual(['U1', 'U2', 'U3']);
    // Without the set every call walks.
    walked = 0;
    expect(computeConfidenceMap(counting, 'U1').size).toBe(0);
    expect(walked).toBeGreaterThan(0);

    // Data in which nobody is rated: everybody is remembered.
    const plain: ModelData = {
      indis: data.indis.map(({ confidence: _confidence, ...rest }) => rest),
      fams: data.fams,
    };
    const all = new Set<string>();
    expect(computeConfidenceMap(plain, 'U1', all).size).toBe(0);
    expect(all.size).toBe(5);

    // Sharing one unrated Set across ModelGraph and ModelData for the same
    // model still returns unrelated rated people when ModelData is passed.
    expect([...computeConfidenceMap(data, 'U1', unrated)]).toEqual([
      ['R2', 1],
    ]);
  });

  it('propagates confidence across multi-family (adopted) children and one-sided custom ModelGraph links', () => {
    const adopted: ModelData = {
      indis: [
        { id: 'GP', fams: ['F_GP'], confidence: 3 },
        { id: 'BIO_DAD', fams: ['F_BIO'], confidence: 3 },
        { id: 'ADOPT_DAD', famc: 'F_GP', fams: ['F_ADOPT'], confidence: 1 },
        // famc points to F_BIO, while F_ADOPT also lists CHILD in children
        { id: 'CHILD', famc: 'F_BIO', confidence: 3 },
      ],
      fams: [
        { id: 'F_GP', husb: 'GP', children: ['ADOPT_DAD'] },
        { id: 'F_BIO', husb: 'BIO_DAD', children: ['CHILD'] },
        { id: 'F_ADOPT', husb: 'ADOPT_DAD', children: ['CHILD'] },
      ],
    };
    expect(computeConfidenceMap(adopted, 'GP').get('CHILD')).toBe(1);
    expect(
      computeConfidenceMap(createModelGraph(adopted), 'GP').get('CHILD'),
    ).toBe(1);

    // Custom un-reconciled ModelGraph with one-sided family->child link
    const base = createModelGraph(adopted);
    const customGraph: ModelGraph = {
      ...base,
      getPersonParentFamily: (id) =>
        id === 'CHILD' ? null : base.getPersonParentFamily(id),
    };
    expect(computeConfidenceMap(customGraph, 'GP').get('CHILD')).toBe(1);
  });

  it('rejects null/non-model inputs with a clear TypeError and ignores empty-string id records cleanly', () => {
    for (const bad of [null, undefined, {}, 'I1']) {
      expect(() =>
        computeConfidenceMap(bad as unknown as ModelData, 'I1'),
      ).toThrow(TypeError);
      expect(() =>
        computeConfidenceMap(bad as unknown as ModelData, 'I1'),
      ).toThrow('computeConfidenceMap() expects');
      expect(() =>
        propagateConfidence(bad as unknown as ModelData, 'I1'),
      ).toThrow(TypeError);
    }

    const withAnon: ModelData = {
      indis: [
        { id: '', firstName: 'Anon', confidence: 2 },
        { id: 'I1', firstName: 'Real' },
      ],
      fams: [],
    };
    const unrated = new Set<string>();
    expect(computeConfidenceMap(withAnon, 'I1', unrated).size).toBe(0);
    expect([...unrated]).toEqual(['I1']);

    const propagated = propagateConfidence(withAnon, 'I1');
    expect(propagated.indis[0]).toEqual({
      id: '',
      firstName: 'Anon',
      confidence: 2,
    });
  });
});
