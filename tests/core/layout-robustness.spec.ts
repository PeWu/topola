import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  createFixedTextMeasurer,
  createLinkRouter,
  normalizeMargin,
  type CoreTheme,
  type Direction,
  type FamilyGraph,
  type Layer,
  type LayoutResult,
  type MeasuredNode,
  type NodePlugin,
  type Slot,
} from '../../src/core/index.js';
import { IdGenerator } from '../../src/core/id-generator.js';
import { resolveChartTheme, resolveCoreTheme } from '../../src/core/layout.js';
import { buildRelativesStage1 } from '../../src/core/relatives-layout.js';
import { ZERO_EXTENTS, layoutTidyTree } from '../../src/core/tidy-tree.js';
import { createModelGraph, type ModelData } from '../../src/model/index.js';
import {
  createDetailedNodePlugin,
  createSimpleNodePlugin,
} from '../../src/presets/index.js';
import { createFancyBranchLayer } from '../../src/presets/fancy.js';
import { gedcomToModel } from '../../src/gedcom/index.js';
import {
  generateFamily,
  type V3LayoutSnapshotsFile,
} from '../oracle/family-generator.js';

const CHARTS = ['hourglass', 'relatives'] as const;
type ChartKind = (typeof CHARTS)[number];

/** A plug-in that gives every node the same size and draws nothing. */
const stubPlugin: NodePlugin = {
  sizeNodes(nodes) {
    return new Map(
      nodes.map((n) => [
        n.nodeId,
        {
          extents: {
            alongBefore: 20,
            alongAfter: 0,
            acrossBefore: 30,
            acrossAfter: 30,
          },
          anchors: {
            indiParents: { along: -20, across: -15 },
            spouseParents: { along: -20, across: 15 },
            children: { along: 0, across: 0 },
          },
          regions: [],
        },
      ]),
    );
  },
  drawNode() {},
};

/** A graph as a host may supply it: nothing is reconciled or checked. */
function rawGraph(data: {
  indis: Record<string, { famc?: string; fams?: string[] }>;
  fams: Record<string, { husb?: string; wife?: string; children?: string[] }>;
}): FamilyGraph {
  return {
    hasPerson: (id) => Object.hasOwn(data.indis, id),
    hasFamily: (id) => Object.hasOwn(data.fams, id),
    getPersonParentFamily: (id) => data.indis[id]?.famc ?? null,
    getPersonSpouseFamilies: (id) => data.indis[id]?.fams ?? [],
    getFamilyPartners: (id) => [
      data.fams[id]?.husb ?? null,
      data.fams[id]?.wife ?? null,
    ],
    getFamilyChildren: (id) => data.fams[id]?.children ?? [],
  };
}

function layoutOf(
  graph: FamilyGraph,
  chart: ChartKind,
  startIndi: string,
  options: {
    collapsed?: Iterable<`${string}:${Slot}`>;
    maxAncestorGenerations?: number;
    maxDescendantGenerations?: number;
  } = {},
): LayoutResult {
  const { collapsed, ...limits } = options;
  return computeLayout(
    { startIndi, ...(collapsed ? { collapsed: new Set(collapsed) } : {}) },
    {
      graph,
      chart,
      nodePlugin: stubPlugin,
      textMeasurer: createFixedTextMeasurer(),
      ...limits,
    },
  );
}

function expectSoundLayout(layout: LayoutResult, label: string): void {
  const nodeIds = layout.nodes.map((n) => n.id);
  expect(new Set(nodeIds).size, `${label}: unique node ids`).toBe(
    nodeIds.length,
  );
  const linkIds = layout.links.map((l) => l.id);
  expect(new Set(linkIds).size, `${label}: unique link ids`).toBe(
    linkIds.length,
  );
  for (const link of layout.links) {
    expect(nodeIds, `${label}: link ${link.id} from`).toContain(
      link.fromNodeId,
    );
    expect(nodeIds, `${label}: link ${link.id} to`).toContain(link.toNodeId);
  }
}

/**
 * The same model with plain numbers as ids, as from a database: people
 * and families both count from 1, so their ids also coincide.
 */
function withNumericIds(data: ModelData): ModelData {
  const personIds = new Map(data.indis.map((p, i) => [p.id, String(i + 1)]));
  const familyIds = new Map(data.fams.map((f, i) => [f.id, String(i + 1)]));
  const person = (id: string) => personIds.get(id) ?? `missing-${id}`;
  const family = (id: string) => familyIds.get(id) ?? `missing-${id}`;
  return {
    indis: data.indis.map((p) => ({
      ...p,
      id: person(p.id),
      ...(p.famc !== undefined ? { famc: family(p.famc) } : {}),
      ...(p.fams ? { fams: p.fams.map(family) } : {}),
    })),
    fams: data.fams.map((f) => ({
      ...f,
      id: family(f.id),
      ...(f.husb !== undefined ? { husb: person(f.husb) } : {}),
      ...(f.wife !== undefined ? { wife: person(f.wife) } : {}),
      ...(f.children ? { children: f.children.map(person) } : {}),
    })),
  };
}

const PARENT_SLOTS = ['indiParents', 'spouseParents'] as const;

/**
 * Collapses every open parent expander of a layout, one at a time, as a host
 * does on a click, and expects the clicked expander to close.
 */
function expectParentExpandersToCollapse(
  graph: FamilyGraph,
  chart: ChartKind,
  startIndi: string,
  label: string,
): number {
  return expectExpandersToCollapse(
    graph,
    chart,
    startIndi,
    label,
    PARENT_SLOTS,
  );
}

/** The same for the expanders of the given slots. */
function expectExpandersToCollapse(
  graph: FamilyGraph,
  chart: ChartKind,
  startIndi: string,
  label: string,
  slots: readonly Slot[],
): number {
  const open = layoutOf(graph, chart, startIndi);
  let toggles = 0;
  for (const node of open.nodes) {
    for (const slot of slots) {
      if (node.expanders[slot] !== 'minus') continue;
      toggles++;
      const key = `${node.id}:${slot}` as const;
      const folded = layoutOf(graph, chart, startIndi, { collapsed: [key] });
      const same = folded.nodes.find((n) => n.id === node.id);
      expect(same?.expanders[slot], `${label}: ${chart} ${key}`).toBe('plus');
      expect(
        folded.nodes.length,
        `${label}: ${chart} ${key} nodes`,
      ).toBeLessThan(open.nodes.length);
    }
  }
  return toggles;
}

