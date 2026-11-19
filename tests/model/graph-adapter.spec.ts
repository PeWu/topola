import { describe, expect, it } from 'vitest';
import { computeLayout, createFixedTextMeasurer } from '../../src/core/index.js';
import { createModelGraph, type ModelData } from '../../src/model/index.js';
import { isModelGraph, toModelGraph } from '../../src/model/graph-adapter.js';
import {
  createSimpleNodePlugin,
  sexScheme,
} from '../../src/presets/index.js';

const codes = (graph: { problems: readonly { code: string }[] }) =>
  graph.problems.map((p) => p.code);

/** Every spouse link of the graph is known to both of its ends. */
function expectSymmetricSpouseLinks(data: ModelData): void {
  const graph = createModelGraph(data);
  for (const { id } of data.indis) {
    for (const famId of graph.getPersonSpouseFamilies(id)) {
      if (graph.hasFamily(famId)) {
        expect(graph.getFamilyPartners(famId), `${id} in ${famId}`).toContain(
          id,
        );
      }
    }
  }
  for (const { id } of data.fams) {
    for (const partner of graph.getFamilyPartners(id)) {
      if (partner && graph.hasPerson(partner)) {
        expect(graph.getPersonSpouseFamilies(partner)).toContain(id);
      }
    }
  }
}

