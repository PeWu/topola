import type { NodePlugin } from '../core/index.js';
import type {
  ModelDataInput,
  ModelGraph,
  PersonRecord,
} from '../model/index.js';
import { toModelGraph } from '../model/internal.js';
import {
  createCoupleAssembler,
  createTextBox,
  type BoxContent,
  type ContentFunction,
  type PersonBoxContext,
  type TextBoxSpecificTheme,
  type TextBoxTheme,
  type TextLine,
} from '../toolkit/index.js';

export interface SimplePersonContext extends PersonBoxContext {
  person: PersonRecord | undefined;
}

export interface SimpleNodePluginOptions {
  model: ModelDataInput | ModelGraph;
  content?: ContentFunction<SimplePersonContext> | undefined;
  namespace?: string | undefined;
}

export const SIMPLE_BOX_THEME: TextBoxSpecificTheme = {
  colorTarget: 'background',
  boxFill: '#ffffff',
  boxStroke: '#000000',
  boxStrokeWidth: 1,
  underlayFill: '#ffffff',
  textColor: '#000000',
  cornerRadius: 0,
  minWidth: 50,
  minHeight: 27,
  padding: { top: 6, right: 4, bottom: 7, left: 4 },
  symbolColumnWidth: 14,
  badgeGap: 12,
  imageWidth: 0,
  imageMinHeight: 0,
  roles: {
    name: {
      fontSize: 12,
      fontWeight: 'bold',
      lineHeight: 14,
      align: 'center',
    },
    details: {
      fontSize: 12,
      lineHeight: 14,
      align: 'center',
    },
  },
};

/**
 * The content of a box of the Simple look: the first and last name and, if a
 * year of birth or death is known, a line with the years (`1900 – 1980`).
 */
export function simpleContent(
  ctx: Omit<SimplePersonContext, 'person'> & {
    person: ModelDataInput['indis'][number] | undefined;
  },
): BoxContent {
  const { person } = ctx;
  const name = [person?.firstName, person?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const birthYear = person?.birth?.date?.year;
  const deathYear = person?.death?.date?.year;
  const hasBirth = typeof birthYear === 'number' && Number.isFinite(birthYear);
  const hasDeath = typeof deathYear === 'number' && Number.isFinite(deathYear);
  const years =
    hasBirth || hasDeath
      ? `${hasBirth ? birthYear : ''} \u2013 ${hasDeath ? deathYear : ''}`
      : '';

  const lines: TextLine[] = [{ role: 'name', text: name }];
  if (years) {
    lines.push({ role: 'details', text: years });
  }

  return { lines };
}

/**
 * Creates the node plug-in of the Simple look: a small text box for every
 * person, and no marriage boxes.
 *
 * `content` replaces what the boxes show (the default is `simpleContent`).
 * `namespace` is the class of the boxes, `simple` by default.
 */
export function createSimpleNodePlugin(
  options: SimpleNodePluginOptions,
): NodePlugin<TextBoxTheme> {
  const graph = toModelGraph(options.model);
  const userContent = options.content ?? simpleContent;
  const namespace = options.namespace ?? 'simple';

  const personBox = createTextBox<PersonBoxContext, TextBoxTheme>({
    namespace,
    defaultTheme: SIMPLE_BOX_THEME,
    content: (boxCtx) =>
      userContent({
        ...boxCtx,
        person: graph.getPerson(boxCtx.personId),
      }),
  });

  return createCoupleAssembler<TextBoxTheme>({
    personBox,
  });
}
