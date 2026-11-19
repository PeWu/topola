import type { NodePlugin } from '../core/index.js';
import {
  formatDateOrRange,
  type FamilyRecord,
  type ModelDataInput,
  type ModelGraph,
  type PersonRecord,
} from '../model/index.js';
import { toModelGraph } from '../model/internal.js';
import {
  createCoupleAssembler,
  createTextBox,
  type BadgeLine,
  type BoxContent,
  type ContentFunction,
  type FamilyBoxContext,
  type PersonBoxContext,
  type SymbolLine,
  type TextBoxSpecificTheme,
  type TextBoxTheme,
} from '../toolkit/index.js';

const SEX_SYMBOLS: Readonly<Record<string, string>> = {
  F: '\u2640',
  M: '\u2642',
};

export interface DetailedPersonContext extends PersonBoxContext {
  person: PersonRecord | undefined;
}

export interface DetailedFamilyContext extends FamilyBoxContext {
  family: FamilyRecord | undefined;
}

export type HidePersonBadgePredicate =
  | boolean
  | ((person: PersonRecord) => boolean);

export interface DetailedNodePluginOptions {
  model: ModelDataInput | ModelGraph;
  locale?: string | undefined;
  hideId?: HidePersonBadgePredicate | undefined;
  hideSex?: HidePersonBadgePredicate | undefined;
  personContent?: ContentFunction<DetailedPersonContext> | undefined;
  familyContent?: ContentFunction<DetailedFamilyContext> | undefined;
  namespace?: string | undefined;
}

export const DETAILED_PERSON_BOX_THEME: TextBoxSpecificTheme = {
  colorTarget: 'background',
  boxFill: '#ffffff',
  boxStroke: '#000000',
  boxStrokeWidth: 2,
  underlayFill: '#ffffff',
  textColor: '#000000',
  cornerRadius: 5,
  minWidth: 64,
  minHeight: 44,
  padding: { top: 6, right: 4, bottom: 6, left: 4 },
  symbolColumnWidth: 14,
  badgeGap: 12,
  imageWidth: 70,
  imageMinHeight: 90,
  roles: {
    name: {
      fontSize: 12,
      fontWeight: 'bold',
      lineHeight: 16,
      align: 'center',
    },
    details: {
      fontSize: 10,
      lineHeight: 14,
      align: 'start',
    },
    id: {
      fontSize: 10,
      fontStyle: 'italic',
      lineHeight: 14,
      align: 'start',
    },
  },
};

export const DETAILED_FAMILY_BOX_THEME: TextBoxSpecificTheme = {
  ...DETAILED_PERSON_BOX_THEME,
  minWidth: 0,
  minHeight: 0,
  padding: { top: 5, right: 4, bottom: 5, left: 4 },
  imageWidth: 0,
  imageMinHeight: 0,
};

function uncertainSuffix(confidence: number | null | undefined): string {
  return typeof confidence === 'number' && Math.floor(confidence) <= 1
    ? ' ?'
    : '';
}

function resolveHidePredicate(
  person: ModelDataInput['indis'][number] | undefined,
  recordFlag: boolean | undefined,
  optionPredicate: HidePersonBadgePredicate | undefined,
): boolean {
  if (recordFlag) return true;
  if (typeof optionPredicate === 'function') {
    return person ? optionPredicate(person as PersonRecord) : false;
  }
  return Boolean(optionPredicate);
}

/**
 * The content of a person box of the Detailed look: the first name, the surname
 * (with the maiden name in parentheses if it differs), date and place of birth
 * (`*`) and of death (`+`), the id and the symbol of the sex as badges, and the
 * first image. A date whose confidence is 1 or lower gets a `?`. A confirmed
 * death without date and place shows as a `+` alone.
 *
 * Dates are written for `locale`. `hideId` and `hideSex` hide a badge, for
 * everyone or for the persons a function picks; the `hideId` and `hideSex` of a
 * person record hide it as well.
 */
