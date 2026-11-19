import type { StyleScheme, TwoToneColor } from '../core/index.js';
import {
  computeConfidenceMap,
  type ModelDataInput,
  type ModelGraph,
} from '../model/index.js';
import { toModelGraph } from '../model/internal.js';

export const GENERATION_COLOR_COUNT = 12;

/**
 * The index of the colour of a generation, 0..11. A generation that is no
 * whole number counts as the one below it, and one that is no number as 0.
 */
export function generationColorIndex(generation: number): number {
  const whole = Number.isFinite(generation) ? Math.floor(generation) : 0;
  return (
    ((whole % GENERATION_COLOR_COUNT) + GENERATION_COLOR_COUNT) %
    GENERATION_COLOR_COUNT
  );
}

/** Returns the default palette with the overrides that are given. */
function mergePalette(
  defaults: Readonly<Record<string, TwoToneColor>>,
  overrides: Partial<Record<string, TwoToneColor>> | undefined,
): Record<string, TwoToneColor> {
  const merged: Record<string, TwoToneColor> = { ...defaults };
  if (overrides && typeof overrides === 'object') {
    for (const [key, color] of Object.entries(overrides)) {
      if (color && key !== '__proto__') merged[key] = color;
    }
  }
  return merged;
}

export const DEFAULT_SEX_PALETTE: Readonly<Record<string, TwoToneColor>> = {
  male: { fill: '#dbffff', accent: '#1565c0' },
  female: { fill: '#ffdbed', accent: '#ad1457' },
  unknown: { fill: '#eeeeee', accent: '#666666' },
  'sex-family': { fill: '#eeeeee', accent: '#000000' },
};

export const DEFAULT_GENERATION_PALETTE: Readonly<
  Record<string, TwoToneColor>
> = {
  'gen-0': { fill: '#ffffdd', accent: '#8d6e00' },
  'gen-1': { fill: '#edffdb', accent: '#4e8a10' },
  'gen-2': { fill: '#dbffdb', accent: '#1b7e26' },
  'gen-3': { fill: '#dbffed', accent: '#0d7a5f' },
  'gen-4': { fill: '#dbffff', accent: '#00768f' },
  'gen-5': { fill: '#dbedff', accent: '#155fa0' },
  'gen-6': { fill: '#dbdbff', accent: '#3949ab' },
  'gen-7': { fill: '#eddbff', accent: '#6a1b9a' },
  'gen-8': { fill: '#ffdbff', accent: '#9c1484' },
  'gen-9': { fill: '#ffdbed', accent: '#b0145a' },
  'gen-10': { fill: '#ffdbdb', accent: '#b71c1c' },
  'gen-11': { fill: '#ffeddb', accent: '#bf5600' },
};

export interface SexSchemeOptions {
  model: ModelDataInput | ModelGraph;
  palette?: Partial<Record<string, TwoToneColor>> | undefined;
}

function isSexSchemeOptions(
  value: ModelDataInput | ModelGraph | SexSchemeOptions,
): value is SexSchemeOptions {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    'model' in value &&
    !('indis' in value) &&
    typeof (value as { hasPerson?: unknown }).hasPerson !== 'function'
  );
}

/**
 * Classifies person regions by `PersonRecord.sex` ('male', 'female', 'unknown')
 * with a two-tone palette, plus neutral `#eeeeee` marriage-box fill when
 * `colorTarget === 'background'`.
 */
export function sexScheme(
  modelOrOptions: ModelDataInput | ModelGraph | SexSchemeOptions,
  paletteOverrides?: Partial<Record<string, TwoToneColor>>,
): StyleScheme {
  const isOpts = isSexSchemeOptions(modelOrOptions);
  const rawModel = isOpts ? modelOrOptions.model : modelOrOptions;
  const overrides = isOpts ? modelOrOptions.palette : paletteOverrides;

  const graph = toModelGraph(rawModel);
  const mergedPalette = mergePalette(DEFAULT_SEX_PALETTE, overrides);

  return {
    id: 'sex',
    palette: mergedPalette,
    classifyPerson({ personId }) {
      const sex = graph.getPerson(personId)?.sex;
      if (sex === 'M') return 'male';
      if (sex === 'F') return 'female';
      return 'unknown';
    },
    classifyFamily() {
      return 'sex-family';
    },
  };
}

