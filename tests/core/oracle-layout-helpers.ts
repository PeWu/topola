import type { LayoutNode, NodePlugin } from '../../src/core/index.js';
import type { ModelGraph } from '../../src/model/index.js';
import { createSimpleNodePlugin } from '../../src/presets/index.js';
import { SIMPLE_BOX_THEME, simpleContent } from '../../src/presets/simple.js';
import {
  createCoupleAssembler,
  createTextBox,
  type FamilyBoxContext,
  type PersonBoxContext,
  type TextBoxSpecificTheme,
  type TextBoxTheme,
} from '../../src/toolkit/index.js';
import type { OracleSizingMode } from '../oracle/family-generator.js';

const ORACLE_MARRIAGE_BOX_THEME: TextBoxSpecificTheme = {
  boxFill: '#ffffff',
  boxStroke: '#000000',
  boxStrokeWidth: 1,
  textColor: '#000000',
  cornerRadius: 0,
  minWidth: 0,
  minHeight: 0,
  padding: { top: 5, right: 4, bottom: 5, left: 4 },
  symbolColumnWidth: 14,
  badgeGap: 12,
  imageWidth: 0,
  imageMinHeight: 0,
  roles: {
    details: { fontSize: 10, lineHeight: 14 },
  },
};

export function createOracleNodePlugin(
  graph: ModelGraph,
  mode: OracleSizingMode,
): NodePlugin<TextBoxTheme> {
  if (mode === 'simple') {
    return createSimpleNodePlugin({ model: graph });
  }
  const personBox = createTextBox<PersonBoxContext, TextBoxTheme>({
    namespace: 'simple',
    defaultTheme: SIMPLE_BOX_THEME,
    content: (ctx) =>
      simpleContent({ ...ctx, person: graph.getPerson(ctx.personId) }),
  });
  const familyBox = createTextBox<FamilyBoxContext, TextBoxTheme>({
    namespace: 'simple-fam',
    defaultTheme: ORACLE_MARRIAGE_BOX_THEME,
    suppressWhenEmpty: true,
    content: (ctx) => {
      const fam = graph.getFamily(ctx.familyId);
      const yearStr = fam?.marriage?.date?.year
        ? String(fam.marriage.date.year)
        : '';
      const placeStr = fam?.marriage?.place ?? '';
      const lines = [yearStr, placeStr]
        .filter(Boolean)
        .map((text) => ({ role: 'details', symbol: '*', text }));
      return { symbolLines: lines };
    },
  });
  return createCoupleAssembler<TextBoxTheme>({ personBox, familyBox });
}

export function assertNoNodeOverlaps(nodes: readonly LayoutNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    const ax0 = a.x + a.bounds.x;
    const ay0 = a.y + a.bounds.y;
    const ax1 = ax0 + a.bounds.width;
    const ay1 = ay0 + a.bounds.height;

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!;
      const bx0 = b.x + b.bounds.x;
      const by0 = b.y + b.bounds.y;
      const bx1 = bx0 + b.bounds.width;
      const by1 = by0 + b.bounds.height;

      // Strict interior overlap (> 0.01px tolerance)
      const overlapX = Math.min(ax1, bx1) - Math.max(ax0, bx0);
      const overlapY = Math.min(ay1, by1) - Math.max(ay0, by0);
      if (overlapX > 0.01 && overlapY > 0.01) {
        throw new Error(
          `Nodes "${a.id}" [${ax0},${ay0}..${ax1},${ay1}] and "${b.id}" [${bx0},${by0}..${bx1},${by1}] overlap by ${overlapX}x${overlapY}`,
        );
      }
    }
  }
}