export function detailedPersonContent(
  ctx: Omit<DetailedPersonContext, 'person'> & {
    person: ModelDataInput['indis'][number] | undefined;
  },
  options?: {
    locale?: string | undefined;
    hideId?: HidePersonBadgePredicate | undefined;
    hideSex?: HidePersonBadgePredicate | undefined;
  },
): BoxContent {
  const { person, personId } = ctx;
  const locale = options?.locale;

  const firstName = person?.firstName ?? '';
  const lastName = person?.lastName ?? '';
  const maidenName = person?.maidenName ?? '';
  const surnameLine =
    lastName && maidenName && lastName !== maidenName
      ? `${lastName} (${maidenName})`
      : lastName || maidenName;

  const symbolLines: SymbolLine[] = [];

  // Birth lines
  const rawBirthDate = person?.birth
    ? formatDateOrRange(person.birth, locale)
    : '';
  const birthDate = rawBirthDate
    ? rawBirthDate + uncertainSuffix(person?.birth?.confidence)
    : '';
  const birthPlace = person?.birth?.place ?? '';

  if (birthDate) {
    symbolLines.push({ role: 'details', symbol: '', text: birthDate });
  }
  if (birthPlace) {
    symbolLines.push({ role: 'details', symbol: '', text: birthPlace });
  }
  if ((birthDate || birthPlace) && symbolLines[0]) {
    symbolLines[0].symbol = '*';
  }

  // Death lines
  const deathStartIdx = symbolLines.length;
  const rawDeathDate = person?.death
    ? formatDateOrRange(person.death, locale)
    : '';
  const deathDate = rawDeathDate
    ? rawDeathDate + uncertainSuffix(person?.death?.confidence)
    : '';
  const deathPlace = person?.death?.place ?? '';

  if (deathDate) {
    symbolLines.push({ role: 'details', symbol: '', text: deathDate });
  }
  if (deathPlace) {
    symbolLines.push({ role: 'details', symbol: '', text: deathPlace });
  }
  if (deathDate || deathPlace) {
    const firstDeath = symbolLines[deathStartIdx];
    if (firstDeath) firstDeath.symbol = '+';
  } else if (person?.death?.confirmed) {
    symbolLines.push({ role: 'details', symbol: '+', text: '' });
  }

  // Bottom-corner badges (id + sex)
  const badges: BadgeLine[] = [];
  const hideId = resolveHidePredicate(person, person?.hideId, options?.hideId);
  const hideSex = resolveHidePredicate(
    person,
    person?.hideSex,
    options?.hideSex,
  );

  if (!hideId && personId) {
    badges.push({ role: 'id', position: 'left', text: personId });
  }
  if (!hideSex && person?.sex) {
    // `sex` is free text: only the keys of the table itself count.
    const sym = Object.hasOwn(SEX_SYMBOLS, person.sex)
      ? SEX_SYMBOLS[person.sex]
      : undefined;
    if (sym) {
      badges.push({ role: 'details', position: 'right', text: sym });
    }
  }

  const imageUrl = person?.images?.[0]?.url;

  return {
    lines: [
      { role: 'name', text: firstName },
      { role: 'name', text: surnameLine },
    ],
    symbolLines,
    badges,
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  };
}

/**
 * The content of a marriage box of the Detailed look: date and place of the
 * marriage (`⚭`), with the date written for `locale`. A family without either
 * has no content, and the Detailed look draws no box for it.
 */
export function detailedFamilyContent(
  ctx: Omit<DetailedFamilyContext, 'family'> & {
    family: ModelDataInput['fams'][number] | undefined;
  },
  options?: { locale?: string | undefined },
): BoxContent {
  const { family } = ctx;
  const locale = options?.locale;

  const symbolLines: SymbolLine[] = [];
  const rawMarriageDate = family?.marriage
    ? formatDateOrRange(family.marriage, locale)
    : '';
  const marriageDate = rawMarriageDate
    ? rawMarriageDate + uncertainSuffix(family?.marriage?.confidence)
    : '';
  const marriagePlace = family?.marriage?.place ?? '';

  if (marriageDate) {
    symbolLines.push({ role: 'details', symbol: '', text: marriageDate });
  }
  if (marriagePlace) {
    symbolLines.push({ role: 'details', symbol: '', text: marriagePlace });
  }
  if ((marriageDate || marriagePlace) && symbolLines[0]) {
    symbolLines[0].symbol = '\u26AD';
  }

  return { symbolLines };
}

/**
 * Creates the node plug-in of the Detailed look: a text box for every person
 * with names, dates and places, badges and a picture, and a marriage box with
 * date and place of the marriage.
 *
 * `personContent` and `familyContent` replace what the boxes show. The defaults
 * are `detailedPersonContent` and `detailedFamilyContent`; `locale`, `hideId`
 * and `hideSex` apply to the defaults only. `namespace` is the class of the
 * boxes, `detailed` by default.
 */
export function createDetailedNodePlugin(
  options: DetailedNodePluginOptions,
): NodePlugin<TextBoxTheme> {
  const graph = toModelGraph(options.model);
  const namespace = options.namespace ?? 'detailed';

  const personFn: ContentFunction<DetailedPersonContext> =
    options.personContent ??
    ((ctx) =>
      detailedPersonContent(ctx, {
        locale: options.locale,
        hideId: options.hideId,
        hideSex: options.hideSex,
      }));

  const familyFn: ContentFunction<DetailedFamilyContext> =
    options.familyContent ??
    ((ctx) => detailedFamilyContent(ctx, { locale: options.locale }));

  const personBox = createTextBox<PersonBoxContext, TextBoxTheme>({
    namespace,
    defaultTheme: DETAILED_PERSON_BOX_THEME,
    content: (boxCtx) =>
      personFn({
        ...boxCtx,
        person: graph.getPerson(boxCtx.personId),
      }),
  });

  const familyBox = createTextBox<FamilyBoxContext, TextBoxTheme>({
    namespace,
    defaultTheme: DETAILED_FAMILY_BOX_THEME,
    suppressWhenEmpty: true,
    content: (boxCtx) =>
      familyFn({
        ...boxCtx,
        family: graph.getFamily(boxCtx.familyId),
      }),
  });

  return createCoupleAssembler<TextBoxTheme>({
    personBox,
    familyBox,
  });
}