describe('createModelGraph (topola/model)', () => {
  it('answers for consistent data without problems, and tells graphs from data', () => {
    const data: ModelData = {
      indis: [
        { id: 'H', fams: ['F'] },
        { id: 'W', fams: ['F'] },
        { id: 'C', famc: 'F' },
      ],
      fams: [{ id: 'F', husb: 'H', wife: 'W', children: ['C'] }],
    };
    const graph = createModelGraph(data);
    expect(graph.problems).toEqual([]);
    expect(graph.hasPerson('H')).toBe(true);
    expect(graph.hasPerson('X')).toBe(false);
    expect(graph.hasFamily('F')).toBe(true);
    expect(graph.getPerson('C')).toBe(data.indis[2]);
    expect(graph.getFamily('F')).toBe(data.fams[0]);
    expect(graph.getPersonParentFamily('C')).toBe('F');
    expect(graph.getPersonParentFamily('H')).toBeNull();
    expect(graph.getPersonSpouseFamilies('H')).toEqual(['F']);
    expect(graph.getFamilyPartners('F')).toEqual(['H', 'W']);
    expect(graph.getFamilyChildren('F')).toEqual(['C']);
    expect(graph.getFamilyChildren('NOPE')).toEqual([]);

    expect(isModelGraph(graph)).toBe(true);
    expect(isModelGraph(data)).toBe(false);
    expect(toModelGraph(graph)).toBe(graph);
    expect(toModelGraph(data).getFamilyChildren('F')).toEqual(['C']);
  });

  it('completes one-sided links in both directions without changing the records', () => {
    const data: ModelData = {
      indis: [
        // Know their family; the family does not know them.
        { id: 'M', sex: 'M', fams: ['F1'] },
        { id: 'W', sex: 'F', fams: ['F1'] },
        { id: 'K', famc: 'F1' },
        // Known to their family only.
        { id: 'P' },
        { id: 'C' },
      ],
      fams: [{ id: 'F1' }, { id: 'F2', wife: 'P', children: ['C'] }],
    };
    const before = JSON.stringify(data);
    const graph = createModelGraph(data);

    // A woman takes the wife slot, others the first free one.
    expect(graph.getFamilyPartners('F1')).toEqual(['M', 'W']);
    expect(graph.getFamilyChildren('F1')).toEqual(['K']);
    expect(graph.getPersonSpouseFamilies('P')).toEqual(['F2']);
    expect(graph.getPersonParentFamily('C')).toBe('F2');
    expect(codes(graph).sort()).toEqual([
      'ASYMMETRIC_CHILD_LINK',
      'ASYMMETRIC_CHILD_LINK',
      'ASYMMETRIC_SPOUSE_LINK',
      'ASYMMETRIC_SPOUSE_LINK',
      'ASYMMETRIC_SPOUSE_LINK',
    ]);
    expect(JSON.stringify(data)).toBe(before);
    expectSymmetricSpouseLinks(data);

    // Two women: the second one takes the free husband slot.
    const twoWomen = createModelGraph({
      indis: [
        { id: 'A', sex: 'F', fams: ['F'] },
        { id: 'B', sex: 'F', fams: ['F'] },
      ],
      fams: [{ id: 'F' }],
    });
    expect(twoWomen.getFamilyPartners('F')).toEqual(['B', 'A']);
  });

  it('reports references to missing people and families', () => {
    const graph = createModelGraph({
      indis: [{ id: 'A', famc: 'GONE', fams: ['LOST'] }],
      fams: [{ id: 'F', husb: 'NOBODY', children: ['NOCHILD'] }],
    });
    expect(
      graph.problems.map((p) => `${p.code}:${p.entityId}`).sort(),
    ).toEqual([
      'MISSING_FAMILY:GONE',
      'MISSING_FAMILY:LOST',
      'MISSING_PERSON:NOBODY',
      'MISSING_PERSON:NOCHILD',
    ]);
  });

  it('counts a link that is listed twice once, and uses the last of two records with one id', () => {
    const data: ModelData = {
      indis: [
        { id: 'A', fams: ['F1', 'F1'] },
        { id: 'K', famc: 'F1' },
        { id: 'Z', firstName: 'first' },
        { id: 'Z', firstName: 'last', famc: 'F1' },
      ],
      fams: [{ id: 'F1', husb: 'A', children: ['K', 'K', 'Z'] }],
    };
    const graph = createModelGraph(data);
    expect(graph.getPersonSpouseFamilies('A')).toEqual(['F1']);
    expect(graph.getFamilyChildren('F1')).toEqual(['K', 'Z']);
    expect(graph.getPerson('Z')?.firstName).toBe('last');
    expect(codes(graph).sort()).toEqual([
      'DUPLICATE_ID',
      'DUPLICATE_LINK',
      'DUPLICATE_LINK',
    ]);

    // One couple with two children is three nodes, not six.
    const layout = computeLayout(
      { startIndi: 'A' },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      },
    );
    expect(layout.nodes.map((n) => n.id)).toEqual(['F1', 'K', 'Z']);
    expect(layout.problems).toEqual([]);

    // A person cannot be both partners of a family.
    const selfMarried = createModelGraph({
      indis: [{ id: 'A', fams: ['F'] }],
      fams: [{ id: 'F', husb: 'A', wife: 'A' }],
    });
    expect(selfMarried.getFamilyPartners('F')).toEqual(['A', null]);
    expect(codes(selfMarried)).toEqual(['DUPLICATE_LINK']);
  });

  it('does not make a person the spouse of a family that has two other partners', () => {
    const data: ModelData = {
      indis: [
        { id: 'A', fams: ['F'] },
        { id: 'B', fams: ['F'] },
        { id: 'C', fams: ['F'] },
        { id: 'K', famc: 'F' },
      ],
      fams: [{ id: 'F', husb: 'A', wife: 'B', children: ['K'] }],
    };
    const graph = createModelGraph(data);
    expect(graph.getPersonSpouseFamilies('C')).toEqual([]);
    expect(graph.getFamilyPartners('F')).toEqual(['A', 'B']);
    expect(codes(graph)).toEqual(['UNRESOLVED_SPOUSE_LINK']);
    expectSymmetricSpouseLinks(data);

    // C is drawn alone, not as the spouse of A.
    const layout = computeLayout(
      { startIndi: 'C' },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      },
    );
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]!.indiId).toBe('C');
    expect(layout.nodes[0]!.familyId).toBeUndefined();
  });

  it('takes the family that lists a child when the famc of the child does not exist', () => {
    const graph = createModelGraph({
      indis: [
        { id: 'P', fams: ['F'] },
        { id: 'K', famc: 'GONE' },
        { id: 'L', famc: 'GONE' },
      ],
      fams: [{ id: 'F', husb: 'P', children: ['K'] }],
    });
    expect(graph.getPersonParentFamily('K')).toBe('F');
    // Nobody lists L: the dangling id stays, for the layout to report.
    expect(graph.getPersonParentFamily('L')).toBe('GONE');
    expect(codes(graph).sort()).toEqual([
      'ASYMMETRIC_CHILD_LINK',
      'MISSING_FAMILY',
      'MISSING_FAMILY',
    ]);
  });

  it('reports a family with two records, and reads the links of the records that are used only', () => {
    const graph = createModelGraph({
      indis: [
        { id: 'A', fams: ['F1'] },
        // Not used: its links to F2 and F3 do not count.
        { id: 'Z', firstName: 'first', famc: 'F2', fams: ['F3'] },
        { id: 'Z', firstName: 'last' },
      ],
      fams: [
        // Not used: its child does not count, missing or not.
        { id: 'F1', husb: 'A', children: ['GONE', 'Z'] },
        { id: 'F1', husb: 'A' },
        { id: 'F2' },
        { id: 'F3' },
      ],
    });
    expect(graph.problems.map((p) => `${p.code}:${p.entityId}`).sort()).toEqual(
      ['DUPLICATE_ID:F1', 'DUPLICATE_ID:Z'],
    );
    expect(graph.getFamilyChildren('F1')).toEqual([]);
    expect(graph.getFamilyChildren('F2')).toEqual([]);
    expect(graph.getFamilyPartners('F3')).toEqual([null, null]);
    expect(graph.getPersonParentFamily('Z')).toBeNull();
    expect(graph.getPersonSpouseFamilies('Z')).toEqual([]);
  });

  it('lets a person take the partner slot of somebody who does not exist', () => {
    // The family names two partners that are not in the data; P names it.
    const data: ModelData = {
      indis: [
        { id: 'P', fams: ['F'] },
        { id: 'K', famc: 'F' },
      ],
      fams: [{ id: 'F', husb: 'X', wife: 'Y', children: ['K'] }],
    };
    const graph = createModelGraph(data);
    expect(graph.getPersonSpouseFamilies('P')).toEqual(['F']);
    expect(graph.getFamilyPartners('F')).toEqual(['P', 'Y']);
    expect(graph.problems.map((p) => `${p.code}:${p.entityId}`).sort()).toEqual(
      ['ASYMMETRIC_SPOUSE_LINK:P', 'MISSING_PERSON:X', 'MISSING_PERSON:Y'],
    );
    expectSymmetricSpouseLinks(data);

    // P is drawn with the family and the child.
    const layout = computeLayout(
      { startIndi: 'P' },
      {
        graph,
        chart: 'hourglass',
        nodePlugin: createSimpleNodePlugin({ model: graph }),
        textMeasurer: createFixedTextMeasurer(),
      },
    );
    expect(layout.nodes.map((n) => n.id)).toEqual(['F', 'K']);
    expect(layout.nodes[0]).toMatchObject({ indiId: 'P', familyId: 'F' });
    expect(layout.nodes[0]!.spouseId).toBeUndefined();

    // A woman takes the second slot, as with empty slots.
    const woman = createModelGraph({
      indis: [{ id: 'Q', sex: 'F', fams: ['F'] }],
      fams: [{ id: 'F', husb: 'X', wife: 'Y' }],
    });
    expect(woman.getFamilyPartners('F')).toEqual(['X', 'Q']);

    // An empty slot is taken before one that names a missing person.
    const empty = createModelGraph({
      indis: [{ id: 'P', fams: ['F'] }],
      fams: [{ id: 'F', husb: 'X' }],
    });
    expect(empty.getFamilyPartners('F')).toEqual(['X', 'P']);

    // Two people who do exist keep their slots; one missing partner goes.
    const full = createModelGraph({
      indis: [
        { id: 'A', fams: ['F'] },
        { id: 'P', fams: ['F'] },
        { id: 'C', fams: ['F'] },
      ],
      fams: [{ id: 'F', husb: 'A', wife: 'Y' }],
    });
    expect(full.getFamilyPartners('F')).toEqual(['A', 'P']);
    expect(full.getPersonSpouseFamilies('C')).toEqual([]);
    expect(codes(full)).toContain('UNRESOLVED_SPOUSE_LINK');
  });

  it('treats empty-string ids and pointers as absent and rejects null/undefined model inputs cleanly', () => {
    const data: ModelData = {
      indis: [
        { id: '', firstName: 'EmptyRecord' },
        { id: 'P1', firstName: 'John', famc: '', fams: ['F1', ''] },
        { id: 'P2', sex: 'F', fams: ['F1'] },
        { id: 'C1', famc: 'F1' },
      ],
      fams: [
        { id: '', husb: 'P1' },
        { id: 'F1', husb: '', wife: '', children: ['C1', ''] },
      ],
    };
    const graph = createModelGraph(data);
    expect(graph.hasPerson('')).toBe(false);
    expect(graph.hasFamily('')).toBe(false);
    expect(graph.getPersonParentFamily('P1')).toBeNull();
    expect(graph.getFamilyPartners('F1')).toEqual(['P1', 'P2']);
    expect(graph.getFamilyChildren('F1')).toEqual(['C1']);
    // Only the two genuine one-sided spouse links are reported; no DUPLICATE_LINK or MISSING_PERSON for ""
    expect(graph.problems.map((p) => `${p.code}:${p.entityId}`).sort()).toEqual([
      'ASYMMETRIC_SPOUSE_LINK:P1',
      'ASYMMETRIC_SPOUSE_LINK:P2',
    ]);

    // Single partner with husb: "", wife: "" draws no phantom empty spouse box
    const singlePartner = createModelGraph({
      indis: [
        { id: 'P1', firstName: 'John', fams: ['F1'] },
        { id: 'C1', famc: 'F1' },
      ],
      fams: [{ id: 'F1', husb: '', wife: '', children: ['C1'] }],
    });
    const layout = computeLayout(
      { startIndi: 'P1' },
      {
        graph: singlePartner,
        chart: 'hourglass',
        nodePlugin: createSimpleNodePlugin({ model: singlePartner }),
        textMeasurer: createFixedTextMeasurer(),
      },
    );
    expect(layout.problems).toEqual([]);
    expect(layout.nodes[0]!.indiId).toBe('P1');
    expect(layout.nodes[0]!.spouseId).toBeUndefined();

    // Null / undefined guards on untyped JS calls
    expect(isModelGraph(null as unknown as ModelData)).toBe(false);
    expect(isModelGraph(undefined as unknown as ModelData)).toBe(false);
    expect(() => createModelGraph(null as unknown as ModelData)).toThrow(
      TypeError,
    );
    expect(() => createModelGraph({} as unknown as ModelData)).toThrow(
      '{ indis, fams }',
    );
    expect(() => sexScheme(undefined as unknown as ModelData)).toThrow(
      TypeError,
    );
  });
});
