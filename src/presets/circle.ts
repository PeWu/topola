import {
  isHorizontalDirection,
  type CoreTheme,
  type Direction,
  type DrawHelpers,
  type LayoutNode,
  type MeasuredNode,
  type NodePlugin,
  type Problem,
  type Region,
  type SizeNodeInput,
  type StyleScheme,
  type TextMeasurer,
} from '../core/index.js';
import { DEFAULT_CORE_THEME, screenSizeToAbstract } from '../core/internal.js';
import type {
  ModelDataInput,
  ModelGraph,
  PersonRecord,
} from '../model/index.js';
import { toModelGraph } from '../model/internal.js';
import { paletteCss, type ColorTarget } from '../toolkit/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface CircleSpecificTheme {
  colorTarget?: ColorTarget | undefined;
  singleDiameter: number;
  coupleDiameter: number;
  circleFill: string;
  circleStroke: string;
  circleStrokeWidth: number;
  circleTextColor: string;
  circleFontSize: number;
}

export type CircleTheme = CoreTheme & CircleSpecificTheme;

export interface CircleNodePluginOptions {
  model: ModelDataInput | ModelGraph;
  /**
   * Returns the text shown for a person; `person` is missing if the model has
   * no record for the id. The default is `defaultCircleLabel`.
   */
  label?:
    | ((person: PersonRecord | undefined, personId: string) => string)
    | undefined;
  namespace?: string | undefined;
}

export const DEFAULT_CIRCLE_THEME: CircleSpecificTheme = {
  colorTarget: 'background',
  singleDiameter: 80,
  coupleDiameter: 120,
  circleFill: '#ffffff',
  circleStroke: '#004400',
  circleStrokeWidth: 5,
  circleTextColor: '#000000',
  circleFontSize: 12,
};

/** The text of a person in a circle: the first word of the first name. */
export function defaultCircleLabel(
  person: ModelDataInput['indis'][number] | undefined,
): string {
  const first = person?.firstName?.trim() ?? '';
  return first ? (first.split(/\s+/)[0] ?? '') : '';
}

function mergeCircleTheme(raw: Partial<CircleTheme> | undefined): CircleTheme {
  const merged = {
    ...DEFAULT_CORE_THEME,
    ...DEFAULT_CIRCLE_THEME,
  } as CircleTheme;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined && key !== '__proto__') {
        (merged as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }
  for (const key of [
    'singleDiameter',
    'coupleDiameter',
    'circleFontSize',
  ] as const) {
    if (!Number.isFinite(merged[key]) || merged[key] <= 0) {
      merged[key] = DEFAULT_CIRCLE_THEME[key];
    }
  }
  if (
    !Number.isFinite(merged.circleStrokeWidth) ||
    merged.circleStrokeWidth < 0
  ) {
    merged.circleStrokeWidth = DEFAULT_CIRCLE_THEME.circleStrokeWidth;
  }
  return merged;
}

/**
 * Direct `NodePlugin` implementation drawing 1 or 2 partners inside a single
 * circle centered at `(0, 0)` without using `CoupleAssembler` or `TextBox`.
 */
