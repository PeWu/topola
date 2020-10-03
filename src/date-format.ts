import { Date as GedcomDate, DateOrRange } from './data';

/** Translations of the GEDCOM date qualifiers. */
const QUALIFIERS_I18N: Map<string, Map<string, string>> = new Map([
  [
    'de',
    new Map([
      ['cal', 'errech.'],
      ['abt', 'etwa'],
      ['est', 'geschät.'],
      ['before', 'vor'],
      ['after', 'nach'],
    ]),
  ],
  [
    'fr',
    new Map([
      ['cal', 'calc.'],
      ['abt', 'vers'],
      ['est', 'est.'],
      ['before', 'avant'],
      ['after', 'après'],
    ]),
  ],
  [
    'it',
    new Map([
      ['cal', 'calc.'],
      ['abt', 'circa il'],
      ['est', 'stim.'],
      ['before', 'prima del'],
      ['after', 'dopo del'],
    ]),
  ],
  [
    'pl',
    new Map([
      ['cal', 'wyl.'],
      ['abt', 'ok.'],
      ['est', 'szac.'],
      ['before', 'przed'],
      ['after', 'po'],
    ]),
  ],
  [
    'ru',
    new Map([
      ['cal', 'выч.'],
      ['abt', 'ок.'],
      ['est', 'оцен.'],
      ['before', 'до'],
      ['after', 'после'],
    ]),
  ],
]);

function getQualifier(qualifier: string, locale: string | undefined) {
  const language = locale && locale.split(/[-_]/)[0];
  const languageMap = language && QUALIFIERS_I18N.get(language);
  return languageMap ? languageMap.get(qualifier) : qualifier;
}

/**
 * Formats the date consisting of day, month and year.
 * All parts of the date are optional.
 */
function formatDateOnly(
  day?: number,
  month?: number,
  year?: number,
  locale?: string
): string {
  if (!day && !month && !year) {
    return '';
  }
  const format = {
    day: day ? 'numeric' : undefined,
    month: month ? 'short' : undefined,
    year: year ? 'numeric' : undefined,
  };
  return new Intl.DateTimeFormat(locale, format).format(
    new Date(year ?? 2000, month ? month - 1 : 1, day ?? 1)
  );
}

/** Simple date formatter. */
export function formatDate(date: GedcomDate, locale?: string): string {
  return [
    date.qualifier && getQualifier(date.qualifier, locale),
    formatDateOnly(date.day, date.month, date.year, locale),
    date.text,
  ].join(' ');
}

/** Formats a DateOrRange object. */
export function formatDateOrRange(
  dateOrRange: DateOrRange,
  locale?: string
): string {
  if (dateOrRange.date) {
    return formatDate(dateOrRange.date, locale);
  }
  if (!dateOrRange.dateRange) {
    return '';
  }
  const from =
    dateOrRange.dateRange.from && formatDate(dateOrRange.dateRange.from);
  const to = dateOrRange.dateRange.to && formatDate(dateOrRange.dateRange.to);
  if (from && to) {
    return `${from} .. ${to}`;
  }
  if (from) {
    return `${getQualifier('after', locale)} ${from}`;
  }
  if (to) {
    return `${getQualifier('before', locale)} ${to}`;
  }
  return '';
}
