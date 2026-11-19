import {
  isHorizontalDirection,
  type AnimationHelpers,
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
import { screenSizeToAbstract } from '../core/internal.js';
import type { BoxPlugin } from './text-box.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Ties the group of a box to the region it was drawn for. */
const REGION_ATTRIBUTE = 'data-topola-region';
const regionKey = (region: Region): string => `${region.kind}:${region.id}`;

export interface PersonBoxContext {
  personId: string;
  nodeId: string;
  generation: number;
  isRoot: boolean;
}

export interface FamilyBoxContext {
  familyId: string;
  nodeId: string;
  generation: number;
  isRoot: boolean;
}

/**
 * Returns the rules of CSS that is a plain list of rules, each without the
 * white space or top-level comments around it, or nothing if the CSS has
 * anything else (an at-rule, nested blocks, or an unclosed comment/string).
 */
function splitPlainRules(css: string): string[] | undefined {
  const rules: string[] = [];
  let depth = 0;
  let ruleStart = -1;
  let i = 0;
  while (i < css.length) {
    const ch = css[i]!;
    if (depth === 0 && ruleStart === -1 && /\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) return undefined;
      i = end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (depth === 0 && ruleStart === -1) {
        ruleStart = i;
      }
      i++;
      let closed = false;
      while (i < css.length) {
        const sc = css[i]!;
        if (sc === '\\') {
          i += 2;
          continue;
        }
        if (sc === '\n' || sc === '\r') return undefined;
        if (sc === ch) {
          closed = true;
          i++;
          break;
        }
        i++;
      }
      if (!closed) return undefined;
      continue;
    }
    if (ch === '@') return undefined;
    if (ch === '{') {
      if (depth !== 0 || ruleStart === -1) return undefined;
      depth = 1;
      i++;
      continue;
    }
    if (ch === '}') {
      if (depth !== 1) return undefined;
      depth = 0;
      rules.push(css.slice(ruleStart, i + 1).trim());
      ruleStart = -1;
      i++;
      continue;
    }
    if (depth === 0 && ruleStart === -1) {
      ruleStart = i;
    }
    i++;
  }
  if (depth !== 0 || ruleStart !== -1) return undefined;
  return rules;
}

export interface CoupleAssemblerOptions<TTheme extends CoreTheme = CoreTheme> {
  personBox: BoxPlugin<PersonBoxContext, TTheme>;
  /**
   * The box of the marriage. With the namespace of the person box it is
   * drawn into the same group, and its CSS rules follow those of the person
   * box (a rule that both boxes have is written once). The selectors of the
   * two are then the same, so a rule of the family box applies to the person
   * boxes too, and wins: give the boxes the same rule for a selector they
   * share, or different namespaces.
   */
  familyBox?: BoxPlugin<FamilyBoxContext, TTheme> | undefined;
  /**
   * Defaults for theme fields shared by the node, e.g. the fields a custom
   * box adds. (The defaults of a text box belong to that box alone and are
   * not shared.)
   */
  defaultTheme?: Partial<TTheme> | undefined;
}

/**
 * Combines a person BoxPlugin and an optional family BoxPlugin into a full
 * NodePlugin: equalizes person-box `alongBefore` per `rowId`, arranges spouses
 * and marriage boxes around seam `(0, 0)`, computes outer-perimeter link
 * anchors, emits regions, and wires `helpers.markPerson` / `markFamily`.
 */
