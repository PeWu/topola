import {Date as GedcomDate} from './data';

const MONTHS_EN: Map<number, string> = new Map([
  [1, 'Jan'],
  [2, 'Feb'],
  [3, 'Mar'],
  [4, 'Apr'],
  [5, 'May'],
  [6, 'Jun'],
  [7, 'Jul'],
  [8, 'Aug'],
  [9, 'Sep'],
  [10, 'Oct'],
  [11, 'Nov'],
  [12, 'Dec'],
]);

/** Translations of the GEDCOM date qualifiers. */
const QUALIFIERS_I18N: Map<string, Map<string, string>> = new Map([
  [
    'pl', new Map([
      ['cal', 'wyl.'],
      ['abt', 'ok.'],
      ['est', 'szac.'],
    ])
  ],
]);

const shortMonthCache = new Map<string, string>();

function getShortMonth(month: number, locale?: string) {
  if (!Intl || !Intl.DateTimeFormat) {
    return MONTHS_EN.get(month);
  }
  const cacheKey = `${month}|${locale || ''}`;
  if (shortMonthCache.has(cacheKey)) {
    return shortMonthCache.get(cacheKey);
  }
  const result = new Intl.DateTimeFormat(locale, {month: 'short'})
      .format(new Date(2000, month - 1));
  shortMonthCache.set(cacheKey, result);
  return result;
}

function getQualifier(qualifier: string, locale?: string) {
  const language = locale && locale.split(/[-_]/)[0];
  const languageMap = QUALIFIERS_I18N.get(language);
  return languageMap && languageMap.get(qualifier) || qualifier;
}

/** Simple date formatter. */
export function formatDate(date: GedcomDate, locale?: string) {
  return [
    getQualifier(date.qualifier, locale),
    date.day,
    date.month && getShortMonth(date.month, locale),
    date.year,
    date.text,
  ].join(' ');
}