export function createCircleNodePlugin<TTheme extends CoreTheme = CircleTheme>(
  options: CircleNodePluginOptions,
): NodePlugin<TTheme> {
  const graph = toModelGraph(options.model);
  const labelFn = options.label ?? defaultCircleLabel;
  const namespace = options.namespace ?? 'circle';

  return {
    defaultTheme: DEFAULT_CIRCLE_THEME as Partial<CoreTheme> as Partial<TTheme>,

    getCss(
      scopeSelector: string,
      rawTheme: TTheme,
      schemes: readonly StyleScheme[],
    ): string {
      const t = mergeCircleTheme(rawTheme);
      const ns = `.${namespace}`;

      const rules: string[] = [
        `${scopeSelector} ${ns} text { font-family: ${t.fontFamily}; font-size: ${t.circleFontSize}px; fill: ${t.circleTextColor}; }`,
        `${scopeSelector} ${ns} .underlay { fill: #ffffff; stroke: none; }`,
        `${scopeSelector} ${ns} .background { fill: ${t.circleFill}; stroke: none; }`,
        `${scopeSelector} ${ns} .frame { fill: none; stroke: ${t.circleStroke}; stroke-width: ${t.circleStrokeWidth}px; pointer-events: none; }`,
      ];

      rules.push(
        ...paletteCss({
          prefix: `${scopeSelector} ${ns}`,
          schemes,
          colorTarget: t.colorTarget,
        }),
      );

      return rules.join('\n');
    },

    sizeNodes(
      nodes: readonly SizeNodeInput[],
      ctx: {
        direction: Direction;
        theme: TTheme;
        measurer: TextMeasurer;
        problems: Problem[];
      },
    ): Map<string, MeasuredNode> {
      const t = mergeCircleTheme(ctx.theme);
      const map = new Map<string, MeasuredNode>();

      for (const input of nodes) {
        const hasIndi = input.indiId !== undefined;
        const hasSpouse = input.spouseId !== undefined;
        const personCount = (hasIndi ? 1 : 0) + (hasSpouse ? 1 : 0);

        const diameter = personCount >= 2 ? t.coupleDiameter : t.singleDiameter;
        const radius = diameter / 2;
        const outerHalf = radius + t.circleStrokeWidth / 2;
        const absSpan = screenSizeToAbstract(
          outerHalf * 2,
          outerHalf * 2,
          ctx.direction,
        );
        const halfAlong = absSpan.along / 2;
        const halfAcross = absSpan.across / 2;

        const regions: Region[] = [];
        const isHoriz = isHorizontalDirection(ctx.direction);

        if (personCount >= 2 && input.indiId && input.spouseId) {
          // Two semicircular regions stacked top/bottom in screen space:
          // In vertical ('down'/'up'): across is x [-radius, +radius], along is y.
          // Note: in 'up', alongSign = -1 flips along intervals! So store regions
          // so that after projectRegion, top half is [-radius..0] and bottom half is [0..+radius] in screen y:
          if (isHoriz) {
            regions.push({
              kind: 'person',
              id: input.indiId,
              x: -radius,
              y: -radius,
              width: radius,
              height: diameter,
            });
            regions.push({
              kind: 'person',
              id: input.spouseId,
              x: 0,
              y: -radius,
              width: radius,
              height: diameter,
            });
          } else {
            const sign = ctx.direction === 'up' ? -1 : 1;
            regions.push({
              kind: 'person',
              id: input.indiId,
              x: -radius,
              y: sign === 1 ? -radius : 0,
              width: diameter,
              height: radius,
            });
            regions.push({
              kind: 'person',
              id: input.spouseId,
              x: -radius,
              y: sign === 1 ? 0 : -radius,
              width: diameter,
              height: radius,
            });
          }
        } else {
          const singleId = input.indiId ?? input.spouseId;
          if (singleId) {
            regions.push({
              kind: 'person',
              id: singleId,
              x: -radius,
              y: -radius,
              width: diameter,
              height: diameter,
            });
          }
        }

        map.set(input.nodeId, {
          extents: {
            alongBefore: halfAlong,
            alongAfter: halfAlong,
            acrossBefore: halfAcross,
            acrossAfter: halfAcross,
          },
          anchors: {
            indiParents: { along: 0, across: 0 },
            spouseParents: { along: 0, across: 0 },
            children: { along: 0, across: 0 },
          },
          expanderAnchors: {
            indiParents: {
              along: -halfAlong,
              across: personCount >= 2 ? -radius / 3 : 0,
            },
            spouseParents: {
              along: -halfAlong,
              across: personCount >= 2 ? radius / 3 : 0,
            },
            children: {
              along: halfAlong,
              across: 0,
            },
          },
          regions,
        });
      }

      return map;
    },

    drawNode(
      group: SVGGElement,
      node: LayoutNode,
      ctx: { direction: Direction; theme: TTheme; helpers: DrawHelpers },
    ): void {
      const doc = group.ownerDocument;
      const t = mergeCircleTheme(ctx.theme);
      const hasIndi = node.indiId !== undefined;
      const hasSpouse = node.spouseId !== undefined;
      const personCount = (hasIndi ? 1 : 0) + (hasSpouse ? 1 : 0);
      const diameter = personCount >= 2 ? t.coupleDiameter : t.singleDiameter;
      const radius = diameter / 2;
      const maxLabelWidth = Math.max(20, diameter - 16);

      const wrapper = doc.createElementNS(SVG_NS, 'g');
      wrapper.setAttribute('class', namespace);
      group.appendChild(wrapper);

      // Opaque underlay circle centered at (0, 0)
      const underlay = doc.createElementNS(SVG_NS, 'circle');
      underlay.setAttribute('class', 'underlay');
      underlay.setAttribute('cx', '0');
      underlay.setAttribute('cy', '0');
      underlay.setAttribute('r', String(radius));
      wrapper.appendChild(underlay);

      const appendFittedLabel = (
        parent: SVGGElement,
        personId: string,
        yOffset: number,
      ) => {
        const text = labelFn(graph.getPerson(personId), personId);
        if (!text) return;
        const textEl = doc.createElementNS(SVG_NS, 'text');
        textEl.setAttribute('class', 'name');
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('transform', `translate(0, ${yOffset})`);
        const approxW = text.length * t.circleFontSize * 0.62;
        if (approxW > maxLabelWidth) {
          textEl.setAttribute('textLength', String(maxLabelWidth));
          textEl.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        }
        textEl.textContent = text;
        parent.appendChild(textEl);
      };

      const frameElement = (
        tag: 'circle' | 'path',
        attributes: Record<string, string | number>,
      ): SVGElement => {
        const frame = doc.createElementNS(SVG_NS, tag);
        frame.setAttribute('class', 'frame');
        for (const [name, value] of Object.entries(attributes)) {
          frame.setAttribute(name, String(value));
        }
        return frame;
      };

      if (personCount >= 2 && node.indiId && node.spouseId) {
        // Top semicircle for indi
        const topG = doc.createElementNS(SVG_NS, 'g');
        const topPath = doc.createElementNS(SVG_NS, 'path');
        topPath.setAttribute('class', 'background');
        topPath.setAttribute(
          'd',
          `M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0 Z`,
        );
        topG.appendChild(topPath);
        appendFittedLabel(topG, node.indiId, -4);
        wrapper.appendChild(topG);
        ctx.helpers.markPerson(topG, node.indiId);

        // Bottom semicircle for spouse
        const botG = doc.createElementNS(SVG_NS, 'g');
        const botPath = doc.createElementNS(SVG_NS, 'path');
        botPath.setAttribute('class', 'background');
        botPath.setAttribute(
          'd',
          `M ${-radius} 0 A ${radius} ${radius} 0 0 0 ${radius} 0 Z`,
        );
        botG.appendChild(botPath);
        appendFittedLabel(botG, node.spouseId, 14);
        wrapper.appendChild(botG);
        ctx.helpers.markPerson(botG, node.spouseId);

        if (t.colorTarget === 'frame') {
          // Style schemes colour the border: each person has a half of it,
          // inside the group that carries the classes of the person.
          topG.appendChild(
            frameElement('path', {
              d: `M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`,
            }),
          );
          botG.appendChild(
            frameElement('path', {
              d: `M ${-radius} 0 A ${radius} ${radius} 0 0 0 ${radius} 0`,
            }),
          );
        } else {
          // One border for the couple, on top of both halves. Rules of
          // style schemes for `.frame` (the dashes of `quayScheme`) do not
          // reach it; they need the colour target `frame`.
          wrapper.appendChild(
            frameElement('circle', { cx: 0, cy: 0, r: radius }),
          );
        }
      } else {
        const singleId = node.indiId ?? node.spouseId;
        const pGroup = doc.createElementNS(SVG_NS, 'g');
        const bg = doc.createElementNS(SVG_NS, 'circle');
        bg.setAttribute('class', 'background');
        bg.setAttribute('cx', '0');
        bg.setAttribute('cy', '0');
        bg.setAttribute('r', String(radius));
        pGroup.appendChild(bg);
        if (singleId) {
          appendFittedLabel(pGroup, singleId, 4);
          ctx.helpers.markPerson(pGroup, singleId);
        }
        // The border is part of the person, on top of everything else.
        pGroup.appendChild(frameElement('circle', { cx: 0, cy: 0, r: radius }));
        wrapper.appendChild(pGroup);
      }
    },
  };
}
