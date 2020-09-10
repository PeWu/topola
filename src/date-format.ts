import { Date as GedcomDate, DateOrRange } from './data';

/** Month in English is used as fallback if a requested translation is not found. */
/** Format: Number of Month, Name of Month (3-8 chars), Name of Month in genitive (3-8 chars). */
/** Using: with Day - 20 Jan 2020, 20 stycznia 2020, */
/**     without Day - Jan 2020, Styczeń 2020. */
const MONTHS_I18N: Map<number, Map<string, string>> = new Map([
  [
    'de',
    new Map([
      [1, 'Jan', 'Jan'],
      [2, 'Feb', 'Feb'],
      [3, 'März', 'März'],
      [4, 'Apr', 'Apr'],
      [5, 'May', 'May'],
      [6, 'Jun', 'Jun'],
      [7, 'Jul', 'Jul'],
      [8, 'Aug', 'Aug'],
      [9, 'Sep', 'Sep'],
      [10, 'Oct', 'Oct'],
      [11, 'Nov', 'Nov'],
      [12, 'Dec', 'Dec'],
    ]),
  ],
  [
    'en',
    new Map([
      [1, 'Jan', 'Jan'],
      [2, 'Feb', 'Feb'],
      [3, 'Mar', 'Mar'],
      [4, 'Apr', 'Apr'],
      [5, 'May', 'May'],
      [6, 'Jun', 'Jun'],
      [7, 'Jul', 'Jul'],
      [8, 'Aug', 'Aug'],
      [9, 'Sep', 'Sep'],
      [10, 'Oct', 'Oct'],
      [11, 'Nov', 'Nov'],
      [12, 'Dec', 'Dec'],
    ]),
  ],
  [
    'fr',
    new Map([
      [1, 'Jan', 'Jan'],
      [2, 'Feb', 'Feb'],
      [3, 'Mar', 'Mar'],
      [4, 'Apr', 'Apr'],
      [5, 'May', 'May'],
      [6, 'Jun', 'Jun'],
      [7, 'Jul', 'Jul'],
      [8, 'Aug', 'Aug'],
      [9, 'Sep', 'Sep'],
      [10, 'Oct', 'Oct'],
      [11, 'Nov', 'Nov'],
      [12, 'Dec', 'Dec'],
    ]),
  ],
  [
    'it',
    new Map([
      [1, 'Jan', 'Jan'],
      [2, 'Feb', 'Feb'],
      [3, 'Mar', 'Mar'],
      [4, 'Apr', 'Apr'],
      [5, 'May', 'May'],
      [6, 'Jun', 'Jun'],
      [7, 'Jul', 'Jul'],
      [8, 'Aug', 'Aug'],
      [9, 'Sep', 'Sep'],
      [10, 'Oct', 'Oct'],
      [11, 'Nov', 'Nov'],
      [12, 'Dec', 'Dec'],
    ]),
  ],
  [
    'pl',
    new Map([
      [1, 'Styc', 'stycznia'],
      [2, 'Luty', 'lutego'],
      [3, 'Mar', 'Mar'],
      [4, 'Apr', 'Apr'],
      [5, 'May', 'May'],
      [6, 'Jun', 'Jun'],
      [7, 'Jul', 'Jul'],
      [8, 'Aug', 'Aug'],
      [9, 'Sep', 'Sep'],
      [10, 'Oct', 'Oct'],
      [11, 'Nov', 'Nov'],
      [12, 'Dec', 'Dec'],
    ]),
  ],
  [
    'ru',
    new Map([
      [1, 'Янв', 'янв'],
      [2, 'Фев', 'фев'],
      [3, 'Мар', 'марта'],
      [4, 'Апр', 'апр'],
      [5, 'Май', 'мая'],
      [6, 'Июн', 'июня'],
      [7, 'Июл', 'июля'],
      [8, 'Авг', 'авг'],
      [9, 'Сен', 'сент'],
      [10, 'Окт', 'окт'],
      [11, 'Ноя', 'нояб'],
      [12, 'Дек', 'дек'],
    ]),
  ],
]);

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

const shortMonthCache = new Map<string, string>();

function getShortMonth(month: number, locale: string | undefined) {
  if (!Intl || !Intl.DateTimeFormat) {
    return MONTHS_EN.get(month);
  }
  const cacheKey = `${month}|${locale || ''}`;
  if (shortMonthCache.has(cacheKey)) {
    return shortMonthCache.get(cacheKey);
  }
  const result = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
    new Date(2000, month - 1)
  );
  shortMonthCache.set(cacheKey, result);
  return result;
}

function getQualifier(qualifier: string, locale: string | undefined) {
  const language = locale && locale.split(/[-_]/)[0];
  const languageMap = language && QUALIFIERS_I18N.get(language);
  return languageMap ? languageMap.get(qualifier) : qualifier;
}

/** Simple date formatter. */
export function formatDate(date: GedcomDate, locale?: string): string {
  return [
    date.qualifier && getQualifier(date.qualifier, locale),
    date.day,
    date.month && getShortMonth(date.month, locale),
    date.year,
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