export function createCoupleAssembler<TTheme extends CoreTheme = CoreTheme>(
  options: CoupleAssemblerOptions<TTheme>,
): NodePlugin<TTheme> {
  const { personBox, familyBox } = options;

  return {
    defaultTheme: options.defaultTheme,

    getCss(
      scopeSelector: string,
      theme: TTheme,
      schemes: readonly StyleScheme[],
    ): string {
      const personCss = personBox.getCss(scopeSelector, theme, schemes);
      if (!familyBox) return personCss;
      const familyCss = familyBox.getCss(scopeSelector, theme, schemes);
      if (familyBox.namespace !== personBox.namespace) {
        return [personCss, familyCss].filter(Boolean).join('\n');
      }
      // Boxes that share a namespace share most rules: add those the family
      // box has on top (its own roles and colours). Whole rules are
      // compared, however the boxes break them into lines.
      const personRules = splitPlainRules(personCss);
      const familyRules = splitPlainRules(familyCss);
      if (!personRules || !familyRules) {
        // More than plain rules: nothing is left out. A rule that is there
        // twice does no harm.
        return [personCss, familyCss].filter(Boolean).join('\n');
      }
      const known = new Set(personRules);
      const ownRules = familyRules.filter((rule) => !known.has(rule));
      return [personCss, ...ownRules].filter(Boolean).join('\n');
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
      interface RawSubDims {
        indi?: { along: number; across: number } | undefined;
        spouse?: { along: number; across: number } | undefined;
        family?: { along: number; across: number } | undefined;
      }

      const rawMap = new Map<string, RawSubDims>();
      const maxPersonAlongPerRow = new Map<string, number>();

      // Pass 1: measure individual sub-boxes and collect max person `along` per rowId
      for (const input of nodes) {
        const sub: RawSubDims = {};
        let nodePersonMaxAlong = 0;

        if (input.indiId !== undefined) {
          const sz = personBox.measureBox(
            {
              personId: input.indiId,
              nodeId: input.nodeId,
              generation: input.generation,
              isRoot: input.isRoot,
            },
            ctx,
          );
          const abs = screenSizeToAbstract(sz.width, sz.height, ctx.direction);
          sub.indi = abs;
          if (abs.along > nodePersonMaxAlong) nodePersonMaxAlong = abs.along;
        }

        if (input.spouseId !== undefined) {
          const sz = personBox.measureBox(
            {
              personId: input.spouseId,
              nodeId: input.nodeId,
              generation: input.generation,
              isRoot: input.isRoot,
            },
            ctx,
          );
          const abs = screenSizeToAbstract(sz.width, sz.height, ctx.direction);
          sub.spouse = abs;
          if (abs.along > nodePersonMaxAlong) nodePersonMaxAlong = abs.along;
        }

        if (familyBox && input.familyId !== undefined) {
          const sz = familyBox.measureBox(
            {
              familyId: input.familyId,
              nodeId: input.nodeId,
              generation: input.generation,
              isRoot: input.isRoot,
            },
            ctx,
          );
          if (sz.width > 0 && sz.height > 0) {
            sub.family = screenSizeToAbstract(
              sz.width,
              sz.height,
              ctx.direction,
            );
          }
        }

        rawMap.set(input.nodeId, sub);
        const prevRowMax = maxPersonAlongPerRow.get(input.rowId) ?? 0;
        if (nodePersonMaxAlong > prevRowMax) {
          maxPersonAlongPerRow.set(input.rowId, nodePersonMaxAlong);
        }
      }

      // Pass 2: assemble around seam (0, 0) using row-equalized person `alongBefore`
      const result = new Map<string, MeasuredNode>();
      const isHoriz = isHorizontalDirection(ctx.direction);

      for (const input of nodes) {
        const sub = rawMap.get(input.nodeId)!;
        const hasAnyPerson = Boolean(sub.indi || sub.spouse);
        const personAlong = hasAnyPerson
          ? (maxPersonAlongPerRow.get(input.rowId) ?? 0)
          : 0;
        const famAlong = sub.family?.along ?? 0;
        const famAcross = sub.family?.across ?? 0;
        const hasFam = famAlong > 0 && famAcross > 0;

        const regions: Region[] = [];

        if (sub.indi && sub.spouse) {
          const ai = sub.indi.across;
          const as = sub.spouse.across;

          let famAcrossStart = 0;
          if (hasFam) {
            if (isHoriz) {
              // In horizontal mode, center marriage box on the couple seam (0)
              famAcrossStart = -famAcross / 2;
            } else if (ai + as <= famAcross) {
              famAcrossStart = -ai - (famAcross - ai - as) / 2;
            } else {
              famAcrossStart = Math.max(
                -ai,
                Math.min(-famAcross / 2, as - famAcross),
              );
            }
          }

          const acrossBefore = Math.max(ai, hasFam ? -famAcrossStart : 0);
          const acrossAfter = Math.max(
            as,
            hasFam ? famAcrossStart + famAcross : 0,
          );

          regions.push({
            kind: 'person',
            id: input.indiId!,
            x: -ai,
            y: -personAlong,
            width: ai,
            height: personAlong,
          });
          regions.push({
            kind: 'person',
            id: input.spouseId!,
            x: 0,
            y: -personAlong,
            width: as,
            height: personAlong,
          });
          if (hasFam && input.familyId !== undefined) {
            regions.push({
              kind: 'family',
              id: input.familyId,
              x: famAcrossStart,
              y: 0,
              width: famAcross,
              height: famAlong,
            });
          }

          result.set(input.nodeId, {
            extents: {
              alongBefore: personAlong,
              alongAfter: famAlong,
              acrossBefore,
              acrossAfter,
            },
            anchors: {
              indiParents: { along: -personAlong, across: -ai / 2 },
              spouseParents: { along: -personAlong, across: as / 2 },
              children: { along: famAlong, across: 0 },
            },
            regions,
          });
        } else {
          // Single person (indi-only or spouse-only) or parentless node: centered on across = 0
          const singlePerson = sub.indi ?? sub.spouse;
          const singlePersonId =
            sub.indi !== undefined ? input.indiId : input.spouseId;
          const singleAcross = singlePerson?.across ?? 0;
          const halfAcross = Math.max(singleAcross, hasFam ? famAcross : 0) / 2;

          if (singlePerson && singlePersonId !== undefined) {
            regions.push({
              kind: 'person',
              id: singlePersonId,
              x: -singleAcross / 2,
              y: -personAlong,
              width: singleAcross,
              height: personAlong,
            });
          }
          if (hasFam && input.familyId !== undefined) {
            regions.push({
              kind: 'family',
              id: input.familyId,
              x: -famAcross / 2,
              y: 0,
              width: famAcross,
              height: famAlong,
            });
          }

          result.set(input.nodeId, {
            extents: {
              alongBefore: personAlong,
              alongAfter: famAlong,
              acrossBefore: halfAcross,
              acrossAfter: halfAcross,
            },
            anchors: {
              indiParents: { along: -personAlong, across: 0 },
              spouseParents: { along: -personAlong, across: 0 },
              children: { along: famAlong, across: 0 },
            },
            regions,
          });
        }
      }

      return result;
    },

    drawNode(
      group: SVGGElement,
      node: LayoutNode,
      ctx: { direction: Direction; theme: TTheme; helpers: DrawHelpers },
    ): void {
      const doc = group.ownerDocument;
      const wrapper = doc.createElementNS(SVG_NS, 'g');
      wrapper.setAttribute('class', personBox.namespace);
      group.appendChild(wrapper);

      for (const region of node.regions) {
        if (region.kind === 'person') {
          const pGroup = doc.createElementNS(SVG_NS, 'g');
          pGroup.setAttribute(REGION_ATTRIBUTE, regionKey(region));
          pGroup.setAttribute(
            'transform',
            `translate(${region.x}, ${region.y})`,
          );
          wrapper.appendChild(pGroup);
          personBox.drawBox(
            pGroup,
            {
              personId: region.id,
              nodeId: node.id,
              generation: node.generation,
              isRoot: node.isRoot,
            },
            region.width,
            region.height,
            { theme: ctx.theme },
          );
          ctx.helpers.markPerson(pGroup, region.id);
        } else if (region.kind === 'family' && familyBox) {
          const fContainer =
            familyBox.namespace === personBox.namespace
              ? wrapper
              : (() => {
                  const fw = doc.createElementNS(SVG_NS, 'g');
                  fw.setAttribute('class', familyBox.namespace);
                  group.appendChild(fw);
                  return fw;
                })();
          const fGroup = doc.createElementNS(SVG_NS, 'g');
          fGroup.setAttribute(REGION_ATTRIBUTE, regionKey(region));
          fGroup.setAttribute(
            'transform',
            `translate(${region.x}, ${region.y})`,
          );
          fContainer.appendChild(fGroup);
          familyBox.drawBox(
            fGroup,
            {
              familyId: region.id,
              nodeId: node.id,
              generation: node.generation,
              isRoot: node.isRoot,
            },
            region.width,
            region.height,
            { theme: ctx.theme },
          );
          ctx.helpers.markFamily(fGroup, region.id);
        }
      }
    },

    /**
     * Moves every box to its new place and brings it to its new size. A box
     * that cannot resize itself is drawn again inside its group.
     */
    resizeNode(
      group: SVGGElement,
      node: LayoutNode,
      ctx: { direction: Direction; theme: TTheme; animation: AnimationHelpers },
    ): void {
      // The groups of the boxes by region, in the order they were drawn. One
      // person in both places of a couple has two boxes with one key.
      const boxGroups = new Map<string | null, SVGGElement[]>();
      for (const boxGroup of Array.from(
        group.querySelectorAll<SVGGElement>(`[${REGION_ATTRIBUTE}]`),
      )) {
        const key = boxGroup.getAttribute(REGION_ATTRIBUTE);
        const groups = boxGroups.get(key) ?? [];
        groups.push(boxGroup);
        boxGroups.set(key, groups);
      }

      const resize = <TContext>(
        box: BoxPlugin<TContext, TTheme>,
        item: TContext,
        region: Region,
      ) => {
        const boxGroup = boxGroups.get(regionKey(region))?.shift();
        if (!boxGroup) return;
        ctx.animation.move(boxGroup, {
          transform: `translate(${region.x}, ${region.y})`,
        });
        if (box.resizeBox) {
          box.resizeBox(boxGroup, item, region.width, region.height, ctx);
        } else {
          while (boxGroup.firstChild) {
            boxGroup.removeChild(boxGroup.firstChild);
          }
          box.drawBox(boxGroup, item, region.width, region.height, {
            theme: ctx.theme,
          });
        }
      };

      for (const region of node.regions) {
        const item = {
          nodeId: node.id,
          generation: node.generation,
          isRoot: node.isRoot,
        };
        if (region.kind === 'person') {
          resize(personBox, { ...item, personId: region.id }, region);
        } else if (familyBox) {
          resize(familyBox, { ...item, familyId: region.id }, region);
        }
      }
    },
  };
}
