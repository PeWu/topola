import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  createFixedTextMeasurer,
} from '../../src/core/index.js';
import {
  createModelGraph,
  type ModelData,
} from '../../src/model/index.js';
import { createSimpleNodePlugin } from '../../src/presets/index.js';
import { gedcomToModel } from '../../src/gedcom/index.js';
import {
  generateFamily,
  type V3LayoutSnapshotsFile,
} from '../oracle/family-generator.js';
import {
  assertNoNodeOverlaps,
  createOracleNodePlugin,
} from './oracle-layout-helpers.js';

describe('Hourglass layout (Stage 1-3) & V3 Oracle Parity', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const snapshotsPath = path.join(
    repoRoot,
    'tests/oracle/v3-layout-snapshots.json',
  );
  const snapshots = JSON.parse(
    fs.readFileSync(snapshotsPath, 'utf8'),
  ) as V3LayoutSnapshotsFile;

  const datasetCache = new Map<string, ModelData>();
  const getDataset = (file: string): ModelData => {
    let cached = datasetCache.get(file);
    if (!cached) {
      const fullPath = path.join(repoRoot, 'demo/data', file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      cached = file.endsWith('.ged')
        ? gedcomToModel(raw)
        : (JSON.parse(raw) as ModelData);
      datasetCache.set(file, cached);
    }
    return cached;
  };

  it('matches V3 seam coordinates, size, and origin across all 148 scenarios x 3 Hourglass modes (444 layouts)', () => {
    const measurer = createFixedTextMeasurer(0.6);

    for (const scenario of snapshots.scenarios) {
      const rawData: ModelData =
        scenario.source.kind === 'dataset'
          ? getDataset(scenario.source.file)
          : (generateFamily(scenario.source.seed, scenario.source.params)
              .data as ModelData);

      const graph = createModelGraph(rawData);
      const nodePlugin = createOracleNodePlugin(graph, scenario.sizingMode);

      const modes = [
        {
          v3Key: 'ancestor' as const,
          maxAncestorGenerations: undefined,
          maxDescendantGenerations: 0,
        },
        {
          v3Key: 'descendant' as const,
          maxAncestorGenerations: 0,
          maxDescendantGenerations: undefined,
        },
        {
          v3Key: 'hourglass' as const,
          maxAncestorGenerations: undefined,
          maxDescendantGenerations: undefined,
        },
      ];

      for (const mode of modes) {
        const expected = scenario.charts[mode.v3Key];
        const actual = computeLayout(
          { startIndi: scenario.startIndi },
          {
            graph,
            chart: 'hourglass',
            direction: 'down',
            maxAncestorGenerations: mode.maxAncestorGenerations,
            maxDescendantGenerations: mode.maxDescendantGenerations,
            nodePlugin,
            textMeasurer: measurer,
          },
        );

        assertNoNodeOverlaps(actual.nodes);
        expect(actual.nodes.length, `${scenario.id} (${mode.v3Key}) node count`).toBe(
          expected.nodes.length,
        );
        expect(
          new Set(actual.links.map((l) => l.id)).size,
          `${scenario.id} (${mode.v3Key}) unique link ids`,
        ).toBe(actual.links.length);

        const ancDeltaY = expected.hasUnequalMultiMarriageRoot
          ? (expected.unequalRootAncDeltaY ?? 0)
          : 0;

        const seenActualIds = new Set<string>();
        const startSpouseCount = graph.getPersonSpouseFamilies(
          scenario.startIndi,
        ).length;

        for (let i = 0; i < expected.nodes.length; i++) {
          const expNode = expected.nodes[i]!;
          const actNode = actual.nodes[i]!;
          expect(seenActualIds.has(actNode.id)).toBe(false);
          seenActualIds.add(actNode.id);

          expect(actNode.indiId, `${scenario.id} (${mode.v3Key}) node[${i}].indiId`).toBe(
            expNode.indiId,
          );
          expect(actNode.spouseId, `${scenario.id} (${mode.v3Key}) node[${i}].spouseId`).toBe(
            expNode.spouseId,
          );
          expect(actNode.familyId, `${scenario.id} (${mode.v3Key}) node[${i}].familyId`).toBe(
            expNode.familyId,
          );
          if (
            actNode.familyId !== undefined &&
            !(mode.v3Key === 'hourglass' && startSpouseCount > 1)
          ) {
            expect(actNode.id, `${scenario.id} (${mode.v3Key}) node[${i}].id`).toBe(
              expNode.id,
            );
          }
          expect(actNode.generation).toBe(expNode.generation);
          expect(actNode.x, `${scenario.id} (${mode.v3Key}) ${actNode.id}.x`).toBeCloseTo(
            expNode.x,
            2,
          );
          const expectedY =
            expNode.generation < 0 ? expNode.y + ancDeltaY : expNode.y;
          expect(actNode.y, `${scenario.id} (${mode.v3Key}) ${actNode.id}.y`).toBeCloseTo(
            expectedY,
            2,
          );
        }

        if (!expected.hasUnequalMultiMarriageRoot) {
          expect(actual.size[0], `${scenario.id} (${mode.v3Key}) width`).toBeCloseTo(
            expected.size[0],
            2,
          );
          expect(actual.size[1], `${scenario.id} (${mode.v3Key}) height`).toBeCloseTo(
            expected.size[1],
            2,
          );
          expect(actual.origin[0], `${scenario.id} (${mode.v3Key}) originX`).toBeCloseTo(
            expected.origin[0],
            2,
          );
          expect(actual.origin[1], `${scenario.id} (${mode.v3Key}) originY`).toBeCloseTo(
            expected.origin[1],
            2,
          );
        }
      }
    }
  });

  it('handles missing startIndi, missing references, asymmetric links, and cycles gracefully', () => {
    const cyclicAndBroken: ModelData = {
      indis: [
        { id: 'I1', firstName: 'Root', famc: 'F_CYCLE', fams: ['F_MISSING'] },
        { id: 'I2', firstName: 'Parent', famc: 'F_CYCLE' }, // I2 is both parent AND child in F_CYCLE!
        { id: 'I3', firstName: 'OneSidedChild', famc: 'F_ASYM' },
      ],
      fams: [
        { id: 'F_CYCLE', husb: 'I2', wife: 'I_GHOST', children: ['I1'] },
        { id: 'F_ASYM', husb: 'I1' }, // I3 points to F_ASYM via famc without F_ASYM listing I3
      ],
    };

    const graph = createModelGraph(cyclicAndBroken);
    expect(graph.problems.some((p) => p.code === 'ASYMMETRIC_CHILD_LINK')).toBe(
      true,
    );
    expect(graph.getFamilyChildren('F_ASYM')).toContain('I3');

    const plugin = createSimpleNodePlugin({ model: graph });
    const measurer = createFixedTextMeasurer();

    // Missing startIndi returns finite [0, 0]
    const emptyRes = computeLayout(
      { startIndi: 'DOES_NOT_EXIST' },
      { graph, chart: 'hourglass', nodePlugin: plugin, textMeasurer: measurer },
    );
    expect(emptyRes.size).toEqual([0, 0]);
    expect(emptyRes.origin).toEqual([0, 0]);
    expect(emptyRes.nodes).toEqual([]);
    expect(
      emptyRes.problems.some((p) => p.code === 'MISSING_START_PERSON'),
    ).toBe(true);

    // Cyclic + missing references terminate cleanly and report Problems
    const res = computeLayout(
      { startIndi: 'I1' },
      { graph, chart: 'hourglass', nodePlugin: plugin, textMeasurer: measurer },
    );
    expect(Number.isFinite(res.size[0])).toBe(true);
    expect(Number.isFinite(res.size[1])).toBe(true);
    expect(res.problems.some((p) => p.code === 'CYCLE_DETECTED')).toBe(true);
    expect(res.problems.some((p) => p.code === 'MISSING_PERSON')).toBe(true);
    expect(res.problems.some((p) => p.code === 'MISSING_FAMILY')).toBe(true);
    // One-sided child I3 was reconciled and rendered
    expect(res.nodes.some((n) => n.indiId === 'I3')).toBe(true);
  });

  it('preserves DAG pedigree collapse (cousin marriages & shared ancestors) while suppressing boundary expanders', () => {
    const cousinData: ModelData = {
      indis: [
        { id: 'I1', fams: ['F1'] },
        { id: 'I2', fams: ['F1'] },
        { id: 'I3', famc: 'F1', fams: ['F2'] },
        { id: 'I4', famc: 'F1', fams: ['F2'] },
        { id: 'I5', famc: 'F2' },
      ],
      fams: [
        { id: 'F1', husb: 'I1', wife: 'I2', children: ['I3', 'I4'] },
        { id: 'F2', husb: 'I3', wife: 'I4', children: ['I5'] },
      ],
    };
    const graph = createModelGraph(cousinData);
    const plugin = createSimpleNodePlugin({ model: graph });
    const measurer = createFixedTextMeasurer();

    // Descendant view from I1: F2 appears twice (F2 and F2:1) and I5 appears twice (I5 and I5:1)
    const desc = computeLayout(
      { startIndi: 'I1' },
      {
        graph,
        chart: 'hourglass',
        maxAncestorGenerations: 0,
        nodePlugin: plugin,
        textMeasurer: measurer,
      },
    );
    const ids = desc.nodes.map((n) => n.id);
    expect(ids).toContain('F2');
    expect(ids).toContain('F2:1');
    expect(ids).toContain('I5');
    expect(ids).toContain('I5:1');
    expect(desc.problems).toEqual([]);

    // Generation limit = 1 suppresses children expander at depth 1
    const limited = computeLayout(
      { startIndi: 'I1' },
      {
        graph,
        chart: 'hourglass',
        maxAncestorGenerations: 0,
        maxDescendantGenerations: 1,
        nodePlugin: plugin,
        textMeasurer: measurer,
      },
    );
    const f2Node = limited.nodes.find((n) => n.id === 'F2')!;
    expect(f2Node.expanders.children).toBeUndefined();
  });

  it('satisfies 4-direction reflection and transposition invariants across down, up, right, and left', () => {
    const measurer = createFixedTextMeasurer(0.6);

    for (let seed = 2001; seed <= 2015; seed++) {
      const { data, startIndi } = generateFamily(seed, {
        ancestorGenerations: 2,
        descendantGenerations: 2,
        maxSiblings: 3,
        remarriageProb: 0.3,
        pedigreeCollapseProb: 0.1,
        singleParentProb: 0.2,
        parentlessSiblingsProb: 0,
        marriageDetailsProb: 0.7,
        wideMarriageProb: 0.2,
      });
      const graph = createModelGraph(data as ModelData);
      const plugin = createOracleNodePlugin(graph, 'withMarriage');

      const down = computeLayout(
        { startIndi },
        { graph, chart: 'hourglass', direction: 'down', nodePlugin: plugin, textMeasurer: measurer },
      );
      const up = computeLayout(
        { startIndi },
        { graph, chart: 'hourglass', direction: 'up', nodePlugin: plugin, textMeasurer: measurer },
      );
      const right = computeLayout(
        { startIndi },
        { graph, chart: 'hourglass', direction: 'right', nodePlugin: plugin, textMeasurer: measurer },
      );
      const left = computeLayout(
        { startIndi },
        { graph, chart: 'hourglass', direction: 'left', nodePlugin: plugin, textMeasurer: measurer },
      );

      assertNoNodeOverlaps(down.nodes);
      assertNoNodeOverlaps(up.nodes);
      assertNoNodeOverlaps(right.nodes);
      assertNoNodeOverlaps(left.nodes);

      // 'up' mirrors 'down' across y (with marriage boxes flipped above the seam)
      expect(up.size).toEqual(down.size);
      expect(up.nodes.length).toBe(down.nodes.length);
      for (let i = 0; i < down.nodes.length; i++) {
        const dNode = down.nodes[i]!;
        const uNode = up.nodes[i]!;
        expect(uNode.id).toBe(dNode.id);
        expect(uNode.x).toBeCloseTo(dNode.x, 4);
        expect(uNode.y).toBeCloseTo(-dNode.y, 4);

        const dFam = dNode.regions.find((r) => r.kind === 'family');
        const uFam = uNode.regions.find((r) => r.kind === 'family');
        if (dFam && uFam) {
          expect(dFam.y).toBe(0);
          expect(uFam.y).toBe(-uFam.height); // flipped above seam!
        }
      }

      // 'left' mirrors 'right' across x (with marriage boxes flipped left of the seam)
      expect(left.size).toEqual(right.size);
      expect(left.nodes.length).toBe(right.nodes.length);
      for (let i = 0; i < right.nodes.length; i++) {
        const rNode = right.nodes[i]!;
        const lNode = left.nodes[i]!;
        expect(lNode.id).toBe(rNode.id);
        expect(lNode.y).toBeCloseTo(rNode.y, 4);
        expect(lNode.x).toBeCloseTo(-rNode.x, 4);

        const rFam = rNode.regions.find((r) => r.kind === 'family');
        const lFam = lNode.regions.find((r) => r.kind === 'family');
        if (rFam && lFam) {
          expect(rFam.x).toBe(0);
          expect(lFam.x).toBe(-lFam.width); // flipped left of seam!
        }
      }
    }
  });
});