/**
 * Classifies both person and family regions by cycling generation index
 * `((g % 12) + 12) % 12` into `'gen-0'`..`'gen-11'` with a 12-entry two-tone palette.
 */
export function generationScheme(
  paletteOverrides?: Partial<Record<string, TwoToneColor>>,
): StyleScheme {
  const mergedPalette = mergePalette(
    DEFAULT_GENERATION_PALETTE,
    paletteOverrides,
  );

  return {
    id: 'generation',
    palette: mergedPalette,
    classifyPerson({ generation }) {
      return `gen-${generationColorIndex(generation)}`;
    },
    classifyFamily({ generation }) {
      return `gen-${generationColorIndex(generation)}`;
    },
  };
}

/**
 * The token of a confidence. Like `computeConfidenceMap`, it takes any
 * number: 2.5 counts as 2, a negative one as 0; above 3 there is no token.
 */
function formatQuayToken(value: number | null | undefined): string | undefined {
  if (value == null || Number.isNaN(value)) {
    return undefined;
  }
  const level = Math.max(0, Math.floor(value));
  return level <= 3 ? `quay-${level}` : undefined;
}

/**
 * Classifies person regions via propagated `computeConfidenceMap`, family
 * regions via `family.marriage?.confidence`, and parent-child links via local
 * `child.parentLinkConfidence ?? child.confidence` into `'quay-0'`..`'quay-3'`,
 * emitting scoped dashed-border, dashed-link, and `.background` `fill-opacity` rules.
 *
 * The scheme reads the confidences when a chart first asks for a start
 * person and keeps what it has found; create a new scheme when they change.
 */
export function quayScheme(model: ModelDataInput | ModelGraph): StyleScheme {
  const graph = toModelGraph(model);

  let cachedStartIndi: string | null = null;
  let cachedConfMap: Map<string, number> | null = null;
  // The people found to have no rated relative. In data without any QUAY
  // that is everybody, and a new start person costs one lookup instead of a
  // walk over the whole tree.
  const unrated = new Set<string>();

  const getConfMap = (startIndi: string): Map<string, number> => {
    if (cachedStartIndi === startIndi && cachedConfMap) {
      return cachedConfMap;
    }
    cachedStartIndi = startIndi;
    cachedConfMap = computeConfidenceMap(graph, startIndi, unrated);
    return cachedConfMap;
  };

  return {
    id: 'quay',
    classifyPerson({ personId, viewState }) {
      const conf = getConfMap(viewState.startIndi).get(personId);
      return formatQuayToken(conf);
    },
    classifyFamily({ familyId }) {
      const conf = graph.getFamily(familyId)?.marriage?.confidence;
      return formatQuayToken(conf);
    },
    classifyLink({ link }) {
      if (link.kind !== 'parentChild' || !link.childIndiId) {
        return undefined;
      }
      const child = graph.getPerson(link.childIndiId);
      const parentConf = child?.parentLinkConfidence;
      const conf =
        parentConf != null && !Number.isNaN(parentConf)
          ? parentConf
          : child?.confidence;
      return formatQuayToken(conf);
    },
    getCss(scopeSelector: string): string {
      return [
        `${scopeSelector} .quay-2 .frame { stroke-dasharray: 8 4; }`,
        `${scopeSelector} .quay-1 .frame { stroke-dasharray: 3 3; }`,
        `${scopeSelector} .quay-0 .frame { stroke-dasharray: 1 3; }`,
        `${scopeSelector} .quay-1 .background { fill-opacity: 0.6; }`,
        `${scopeSelector} .quay-0 .background { fill-opacity: 0.35; }`,
        `${scopeSelector} .link.quay-2 { stroke-dasharray: 8 4; }`,
        `${scopeSelector} .link.quay-1 { stroke-dasharray: 3 3; }`,
        `${scopeSelector} .link.quay-0 { stroke-dasharray: 2 4; }`,
      ].join('\n');
    },
  };
}
