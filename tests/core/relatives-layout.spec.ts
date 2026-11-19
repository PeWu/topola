import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  createFixedTextMeasurer,
} from '../../src/core/index.js';
import { createModelGraph, type ModelData } from '../../src/model/index.js';
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

describe('All Relatives staircase layout & Issue #30 remarried ancestors', () => {
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

  it('matches V3 seam coordinates, size, and origin on all clean 2-parent scenarios AND satisfies non-overlap & link invariants across 100% of all 148 scenarios', () => {
    const measurer = createFixedTextMeasurer(0.6);
    let parityVerifiedCount = 0;

    for (const scenario of snapshots.scenarios) {
      const rawData: ModelData =
        scenario.source.kind === 'dataset'
          ? getDataset(scenario.source.file)
          : (generateFamily(scenario.source.seed, scenario.source.params)
              .data as ModelData);

      const graph = createModelGraph(rawData);
      const nodePlugin = createOracleNodePlugin(graph, scenario.sizingMode);

      const actual = computeLayout(
        { startIndi: scenario.startIndi },
        {
          graph,
          chart: 'relatives',
          direction: 'down',
          nodePlugin,
          textMeasurer: measurer,
        },
      );

      // 1. Invariants across 100% of scenarios:
      // - Zero overlapping node bounding boxes
      // - Unique node IDs
      // - Every link references existing nodes
      // - Unique link IDs
      assertNoNodeOverlaps(actual.nodes);
      const nodeIds = new Set(actual.nodes.map((n) => n.id));
      expect(nodeIds.size).toBe(actual.nodes.length);
      expect(
        new Set(actual.links.map((l) => l.id)).size,
        `${scenario.id} (relatives) unique link ids`,
      ).toBe(actual.links.length);
      for (const link of actual.links) {
        expect(nodeIds.has(link.fromNodeId)).toBe(true);
        expect(nodeIds.has(link.toNodeId)).toBe(true);
      }

      // 2. Exact V3 coordinate parity when !hasRemarriedTraversedAncestor && !hasSingleParentOrWideFamAncestor
      if (
        !scenario.hasRemarriedTraversedAncestor &&
        !scenario.hasSingleParentOrWideFamAncestor
      ) {
        parityVerifiedCount++;
        const expected = scenario.charts.relatives;
        expect(
          actual.nodes.length,
          `${scenario.id} (relatives) node count`,
        ).toBe(expected.nodes.length);

        for (let i = 0; i < expected.nodes.length; i++) {
          const expNode = expected.nodes[i]!;
          const actNode = actual.nodes[i]!;
          expect(actNode.indiId, `${scenario.id} node[${i}].indiId`).toBe(
            expNode.indiId,
          );
          expect(actNode.spouseId, `${scenario.id} node[${i}].spouseId`).toBe(
            expNode.spouseId,
          );
          expect(actNode.familyId, `${scenario.id} node[${i}].familyId`).toBe(
            expNode.familyId,
          );
          expect(actNode.generation).toBe(expNode.generation);
          expect(
            actNode.x,
            `${scenario.id} ${actNode.id}.x`,
          ).toBeCloseTo(expNode.x, 2);
          expect(
            actNode.y,
            `${scenario.id} ${actNode.id}.y`,
          ).toBeCloseTo(expNode.y, 2);
        }

        expect(actual.size[0], `${scenario.id} width`).toBeCloseTo(
          expected.size[0],
          2,
        );
        expect(actual.size[1], `${scenario.id} height`).toBeCloseTo(
          expected.size[1],
          2,
        );
        expect(actual.origin[0], `${scenario.id} originX`).toBeCloseTo(
          expected.origin[0],
          2,
        );
        expect(actual.origin[1], `${scenario.id} originY`).toBeCloseTo(
          expected.origin[1],
          2,
        );
      }
    }

    expect(parityVerifiedCount).toBeGreaterThanOrEqual(60);
  });

  it('fixes Issue #30: renders extra marriages & half-siblings of both H and W on outer side with stepped hopOffset in side and centered blocks', () => {
    // Centered block case: I1 (unmarried) -> parents F1 (H=I2, W=I3).
    // Both I2 (husband) and I3 (wife) have extra marriages with half-siblings!
    const centeredRemarriageData: ModelData = {
      indis: [
        { id: 'I1', firstName: 'Start', famc: 'F_MAIN' },
        { id: 'I2', firstName: 'Father', sex: 'M', fams: ['F_EXTRA_H', 'F_MAIN'] },
        { id: 'I3', firstName: 'Mother', sex: 'F', fams: ['F_MAIN', 'F_EXTRA_W'] },
        { id: 'I4', firstName: 'SecondWife', sex: 'F', fams: ['F_EXTRA_H'] },
        { id: 'I5', firstName: 'SecondHusb', sex: 'M', fams: ['F_EXTRA_W'] },
        { id: 'I6', firstName: 'HalfSibFromFather', famc: 'F_EXTRA_H' },
        { id: 'I7', firstName: 'HalfSibFromMother', famc: 'F_EXTRA_W' },
      ],
      fams: [
        { id: 'F_MAIN', husb: 'I2', wife: 'I3', children: ['I1'] },
        { id: 'F_EXTRA_H', husb: 'I2', wife: 'I4', children: ['I6'] },
        { id: 'F_EXTRA_W', husb: 'I5', wife: 'I3', children: ['I7'] },
      ],
    };

    const graph = createModelGraph(centeredRemarriageData);
    const plugin = createSimpleNodePlugin({ model: graph });
    const measurer = createFixedTextMeasurer();

    const layout = computeLayout(
      { startIndi: 'I1' },
      { graph, chart: 'relatives', nodePlugin: plugin, textMeasurer: measurer },
    );

    assertNoNodeOverlaps(layout.nodes);

    // Verify both extra marriages and both half-siblings are rendered!
    const famIds = layout.nodes.map((n) => n.familyId).filter(Boolean);
    expect(famIds).toContain('F_MAIN');
    expect(famIds).toContain('F_EXTRA_H');
    expect(famIds).toContain('F_EXTRA_W');
    const indiIds = layout.nodes.map((n) => n.indiId).filter(Boolean);
    expect(indiIds).toContain('I6');
    expect(indiIds).toContain('I7');

    // On centered paternal block, extra marriages sit on the OUTER (left) side of F_MAIN!
    const mainNode = layout.nodes.find((n) => n.familyId === 'F_MAIN')!;
    const extraHNode = layout.nodes.find((n) => n.familyId === 'F_EXTRA_H')!;
    const extraWNode = layout.nodes.find((n) => n.familyId === 'F_EXTRA_W')!;
    expect(extraHNode.x).toBeLessThan(mainNode.x);
    expect(extraWNode.x).toBeLessThan(extraHNode.x);

    // F_EXTRA_W is separated from F_MAIN by F_EXTRA_H -> must have hopOffset >= 6!
    const addLinks = layout.links.filter((l) => l.kind === 'additionalMarriage');
    expect(addLinks.length).toBe(2);
    expect(new Set(layout.links.map((l) => l.id)).size).toBe(
      layout.links.length,
    );
    expect(addLinks.some((l) => (l.hopOffset ?? 0) >= 6)).toBe(true);

    // Side block case: I1 married to I_SPOUSE, where I_SPOUSE's mother (maternal side, right!) remarried
    const maternalSideData: ModelData = {
      indis: [
        { id: 'I1', sex: 'M', famc: 'F_PAT', fams: ['F_ROOT'] },
        { id: 'I_SP', sex: 'F', famc: 'F_MAT', fams: ['F_ROOT'] },
        { id: 'I_PF', sex: 'M', fams: ['F_PAT'] },
        { id: 'I_PM', sex: 'F', fams: ['F_PAT'] },
        { id: 'I_MF', sex: 'M', fams: ['F_MAT'] },
        { id: 'I_MM', sex: 'F', fams: ['F_MAT', 'F_MAT_EXTRA'] },
        { id: 'I_MM_H2', sex: 'M', fams: ['F_MAT_EXTRA'] },
        { id: 'I_MAT_HALFSIB', famc: 'F_MAT_EXTRA' },
      ],
      fams: [
        { id: 'F_ROOT', husb: 'I1', wife: 'I_SP' },
        { id: 'F_PAT', husb: 'I_PF', wife: 'I_PM', children: ['I1'] },
        { id: 'F_MAT', husb: 'I_MF', wife: 'I_MM', children: ['I_SP'] },
        { id: 'F_MAT_EXTRA', husb: 'I_MM_H2', wife: 'I_MM', children: ['I_MAT_HALFSIB'] },
      ],
    };
    const matGraph = createModelGraph(maternalSideData);
    const matLayout = computeLayout(
      { startIndi: 'I1' },
      {
        graph: matGraph,
        chart: 'relatives',
        nodePlugin: createSimpleNodePlugin({ model: matGraph }),
        textMeasurer: measurer,
      },
    );
    assertNoNodeOverlaps(matLayout.nodes);
    const fMat = matLayout.nodes.find((n) => n.familyId === 'F_MAT')!;
    const fMatExtra = matLayout.nodes.find((n) => n.familyId === 'F_MAT_EXTRA')!;
    // On maternal right-side block, extra marriage sits on the OUTER (right) side of F_MAT!
    expect(fMatExtra.x).toBeGreaterThan(fMat.x);
  });

  it('preserves all parentless-family and single-parent regressions from Topola 3', () => {
    const measurer = createFixedTextMeasurer();
    const runCount = (data: ModelData, startIndi: string) => {
      const g = createModelGraph(data);
      const res = computeLayout(
        { startIndi },
        {
          graph: g,
          chart: 'relatives',
          nodePlugin: createSimpleNodePlugin({ model: g }),
          textMeasurer: measurer,
        },
      );
      assertNoNodeOverlaps(res.nodes);
      return res.nodes.length;
    };

    // 1. Single person
    expect(runCount({ fams: [], indis: [{ id: 'I1' }] }, 'I1')).toBe(1);

    // 2. Family with no parents and only 1 child (pruned)
    expect(
      runCount(
        {
          fams: [{ id: 'F1', children: ['I1'] }],
          indis: [{ id: 'I1', famc: 'F1' }],
        },
        'I1',
      ),
    ).toBe(1);

    // 3. Family with only wife
    expect(
      runCount(
        {
          fams: [{ id: 'F1', children: ['I1'], wife: 'I2' }],
          indis: [
            { id: 'I1', famc: 'F1' },
            { id: 'I2', fams: ['F1'] },
          ],
        },
        'I1',
      ),
    ).toBe(2);

    // 4. Ancestor family-as-child with no parents defined (dangling parent ref regression)
    expect(
      runCount(
        {
          indis: [
            { id: 'I1', fams: ['F1'] },
            { id: 'I2', famc: 'F3', fams: ['F2'] },
            { id: 'I3', famc: 'F2', fams: ['F1'] },
            { id: 'I4', famc: 'F4', fams: ['F3'] },
            { id: 'I5', famc: 'F5', fams: ['F3'] },
            { id: 'I6', fams: ['F4'] },
          ],
          fams: [
            { id: 'F1', husb: 'I3', wife: 'I1' },
            { id: 'F2', wife: 'I2', children: ['I3'] },
            { id: 'F3', husb: 'I4', wife: 'I5', children: ['I2'] },
            { id: 'F4', wife: 'I6', children: ['I4'] },
            { id: 'F5', children: ['I5'] },
          ],
        },
        'I1',
      ),
    ).toBe(4);

    // 5. Shows siblings when their shared family has no parents
    expect(
      runCount(
        {
          fams: [{ id: 'F1', children: ['I1', 'I2'] }],
          indis: [
            { id: 'I1', famc: 'F1' },
            { id: 'I2', famc: 'F1' },
          ],
        },
        'I1',
      ),
    ).toBe(3);

    // 6. Shows parent-level sibling from a descendant start
    expect(
      runCount(
        {
          fams: [
            { id: 'F1', children: ['I1', 'I2'] },
            { id: 'F2', husb: 'I1', children: ['I3'] },
          ],
          indis: [
            { id: 'I1', famc: 'F1', fams: ['F2'] },
            { id: 'I2', famc: 'F1' },
            { id: 'I3', famc: 'F2' },
          ],
        },
        'I3',
      ),
    ).toBe(4);
  });

  it('satisfies 4-direction reflection & transposition invariants (down, up, right, left)', () => {
    const measurer = createFixedTextMeasurer(0.6);

    for (let seed = 3001; seed <= 3010; seed++) {
      const { data, startIndi } = generateFamily(seed, {
        ancestorGenerations: 3,
        descendantGenerations: 2,
        maxSiblings: 3,
        remarriageProb: 0.35,
        pedigreeCollapseProb: 0.1,
        singleParentProb: 0.2,
        parentlessSiblingsProb: 0.15,
        marriageDetailsProb: 0.6,
        wideMarriageProb: 0.2,
      });
      const graph = createModelGraph(data as ModelData);
      const plugin = createOracleNodePlugin(graph, 'withMarriage');

      const down = computeLayout(
        { startIndi },
        { graph, chart: 'relatives', direction: 'down', nodePlugin: plugin, textMeasurer: measurer },
      );
      const up = computeLayout(
        { startIndi },
        { graph, chart: 'relatives', direction: 'up', nodePlugin: plugin, textMeasurer: measurer },
      );
      const right = computeLayout(
        { startIndi },
        { graph, chart: 'relatives', direction: 'right', nodePlugin: plugin, textMeasurer: measurer },
      );
      const left = computeLayout(
        { startIndi },
        { graph, chart: 'relatives', direction: 'left', nodePlugin: plugin, textMeasurer: measurer },
      );

      assertNoNodeOverlaps(down.nodes);
      assertNoNodeOverlaps(up.nodes);
      assertNoNodeOverlaps(right.nodes);
      assertNoNodeOverlaps(left.nodes);

      expect(up.size).toEqual(down.size);
      expect(left.size).toEqual(right.size);

      for (let i = 0; i < down.nodes.length; i++) {
        expect(up.nodes[i]!.x).toBeCloseTo(down.nodes[i]!.x, 4);
        expect(up.nodes[i]!.y).toBeCloseTo(-down.nodes[i]!.y, 4);
      }
      for (let i = 0; i < right.nodes.length; i++) {
        expect(left.nodes[i]!.y).toBeCloseTo(right.nodes[i]!.y, 4);
        expect(left.nodes[i]!.x).toBeCloseTo(-right.nodes[i]!.x, 4);
      }
    }
  });
});