describe('Layout ids, expanders and bad data', () => {
  it('IdGenerator never issues an id twice', () => {
    const gen = new IdGenerator();
    expect(['K', 'K', 'K', 'F'].map((id) => gen.getId(id))).toEqual([
      'K',
      'K:1',
      'K:2',
      'F',
    ]);

    // An entity whose id looks like a generated one.
    const tricky = new IdGenerator();
    expect(['K', 'K:1', 'K'].map((id) => tricky.getId(id))).toEqual([
      'K',
      'K:1',
      'K:2',
    ]);

    const reserved = new IdGenerator(['C', 'C:2']);
    expect(['C', 'C', 'D'].map((id) => reserved.getId(id))).toEqual([
      'C:1',
      'C:3',
      'D',
    ]);
  });

  // Parents PF and PM are first cousins: the families FP, FA, FB and GG are
  // drawn more than once in `relatives`.
  const cousinParents: ModelData = {
    indis: [
      { id: 'S', famc: 'FP' },
      { id: 'PF', sex: 'M', famc: 'FA', fams: ['FP'] },
      { id: 'PM', sex: 'F', famc: 'FB', fams: ['FP'] },
      { id: 'A', sex: 'M', famc: 'GG', fams: ['FA'] },
      { id: 'AW', sex: 'F', fams: ['FA'] },
      { id: 'B', sex: 'M', famc: 'GG', fams: ['FB'] },
      { id: 'BW', sex: 'F', fams: ['FB'] },
      { id: 'G1', sex: 'M', fams: ['GG'] },
      { id: 'G2', sex: 'F', fams: ['GG'] },
    ],
    fams: [
      { id: 'FP', husb: 'PF', wife: 'PM', children: ['S'] },
      { id: 'FA', husb: 'A', wife: 'AW', children: ['PF'] },
      { id: 'FB', husb: 'B', wife: 'BW', children: ['PM'] },
      { id: 'GG', husb: 'G1', wife: 'G2', children: ['A', 'B'] },
    ],
  };

  it('collapses the clicked parent expander when a family is drawn more than once', () => {
    const graph = createModelGraph(cousinParents);
    for (const chart of CHARTS) {
      expectSoundLayout(layoutOf(graph, chart, 'S'), `cousins ${chart}`);
      const toggles = expectParentExpandersToCollapse(
        graph,
        chart,
        'S',
        'cousins',
      );
      expect(toggles).toBeGreaterThanOrEqual(5);
    }

    // The direct ancestors take their ids first: the parents of the start
    // person are the node "FP", not a later copy.
    const relatives = layoutOf(graph, 'relatives', 'S');
    const parents = relatives.links.find(
      (l) => l.toNodeId === 'S' && l.kind === 'parentChild',
    );
    expect(parents?.fromNodeId).toBe('FP');
  });

  it('collapses every parent expander of the oracle scenarios, in both charts', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const snapshots = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, 'tests/oracle/v3-layout-snapshots.json'),
        'utf8',
      ),
    ) as V3LayoutSnapshotsFile;

    let toggles = 0;
    let childToggles = 0;
    for (const scenario of snapshots.scenarios) {
      let data: ModelData;
      if (scenario.source.kind === 'dataset') {
        const raw = fs.readFileSync(
          path.join(repoRoot, 'demo/data', scenario.source.file),
          'utf8',
        );
        data = scenario.source.file.endsWith('.ged')
          ? gedcomToModel(raw)
          : (JSON.parse(raw) as ModelData);
      } else {
        data = generateFamily(scenario.source.seed, scenario.source.params)
          .data as ModelData;
      }
      const graph = createModelGraph(data);
      for (const chart of CHARTS) {
        const layout = layoutOf(graph, chart, scenario.startIndi);
        expectSoundLayout(layout, `${scenario.id} ${chart}`);
        // Large data sets have hundreds of expanders; the generated
        // scenarios cover the topologies.
        if (layout.nodes.length > 150) continue;
        toggles += expectParentExpandersToCollapse(
          graph,
          chart,
          scenario.startIndi,
          scenario.id,
        );
        childToggles += expectExpandersToCollapse(
          graph,
          chart,
          scenario.startIndi,
          scenario.id,
          ['children'],
        );
      }
    }
    expect(toggles).toBeGreaterThan(500);
    expect(childToggles).toBeGreaterThan(500);
  }, 60_000);

  it('keeps ids apart in the oracle scenarios when the ids are plain numbers', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const snapshots = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, 'tests/oracle/v3-layout-snapshots.json'),
        'utf8',
      ),
    ) as V3LayoutSnapshotsFile;

    let layouts = 0;
    for (const scenario of snapshots.scenarios) {
      // The generated scenarios cover the topologies; the data sets are
      // large, and their layouts are checked with their own ids above.
      if (scenario.source.kind === 'dataset') continue;
      const data = generateFamily(scenario.source.seed, scenario.source.params)
        .data as ModelData;
      const numeric = withNumericIds(data);
      const startIndi = numeric.indis[
        data.indis.findIndex((p) => p.id === scenario.startIndi)
      ]!.id;
      const graph = createModelGraph(numeric);
      expect(graph.problems, scenario.id).toEqual([]);
      for (const chart of CHARTS) {
        const layout = layoutOf(graph, chart, startIndi);
        expectSoundLayout(layout, `${scenario.id} ${chart} numeric`);
        expect(layout.nodes.length).toBe(
          layoutOf(createModelGraph(data), chart, scenario.startIndi).nodes
            .length,
        );
        layouts++;
      }
    }
    expect(layouts).toBeGreaterThanOrEqual(200);
  }, 60_000);

  it('gives every link an id of its own when ids are small numbers and a family is drawn three times', () => {
    // The parents 21 and 22 of the start person 20 are first cousins: their
    // fathers 23 and 25 are brothers (family 7). `relatives` draws family 4
    // with its children 20, 1 and 2 under both brothers and as the parents.
    const graph = createModelGraph({
      indis: [
        { id: '20', famc: '4' },
        { id: '1', famc: '4' },
        { id: '2', famc: '4' },
        { id: '21', sex: 'M', famc: '5', fams: ['4'] },
        { id: '22', sex: 'F', famc: '6', fams: ['4'] },
        { id: '23', sex: 'M', famc: '7', fams: ['5'] },
        { id: '24', sex: 'F', fams: ['5'] },
        { id: '25', sex: 'M', famc: '7', fams: ['6'] },
        { id: '26', sex: 'F', fams: ['6'] },
        { id: '27', sex: 'M', fams: ['7'] },
        { id: '28', sex: 'F', fams: ['7'] },
      ],
      fams: [
        { id: '4', husb: '21', wife: '22', children: ['20', '1', '2'] },
        { id: '5', husb: '23', wife: '24', children: ['21'] },
        { id: '6', husb: '25', wife: '26', children: ['22'] },
        { id: '7', husb: '27', wife: '28', children: ['23', '25'] },
      ],
    });
    expect(graph.problems).toEqual([]);
    for (const chart of CHARTS) {
      expectSoundLayout(layoutOf(graph, chart, '20'), `numeric ${chart}`);
    }
    // This is the case in which the two node ids of a link, put together
    // with a colon, give the same text for two links ("4:1" + "2" and
    // "4" + "1:2").
    const relatives = layoutOf(graph, 'relatives', '20');
    const joined = relatives.links.map((l) => `${l.fromNodeId}:${l.toNodeId}`);
    expect(new Set(joined).size).toBeLessThan(joined.length);

    // Ids that contain the signs of link ids themselves.
    const odd = rawGraph({
      indis: {
        'a>b': { fams: ['1:x'] },
        b: { famc: '1:x', fams: ['1', '1:x='] },
        'x>b': { famc: '1' },
        '=': { famc: '1:x=' },
      },
      fams: {
        '1:x': { husb: 'a>b', children: ['b'] },
        '1': { husb: 'b', children: ['x>b'] },
        '1:x=': { husb: 'b', children: ['='] },
      },
    });
    for (const chart of CHARTS) {
      for (const startIndi of ['a>b', 'b', '=']) {
        expectSoundLayout(
          layoutOf(odd, chart, startIndi),
          `odd ids ${chart} ${startIndi}`,
        );
      }
    }
  });

  it('gives the two marriage links of a remarried ancestor couple different ids', () => {
    // Issue #30: both parents of the start person have another marriage.
    const graph = createModelGraph({
      indis: [
        { id: 'I1', famc: 'F_MAIN' },
        { id: 'I2', sex: 'M', fams: ['F_EXTRA_H', 'F_MAIN'] },
        { id: 'I3', sex: 'F', fams: ['F_MAIN', 'F_EXTRA_W'] },
        { id: 'I4', sex: 'F', fams: ['F_EXTRA_H'] },
        { id: 'I5', sex: 'M', fams: ['F_EXTRA_W'] },
        { id: 'I6', famc: 'F_EXTRA_H' },
        { id: 'I7', famc: 'F_EXTRA_W' },
      ],
      fams: [
        { id: 'F_MAIN', husb: 'I2', wife: 'I3', children: ['I1'] },
        { id: 'F_EXTRA_H', husb: 'I2', wife: 'I4', children: ['I6'] },
        { id: 'F_EXTRA_W', husb: 'I5', wife: 'I3', children: ['I7'] },
      ],
    });
    const layout = layoutOf(graph, 'relatives', 'I1');
    const marriageLinks = layout.links.filter(
      (l) => l.kind === 'additionalMarriage',
    );
    expect(marriageLinks).toHaveLength(2);
    expect(marriageLinks[0]!.id).not.toBe(marriageLinks[1]!.id);
    expectSoundLayout(layout, 'issue 30');
  });

  it('keeps marriage links and parent-child links apart for an entity with the id "A"', () => {
    // The second marriage X of P has a child whose id is "A".
    const graph = createModelGraph({
      indis: [
        { id: 'R', fams: ['R0'] },
        { id: 'P', famc: 'R0', fams: ['W', 'X'] },
        { id: 'A', famc: 'X' },
      ],
      fams: [
        { id: 'R0', husb: 'R', children: ['P'] },
        { id: 'W', husb: 'P' },
        { id: 'X', husb: 'P', children: ['A'] },
      ],
    });
    for (const chart of CHARTS) {
      expectSoundLayout(layoutOf(graph, chart, 'R'), `id A ${chart}`);
    }
  });

  it('draws a child whose marriage closes a cycle without links to missing or ancestor nodes', () => {
    // B is a child of Y and a partner of X, the family of Y's grandparents.
    const graph = createModelGraph({
      indis: [
        { id: 'R', fams: ['R0'] },
        { id: 'A', famc: 'R0', fams: ['X'] },
        { id: 'B', famc: 'Y', fams: ['X'] },
        { id: 'C', famc: 'X', fams: ['Y'] },
        { id: 'D', fams: ['Y'] },
        { id: 'E', famc: 'Y' },
      ],
      fams: [
        { id: 'R0', husb: 'R', children: ['A'] },
        { id: 'X', husb: 'A', wife: 'B', children: ['C'] },
        { id: 'Y', husb: 'C', wife: 'D', children: ['B', 'E'] },
      ],
    });
    for (const chart of CHARTS) {
      const layout = layoutOf(graph, chart, 'R', {
        maxAncestorGenerations: 0,
      });
      expectSoundLayout(layout, `cycle ${chart}`);
      expect(layout.problems.map((p) => p.code)).toContain('CYCLE_DETECTED');

      const generationOf = new Map(layout.nodes.map((n) => [n.id, n]));
      for (const link of layout.links.filter((l) => l.kind === 'parentChild')) {
        expect(
          generationOf.get(link.toNodeId)!.generation,
          `${chart}: ${link.id} goes down one generation`,
        ).toBe(generationOf.get(link.fromNodeId)!.generation + 1);
      }
      // B is drawn under Y, alone.
      const yNode = layout.nodes.find((n) => n.familyId === 'Y')!;
      const bLink = layout.links.find(
        (l) => l.fromNodeId === yNode.id && l.childIndiId === 'B',
      );
      const bNode = layout.nodes.find((n) => n.id === bLink?.toNodeId);
      expect(bNode?.indiId).toBe('B');
      expect(bNode?.familyId).toBeUndefined();
      expect(yNode.expanders.children).toBe('minus');
    }

    // A family whose only child closes a cycle has no expander.
    const onlyCycle = createModelGraph({
      indis: [
        { id: 'R', fams: ['R0'] },
        { id: 'A', famc: 'R0', fams: ['X'] },
        { id: 'C', famc: 'X', fams: ['Y'] },
      ],
      fams: [
        { id: 'R0', husb: 'R', children: ['A'] },
        { id: 'X', husb: 'A', children: ['C'] },
        { id: 'Y', husb: 'C', children: ['A'] },
      ],
    });
    for (const chart of CHARTS) {
      const layout = layoutOf(onlyCycle, chart, 'R', {
        maxAncestorGenerations: 0,
      });
      expectSoundLayout(layout, `only cycle ${chart}`);
      const yNode = layout.nodes.find((n) => n.familyId === 'Y')!;
      expect(yNode.expanders.children).toBeUndefined();
      expect(layout.problems.map((p) => p.code)).toContain('CYCLE_DETECTED');

      // Even if ViewState.collapsed has Y:children, a purely cyclic family
      // must still report CYCLE_DETECTED and never show a broken [+] expander.
      const collapsedCycle = layoutOf(onlyCycle, chart, 'R', {
        maxAncestorGenerations: 0,
        collapsed: [`${yNode.id}:children`],
      });
      expectSoundLayout(collapsedCycle, `collapsed only cycle ${chart}`);
      const yCollapsed = collapsedCycle.nodes.find((n) => n.familyId === 'Y')!;
      expect(yCollapsed.expanders.children).toBeUndefined();
      expect(collapsedCycle.problems.map((p) => p.code)).toContain(
        'CYCLE_DETECTED',
      );
    }
  });

  it('collapses an hourglass ancestor whose id is also the id of a descendant node', () => {
    // Person and family ids share a namespace: the unmarried child "C" and
    // the parent family "C" of the start person.
    const graph = rawGraph({
      indis: {
        S: { famc: 'C', fams: ['F0'] },
        W: { fams: ['F0'] },
        C: { famc: 'F0' },
        P1: { famc: 'G', fams: ['C'] },
        P2: { fams: ['C'] },
        G1: { fams: ['G'] },
      },
      fams: {
        F0: { husb: 'S', wife: 'W', children: ['C'] },
        C: { husb: 'P1', wife: 'P2', children: ['S'] },
        G: { husb: 'G1', children: ['P1'] },
      },
    });
    const open = layoutOf(graph, 'hourglass', 'S');
    expectSoundLayout(open, 'collision');
    const parents = open.nodes.find((n) => n.familyId === 'C')!;
    expect(parents.id).toBe('C:1');
    expect(parents.expanders.indiParents).toBe('minus');

    const folded = layoutOf(graph, 'hourglass', 'S', {
      collapsed: ['C:1:indiParents'],
    });
    expect(
      folded.nodes.find((n) => n.id === 'C:1')?.expanders.indiParents,
    ).toBe('plus');
    expect(folded.nodes.some((n) => n.familyId === 'G')).toBe(false);
    expect(
      expectParentExpandersToCollapse(graph, 'hourglass', 'S', 'collision'),
    ).toBe(2);
  });

  it('reports every problem once and names the person of a missing parent family', () => {
    const graph = rawGraph({
      indis: {
        S: { famc: 'FP' },
        M: { fams: ['FP'], famc: 'NOWHERE' },
      },
      fams: { FP: { husb: 'GHOST', wife: 'M', children: ['S'] } },
    });
    for (const chart of CHARTS) {
      const { problems } = layoutOf(graph, chart, 'S');
      const keys = problems.map((p) => `${p.code}|${p.entityId}|${p.message}`);
      expect(new Set(keys).size, chart).toBe(keys.length);
      expect(problems.filter((p) => p.entityId === 'GHOST')).toHaveLength(1);
      const missingFamily = problems.find((p) => p.code === 'MISSING_FAMILY');
      expect(missingFamily?.message).toContain('"M"');
      expect(missingFamily?.message).toContain('"NOWHERE"');
    }
  });

  it('ignores a spouse family that does not have the person as a partner, and repeated ones', () => {
    // S lists F1, but F1 is the family of X alone. S has parents FP.
    const oneSided = rawGraph({
      indis: {
        S: { famc: 'FP', fams: ['F1'] },
        X: { famc: 'FX', fams: ['F1'] },
        P: { fams: ['FP'] },
        Q: { fams: ['FX'] },
      },
      fams: {
        F1: { husb: 'X' },
        FP: { husb: 'P', children: ['S'] },
        FX: { husb: 'Q', children: ['X'] },
      },
    });
    for (const chart of CHARTS) {
      const layout = layoutOf(oneSided, chart, 'S');
      expectSoundLayout(layout, `one-sided ${chart}`);
      expect(layout.nodes.map((n) => n.familyId ?? n.indiId).sort()).toEqual([
        'FP',
        'S',
      ]);
      expect(layout.problems.map((p) => p.code)).toEqual([
        'ASYMMETRIC_SPOUSE_LINK',
      ]);
    }

    // A family listed twice is one marriage.
    const repeated = rawGraph({
      indis: { S: { fams: ['F0', 'F0'] }, K: { famc: 'F0' } },
      fams: { F0: { husb: 'S', children: ['K'] } },
    });
    for (const chart of CHARTS) {
      const layout = layoutOf(repeated, chart, 'S');
      expect(layout.nodes.map((n) => n.id)).toEqual(['F0', 'K']);
    }
  });

  it('ignores a spouse family without the person also for ancestors and for children', () => {
    // H, a parent of S, lists FX and GONE; C, a sibling of S, lists FX. FX
    // is the family of Z alone, and GONE does not exist.
    const graph = rawGraph({
      indis: {
        S: { famc: 'FP' },
        C: { famc: 'FP', fams: ['FX'] },
        H: { fams: ['FP', 'FX', 'GONE'] },
        W: { fams: ['FP'] },
        Z: { fams: ['FX'] },
      },
      fams: {
        FP: { husb: 'H', wife: 'W', children: ['S', 'C'] },
        FX: { husb: 'Z' },
      },
    });
    const drawn = (layout: LayoutResult) =>
      layout.nodes.map((n) => n.familyId ?? n.indiId).sort();
    const problemsOf = (layout: LayoutResult) =>
      layout.problems.map((p) => `${p.code}:${p.entityId}`).sort();

    // In `relatives` H is the ancestor of a block: no node for FX next to
    // the couple, and C, in the block, is drawn alone.
    const relatives = layoutOf(graph, 'relatives', 'S');
    expectSoundLayout(relatives, 'relatives');
    expect(drawn(relatives)).toEqual(['C', 'FP', 'S']);
    expect(relatives.links.every((l) => l.kind === 'parentChild')).toBe(true);
    expect(problemsOf(relatives)).toEqual([
      'ASYMMETRIC_SPOUSE_LINK:FX',
      'ASYMMETRIC_SPOUSE_LINK:FX',
      'MISSING_FAMILY:GONE',
    ]);
    expect(
      relatives.problems
        .filter((p) => p.code === 'ASYMMETRIC_SPOUSE_LINK')
        .map((p) => /^Person "(\w+)"/.exec(p.message)?.[1])
        .sort(),
    ).toEqual(['C', 'H']);

    // In an hourglass from H, C is a child among the descendants.
    const hourglass = layoutOf(graph, 'hourglass', 'H');
    expectSoundLayout(hourglass, 'hourglass');
    expect(drawn(hourglass)).toEqual(['C', 'FP', 'S']);
    expect(hourglass.nodes.find((n) => n.indiId === 'C')?.familyId).toBe(
      undefined,
    );
    expect(problemsOf(hourglass)).toEqual(problemsOf(relatives));
  });

  it('lays out a line of ancestors that is thousands of generations long', () => {
    // Person n is the child of family n, whose partners are person n + 1
    // and a spouse. `relatives` from the youngest has one block per couple.
    const generations = 4000;
    const graph: FamilyGraph = {
      hasPerson: (id) => /^[PS]\d+$/.test(id) && Number(id.slice(1)) <= generations,
      hasFamily: (id) => /^F\d+$/.test(id) && Number(id.slice(1)) < generations,
      getPersonParentFamily: (id) =>
        id.startsWith('P') && Number(id.slice(1)) < generations
          ? `F${id.slice(1)}`
          : null,
      getPersonSpouseFamilies: (id) => {
        const n = Number(id.slice(1));
        return n > 0 ? [`F${n - 1}`] : [];
      },
      getFamilyPartners: (id) => {
        const n = Number(id.slice(1));
        return [`P${n + 1}`, `S${n + 1}`];
      },
      getFamilyChildren: (id) => [`P${id.slice(1)}`],
    };
    const layout = layoutOf(graph, 'relatives', 'P0');
    expect(layout.problems).toEqual([]);
    expect(layout.nodes).toHaveLength(generations + 1);
    expect(layout.links).toHaveLength(generations);
    expect(Math.min(...layout.nodes.map((n) => n.generation))).toBe(
      -generations,
    );
  });

  it('places a tree of one node like the root of any tree', () => {
    const extents = {
      alongBefore: 30,
      alongAfter: 10,
      acrossBefore: 50,
      acrossAfter: 20,
    };
    const spacing = { siblingSpacing: 15, generationSpacing: 34 };
    const single = { id: 'a', extents, children: [] };
    // Alone, the middle of its box is at (0, 0)...
    expect(layoutTidyTree(single, spacing).get('a')).toEqual({
      along: 10,
      across: 15,
    });
    // ...and as the anchor the node itself is.
    for (const flipAlong of [false, true]) {
      expect(
        layoutTidyTree(single, { ...spacing, flipAlong, anchorNodeId: 'a' }),
      ).toEqual(new Map([['a', { along: 0, across: 0 }]]));
    }
    // The root of a larger tree, which takes the general way, is placed the
    // same.
    const withChild = {
      id: 'a',
      extents,
      children: [{ id: 'b', extents, children: [] }],
    };
    expect(layoutTidyTree(withChild, spacing).get('a')).toEqual({
      along: 10,
      across: 15,
    });
    expect(
      layoutTidyTree(withChild, { ...spacing, anchorNodeId: 'a' }).get('a'),
    ).toEqual({ along: 0, across: 0 });
  });

  it('shows no parent expander at the ancestor generation limit', () => {
    const graph = createModelGraph(cousinParents);
    for (const chart of CHARTS) {
      const layout = layoutOf(graph, chart, 'S', {
        maxAncestorGenerations: 1,
      });
      const start = layout.nodes.find((n) => n.indiId === 'S')!;
      expect(start.expanders.indiParents).toBe('minus');
      const parents = layout.nodes.find(
        (n) => n.familyId === 'FP' && n.generation === -1,
      )!;
      expect(parents.expanders.indiParents).toBeUndefined();
      expect(parents.expanders.spouseParents).toBeUndefined();
      expect(layout.nodes.some((n) => n.generation < -1)).toBe(false);
    }
  });

  it('builds a block with more nodes than fit into the arguments of one call', () => {
    // The parents of S have 140,000 other children.
    const siblingCount = 140_000;
    const siblings = Array.from({ length: siblingCount }, (_, i) => `K${i}`);
    const siblingSet = new Set(siblings);
    const children = ['S', ...siblings];
    const graph: FamilyGraph = {
      hasPerson: (id) => id === 'S' || id === 'P' || siblingSet.has(id),
      hasFamily: (id) => id === 'FP',
      getPersonParentFamily: (id) => (id === 'P' ? null : 'FP'),
      getPersonSpouseFamilies: (id) => (id === 'P' ? ['FP'] : []),
      getFamilyPartners: () => ['P', null],
      getFamilyChildren: () => children,
    };
    const stage1 = buildRelativesStage1(
      { startIndi: 'S' },
      { graph, problems: [] },
    );
    expect(stage1.orderedNodes).toHaveLength(siblingCount + 2);
    expect(stage1.links).toHaveLength(siblingCount + 1);
  });

  it('handles NaN, undefined, and negative spacing, margins, and extents without hanging or crashing', () => {
    const family = createModelGraph({
      indis: [
        { id: 'P', fams: ['F'] },
        { id: 'W', fams: ['F'] },
        { id: 'C1', famc: 'F', fams: ['FC1'] },
        { id: 'C2', famc: 'F' },
        { id: 'GC1', famc: 'FC1' },
      ],
      fams: [
        { id: 'F', husb: 'P', wife: 'W', children: ['C1', 'C2'] },
        { id: 'FC1', husb: 'C1', children: ['GC1'] },
      ],
    });
    const plugin = createSimpleNodePlugin({ model: family });
    const measurer = createFixedTextMeasurer();

    for (const chart of CHARTS) {
      for (const theme of [
        { generationSpacing: NaN, siblingSpacing: NaN, margin: NaN },
        { generationSpacing: -50, siblingSpacing: -10, margin: -500 },
        {
          generationSpacing: undefined,
          siblingSpacing: undefined,
          margin: undefined,
        },
        {
          margin: {
            top: undefined as unknown as number,
            right: NaN,
            bottom: 5,
            left: 5,
          },
        },
      ]) {
        const res = computeLayout(
          { startIndi: 'C1' },
          {
            graph: family,
            chart,
            nodePlugin: plugin,
            textMeasurer: measurer,
            theme: theme as Record<string, unknown>,
          },
        );
        expect(Number.isFinite(res.size[0])).toBe(true);
        expect(Number.isFinite(res.size[1])).toBe(true);
        expect(res.size[0]).toBeGreaterThanOrEqual(0);
        expect(res.size[1]).toBeGreaterThanOrEqual(0);
        for (const node of res.nodes) {
          expect(Number.isFinite(node.x)).toBe(true);
          expect(Number.isFinite(node.y)).toBe(true);
        }
      }
    }

    // Direct layoutTidyTree with NaN extents / spacing terminates with finite coords
    const nanTree = {
      id: 'root',
      extents: {
        alongBefore: NaN,
        alongAfter: NaN,
        acrossBefore: NaN,
        acrossAfter: NaN,
      },
      children: [
        { id: 'k1', extents: ZERO_EXTENTS, children: [] },
        { id: 'k2', extents: ZERO_EXTENTS, children: [] },
      ],
    };
    const tidyPos = layoutTidyTree(nanTree, {
      siblingSpacing: NaN,
      generationSpacing: NaN,
    });
    for (const pt of tidyPos.values()) {
      expect(Number.isFinite(pt.along)).toBe(true);
      expect(Number.isFinite(pt.across)).toBe(true);
    }

    // Theme helpers ignore explicit undefined overrides and preserve layer defaults
    expect(
      resolveCoreTheme({
        fontFamily: undefined,
        generationSpacing: undefined,
        margin: undefined,
      } as unknown as Record<string, unknown>).generationSpacing,
    ).toBe(34);
    expect(
      resolveChartTheme({
        nodePlugin: plugin,
        layers: [createFancyBranchLayer<CoreTheme>()],
        theme: { generationSpacing: undefined } as unknown as Record<
          string,
          unknown
        >,
      }).generationSpacing,
    ).toBe(100);
    expect(normalizeMargin(undefined as unknown as number)).toEqual({
      top: 15,
      right: 15,
      bottom: 15,
      left: 15,
    });
  });

  it('includes stepped additionalMarriage hopOffset routes inside layout bounds across all four directions', () => {
    // Father H has 4 extra marriages and Mother W has 1 extra marriage so hopOffset reaches 24 (> default margin 15)
    const manyMarriages = createModelGraph({
      indis: [
        { id: 'S', famc: 'FM' },
        { id: 'H', sex: 'M', fams: ['FH1', 'FH2', 'FH3', 'FH4', 'FM'] },
        { id: 'W', sex: 'F', fams: ['FM', 'FW1'] },
        { id: 'S1', sex: 'F', fams: ['FH1'] },
        { id: 'S2', sex: 'F', fams: ['FH2'] },
        { id: 'S3', sex: 'F', fams: ['FH3'] },
        { id: 'S4', sex: 'F', fams: ['FH4'] },
        { id: 'S5', sex: 'M', fams: ['FW1'] },
      ],
      fams: [
        { id: 'FM', husb: 'H', wife: 'W', children: ['S'] },
        { id: 'FH1', husb: 'H', wife: 'S1' },
        { id: 'FH2', husb: 'H', wife: 'S2' },
        { id: 'FH3', husb: 'H', wife: 'S3' },
        { id: 'FH4', husb: 'H', wife: 'S4' },
        { id: 'FW1', husb: 'S5', wife: 'W' },
      ],
    });
    const measurer = createFixedTextMeasurer();
    const directions: Direction[] = ['down', 'up', 'right', 'left'];

    for (const direction of directions) {
      for (const margin of [15, 0]) {
        for (const linkStrokeWidth of [1, 6]) {
          const halfStroke = linkStrokeWidth / 2;
          const config = {
            graph: manyMarriages,
            chart: 'relatives' as const,
            direction,
            nodePlugin: createDetailedNodePlugin({ model: manyMarriages }),
            textMeasurer: measurer,
            theme: { margin, linkStrokeWidth },
          };
          const layout = computeLayout({ startIndi: 'S' }, config);
          const route = createLinkRouter(layout, resolveChartTheme(config));
          for (const link of layout.links) {
            const pts = route(link);
            for (const pt of pts) {
              const sx = pt.x + layout.origin[0];
              const sy = pt.y + layout.origin[1];
              expect(sx).toBeGreaterThanOrEqual(margin - 1e-6);
              expect(sx).toBeLessThanOrEqual(layout.size[0] - margin + 1e-6);
              expect(sy).toBeGreaterThanOrEqual(margin - 1e-6);
              expect(sy).toBeLessThanOrEqual(layout.size[1] - margin + 1e-6);
            }
            if (link.kind === 'additionalMarriage' && link.hopOffset) {
              // Outer half of the stepped stroke must also fit inside the margin box
              const hopPt = pts[1]!;
              if (direction === 'right' || direction === 'left') {
                const hx = hopPt.x + layout.origin[0];
                expect(hx - halfStroke).toBeGreaterThanOrEqual(margin - 1e-6);
                expect(hx + halfStroke).toBeLessThanOrEqual(
                  layout.size[0] - margin + 1e-6,
                );
              } else {
                const hy = hopPt.y + layout.origin[1];
                expect(hy - halfStroke).toBeGreaterThanOrEqual(margin - 1e-6);
                expect(hy + halfStroke).toBeLessThanOrEqual(
                  layout.size[1] - margin + 1e-6,
                );
              }
            }
          }
        }
      }
    }

    // Also verify demo/data/tudor.json from I230 in relatives mode
    const tudorRaw = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../demo/data/tudor.json'),
        'utf8',
      ),
    ) as ModelData;
    const tudorGraph = createModelGraph(tudorRaw);
    const tudorConfig = {
      graph: tudorGraph,
      chart: 'relatives' as const,
      nodePlugin: createDetailedNodePlugin({ model: tudorGraph }),
      textMeasurer: measurer,
    };
    const tudorLayout = computeLayout({ startIndi: 'I230' }, tudorConfig);
    const tudorRoute = createLinkRouter(
      tudorLayout,
      resolveChartTheme(tudorConfig),
    );
    for (const link of tudorLayout.links) {
      for (const pt of tudorRoute(link)) {
        expect(pt.x + tudorLayout.origin[0]).toBeGreaterThanOrEqual(0);
        expect(pt.x + tudorLayout.origin[0]).toBeLessThanOrEqual(
          tudorLayout.size[0],
        );
        expect(pt.y + tudorLayout.origin[1]).toBeGreaterThanOrEqual(0);
        expect(pt.y + tudorLayout.origin[1]).toBeLessThanOrEqual(
          tudorLayout.size[1],
        );
      }
    }
  });

  it('reports MISSING_PERSON for missing partners on extra marriages of ancestors in relatives', () => {
    const graph = rawGraph({
      indis: {
        S: { famc: 'FP' },
        H: { fams: ['FP', 'F_EXTRA'] },
        W: { fams: ['FP'] },
      },
      fams: {
        FP: { husb: 'H', wife: 'W', children: ['S'] },
        F_EXTRA: { husb: 'H', wife: 'GHOST' },
      },
    });
    const rel = layoutOf(graph, 'relatives', 'S');
    expectSoundLayout(rel, 'relatives missing extra partner');
    expect(rel.problems).toContainEqual(
      expect.objectContaining({ code: 'MISSING_PERSON', entityId: 'GHOST' }),
    );
  });

  it('normalizes negative and NaN generation limits and deduplicates repeated children in custom graphs', () => {
    const married = createModelGraph({
      indis: [
        { id: 'S', famc: 'FP', fams: ['F0'] },
        { id: 'W', famc: 'FWP', fams: ['F0'] },
        { id: 'C', famc: 'F0' },
        { id: 'P', fams: ['FP'] },
        { id: 'WP', fams: ['FWP'] },
      ],
      fams: [
        { id: 'F0', husb: 'S', wife: 'W', children: ['C'] },
        { id: 'FP', husb: 'P', children: ['S'] },
        { id: 'FWP', husb: 'WP', children: ['W'] },
      ],
    });
    expect(
      layoutOf(married, 'hourglass', 'S', {
        maxDescendantGenerations: -1,
      }).nodes.map((n) => n.id),
    ).toEqual(
      layoutOf(married, 'hourglass', 'S', {
        maxDescendantGenerations: 0,
      }).nodes.map((n) => n.id),
    );
    expect(
      layoutOf(married, 'hourglass', 'S', {
        maxAncestorGenerations: -2,
      }).nodes.map((n) => n.id),
    ).toEqual(
      layoutOf(married, 'hourglass', 'S', {
        maxAncestorGenerations: 0,
      }).nodes.map((n) => n.id),
    );
    expect(
      layoutOf(married, 'relatives', 'S', {
        maxAncestorGenerations: -1,
      }).nodes.map((n) => n.id),
    ).toEqual(['F0', 'C']);
    expect(
      layoutOf(married, 'hourglass', 'S', {
        maxAncestorGenerations: NaN,
        maxDescendantGenerations: NaN,
      }).nodes.map((n) => n.id),
    ).toEqual(layoutOf(married, 'hourglass', 'S').nodes.map((n) => n.id));

    // Duplicate child IDs from custom FamilyGraph
    const dupParentless = rawGraph({
      indis: { I1: { famc: 'F0' } },
      fams: { F0: { children: ['I1', 'I1'] } },
    });
    const relDup = layoutOf(dupParentless, 'relatives', 'I1');
    expect(relDup.nodes.map((n) => n.id)).toEqual(['I1']);
    expect(relDup.nodes[0]!.expanders.indiParents).toBeUndefined();

    const dupDesc = rawGraph({
      indis: { P: { fams: ['F'] }, C: { famc: 'F' } },
      fams: { F: { husb: 'P', children: ['C', 'C'] } },
    });
    expect(layoutOf(dupDesc, 'hourglass', 'P').nodes.map((n) => n.id)).toEqual([
      'F',
      'C',
    ]);
  });

  it('validates viewState and isolates fallback extents from caller mutation', () => {
    const graph = createModelGraph({ indis: [{ id: 'I1' }], fams: [] });
    expect(() =>
      computeLayout(undefined as unknown as { startIndi: string }, {
        graph,
        chart: 'hourglass',
        nodePlugin: stubPlugin,
      }),
    ).toThrow('{ startIndi }');
    expect(() =>
      computeLayout('I1' as unknown as { startIndi: string }, {
        graph,
        chart: 'hourglass',
        nodePlugin: stubPlugin,
      }),
    ).toThrow('{ startIndi }');

    expect(Object.isFrozen(ZERO_EXTENTS)).toBe(true);
    const emptyPlugin: NodePlugin = {
      sizeNodes: () => new Map(),
      drawNode() {},
    };
    const res1 = computeLayout(
      { startIndi: 'I1' },
      { graph, chart: 'hourglass', nodePlugin: emptyPlugin },
    );
    res1.nodes[0]!.extents.alongBefore = 999;
    const res2 = computeLayout(
      { startIndi: 'I1' },
      { graph, chart: 'hourglass', nodePlugin: emptyPlugin },
    );
    expect(res2.nodes[0]!.extents.alongBefore).toBe(0);
    expect(res2.nodes[0]!.bounds.height).toBe(0);
  });

  it('sanitizes non-finite MeasuredNode/Layer.getBounds/margin values, floors fractional maxGenerations, and guards self-partnered graphs and ViewState fields', () => {
    const family = createModelGraph({
      indis: [
        { id: 'S', famc: 'FP', fams: ['F0'] },
        { id: 'W', famc: 'FWP', fams: ['F0'] },
        { id: 'C', famc: 'F0' },
        { id: 'P', fams: ['FP'] },
        { id: 'WP', fams: ['FWP'] },
      ],
      fams: [
        { id: 'F0', husb: 'S', wife: 'W', children: ['C'] },
        { id: 'FP', husb: 'P', children: ['S'] },
        { id: 'FWP', husb: 'WP', children: ['W'] },
      ],
    });

    // 1. Non-finite MeasuredNode extents/anchors/regions & non-finite Layer.getBounds()
    const badMeasuredPlugin: NodePlugin = {
      sizeNodes(nodes) {
        return new Map<string, MeasuredNode>(
          nodes.map((n, idx) => [
            n.nodeId,
            idx === 0
              ? ({
                  extents: {
                    alongBefore: NaN,
                    alongAfter: -Infinity,
                    acrossBefore: Infinity,
                    acrossAfter: 40,
                  },
                  anchors: {
                    indiParents: { along: NaN, across: Infinity },
                    spouseParents: { along: 0, across: -Infinity },
                    children: { along: 0, across: NaN },
                  },
                  regions: [
                    {
                      kind: 'person',
                      id: 'S',
                      x: NaN,
                      y: -20,
                      width: -10,
                      height: Infinity,
                    },
                  ],
                } as MeasuredNode)
              : ({
                  extents: {
                    alongBefore: 20,
                    alongAfter: 0,
                    acrossBefore: 30,
                    acrossAfter: 30,
                  },
                } as unknown as MeasuredNode),
          ]),
        );
      },
      drawNode() {},
    };
    const badBoundsLayer: Layer = {
      id: 'bad-bounds',
      slot: 'back',
      getBounds: () => ({ x: 0, y: -Infinity, width: Infinity, height: NaN }),
      render() {},
    };

    for (const chart of CHARTS) {
      const res = computeLayout(
        { startIndi: 'S', baseGeneration: -0 },
        {
          graph: family,
          chart,
          nodePlugin: badMeasuredPlugin,
          layers: [badBoundsLayer],
        },
      );
      expect(Number.isFinite(res.size[0])).toBe(true);
      expect(Number.isFinite(res.size[1])).toBe(true);
      expect(Number.isFinite(res.origin[0])).toBe(true);
      expect(Number.isFinite(res.origin[1])).toBe(true);
      for (const n of res.nodes) {
        expect(Object.is(n.generation, -0)).toBe(false);
        expect(Number.isFinite(n.x)).toBe(true);
        expect(Number.isFinite(n.y)).toBe(true);
        expect(Number.isFinite(n.bounds.width)).toBe(true);
        expect(Number.isFinite(n.bounds.height)).toBe(true);
      }
      const route = createLinkRouter(res, { generationSpacing: NaN });
      for (const link of res.links) {
        for (const pt of route({ ...link, hopOffset: Infinity })) {
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        }
      }
    }

    // 2. resolveCoreTheme / resolveChartTheme sanitize theme.margin and preserve plugin defaults
    const marginPlugin: NodePlugin = {
      ...stubPlugin,
      defaultTheme: { margin: 40 },
    };
    expect(
      resolveChartTheme({ nodePlugin: marginPlugin, theme: { margin: NaN } })
        .margin,
    ).toBe(40);
    expect(
      computeLayout(
        { startIndi: 'I1' },
        {
          graph: createModelGraph({ indis: [{ id: 'I1' }], fams: [] }),
          chart: 'hourglass',
          nodePlugin: marginPlugin,
          theme: { margin: NaN },
        },
      ).size,
    ).toEqual([140, 100]);
    expect(
      resolveCoreTheme({
        margin: { top: undefined, right: NaN, bottom: 5, left: 5 } as unknown as CoreTheme['margin'],
      }).margin,
    ).toEqual({ top: 15, right: 15, bottom: 5, left: 5 });

    // 3. Fractional and Infinity maxGenerations
    expect(
      layoutOf(family, 'hourglass', 'S', {
        maxDescendantGenerations: 0.9,
      }).nodes.map((n) => n.id),
    ).toEqual(
      layoutOf(family, 'hourglass', 'S', {
        maxDescendantGenerations: 0,
      }).nodes.map((n) => n.id),
    );
    expect(
      layoutOf(family, 'hourglass', 'S', {
        maxAncestorGenerations: Infinity,
        maxDescendantGenerations: Infinity,
      }).nodes.map((n) => n.id),
    ).toEqual(layoutOf(family, 'hourglass', 'S').nodes.map((n) => n.id));

    // 4. Self-partnered custom FamilyGraph does not duplicate ancestor subtrees
    const selfPartnered = rawGraph({
      indis: {
        S: { famc: 'FP' },
        P: { famc: 'FGP', fams: ['FP', 'F_EXTRA'] },
        W2: { fams: ['F_EXTRA'] },
        GP: { fams: ['FGP'] },
      },
      fams: {
        FP: { husb: 'P', wife: 'P', children: ['S'] },
        F_EXTRA: { husb: 'P', wife: 'W2' },
        FGP: { husb: 'GP', children: ['P'] },
      },
    });
    for (const chart of CHARTS) {
      const res = layoutOf(selfPartnered, chart, 'S');
      expectSoundLayout(res, `self-partnered ${chart}`);
      const fpNode = res.nodes.find((n) => n.id === 'FP')!;
      expect(fpNode.indiId).toBe('P');
      expect(fpNode.spouseId).toBeUndefined();
      expect(res.nodes.filter((n) => n.familyId === 'FGP')).toHaveLength(1);
    }
    const selfRoot = layoutOf(selfPartnered, 'hourglass', 'P').nodes.find(
      (n) => n.isRoot,
    )!;
    expect(selfRoot.indiId).toBe('P');
    expect(selfRoot.spouseId).toBeUndefined();

    // 5. checkViewState rejects non-Set collapsed; non-finite baseGeneration falls back to 0
    expect(() =>
      computeLayout(
        {
          startIndi: 'S',
          collapsed: ['FP:indiParents'] as unknown as ReadonlySet<`${string}:${Slot}`>,
        },
        { graph: family, chart: 'hourglass', nodePlugin: stubPlugin },
      ),
    ).toThrow('ViewState.collapsed');
    const nanGen = computeLayout(
      { startIndi: 'S', baseGeneration: NaN },
      { graph: family, chart: 'hourglass', nodePlugin: stubPlugin },
    );
    expect(nanGen.nodes.find((n) => n.isRoot)!.generation).toBe(0);
  });
});
