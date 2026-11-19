import type { DateOrRange, DateValue } from './types.js';

const MONTHS_EN = new Map<number, string>([
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

const QUALIFIERS_I18N = new Map<string, ReadonlyMap<string, string>>([
  [
    'bg',
    new Map([
      ['cal', 'прибл.'],
      ['abt', 'ок.'],
      ['est', 'оц.'],
      ['before', 'преди'],
      ['after', 'след'],
    ]),
  ],
  [
    'cs',
    new Map([
      ['cal', 'vypočt.'],
      ['abt', 'okolo'],
      ['est', 'odhadem'],
      ['before', 'před'],
      ['after', 'po'],
    ]),
  ],
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
    'en',
    new Map([
      ['cal', 'cal'],
      ['abt', 'abt'],
      ['est', 'est'],
      ['before', 'before'],
      ['after', 'after'],
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
  [
    'sv',
    new Map([
      ['cal', 'ber.'],
      ['abt', 'ung.'],
      ['est', 'uppsk.'],
      ['before', 'före'],
      ['after', 'efter'],
    ]),
  ],
]);

/**
 * Formatters by locale and by the parts of a date they show. Creating one is
 * slow, and a chart formats several dates per person on every layout.
 * `null` stands for a locale that `Intl` does not accept.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat | null>();
const MAX_FORMATTERS = 256;

function getFormatter(
  locale: string,
  parts: { day: boolean; month: boolean; year: boolean },
): Intl.DateTimeFormat | null {
  const key = `${locale}|${+parts.day}${+parts.month}${+parts.year}`;
  let formatter = formatterCache.get(key);
  if (formatter === undefined) {
    // Dates are built and formatted in UTC: they are calendar dates, and a
    // local time zone can lack a day (30 Dec 2011 in Pacific/Apia).
    const options: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };
    if (parts.day) options.day = 'numeric';
    if (parts.month) options.month = 'short';
    if (parts.year) options.year = 'numeric';
    try {
      formatter = new Intl.DateTimeFormat(normalizeIntlLocale(locale), options);
    } catch {
      // Not a locale for `Intl` (e.g. "pl_PL.UTF-8", "C"). Its language may
      // be one ("pl"); the qualifiers are translated by the language too.
      const language = normalizeLanguage(locale);
      try {
        formatter = language
          ? new Intl.DateTimeFormat(language, options)
          : null;
      } catch {
        formatter = null;
      }
    }
    if (formatterCache.size >= MAX_FORMATTERS) {
      const oldest = formatterCache.keys().next();
      if (!oldest.done) formatterCache.delete(oldest.value);
    }
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function normalizeLanguage(locale?: string): string | undefined {
  if (!locale) return undefined;
  return (
    locale
      .trim()
      .split(/[-_.@]/)[0]
      ?.toLowerCase() || undefined
  );
}

function normalizeIntlLocale(locale: string): string {
  return locale
    .trim()
    .replace(/[.@].*$/, '')
    .replace(/_/g, '-');
}

function getShortMonth(month: number): string {
  return MONTHS_EN.get(month) ?? String(month);
}

/** The parts of a date as they are, with English month names. */
function formatDatePlainly(
  day?: number,
  month?: number,
  year?: number,
): string {
  return [
    day !== undefined ? String(day) : '',
    month !== undefined ? getShortMonth(month) : '',
    year !== undefined ? String(year) : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getQualifier(qualifier: string, locale?: string): string {
  const language = normalizeLanguage(locale) ?? 'en';
  const key = qualifier.toLowerCase();
  return (
    QUALIFIERS_I18N.get(language)?.get(key) ??
    QUALIFIERS_I18N.get('en')?.get(key) ??
    qualifier
  );
}

function normalizeWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Dates as `Intl` has formatted them, by locale and parts. Formatting takes
 * its time, and a chart formats the same dates again on every layout.
 */
const formattedDates = new Map<string, string>();
const MAX_FORMATTED_DATES = 100_000;

function formatDateOnly(
  day?: number,
  month?: number,
  year?: number,
  locale?: string,
): string {
  if (day === undefined && month === undefined && year === undefined) {
    return '';
  }

  const language = normalizeLanguage(locale);
  if (
    typeof Intl === 'undefined' ||
    !Intl.DateTimeFormat ||
    !locale ||
    language === 'en'
  ) {
    return formatDatePlainly(day, month, year);
  }

  const key = `${locale}|${day}|${month}|${year}`;
  let formatted = formattedDates.get(key);
  if (formatted === undefined) {
    formatted = formatDateWithIntl(day, month, year, locale);
    if (formattedDates.size >= MAX_FORMATTED_DATES) {
      // Forget the oldest one (a Map keeps the order of insertion).
      const oldest = formattedDates.keys().next();
      if (!oldest.done) formattedDates.delete(oldest.value);
    }
    formattedDates.set(key, formatted);
  }
  return formatted;
}

function formatDateWithIntl(
  day: number | undefined,
  month: number | undefined,
  year: number | undefined,
  locale: string,
): string {
  const formatter = getFormatter(locale, {
    day: day !== undefined,
    month: month !== undefined,
    year: year !== undefined,
  });
  if (!formatter) {
    return formatDatePlainly(day, month, year);
  }

  // Use Jan 1 baseline + setUTCFullYear so years 0..99 AD stay 0..99 AD (not 1900..1999)
  // and missing month defaults to January (31 days) without Feb-30 rollover.
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(year ?? 2000, month !== undefined ? month - 1 : 0, day ?? 1);

  // A date that does not exist (31 Feb, month 13) rolls over to another one,
  // and years before 1 come out without their era: show the parts as given.
  if (
    d.getUTCFullYear() !== (year ?? 2000) ||
    d.getUTCMonth() !== (month ?? 1) - 1 ||
    d.getUTCDate() !== (day ?? 1) ||
    (year !== undefined && year < 1)
  ) {
    return formatDatePlainly(day, month, year);
  }

  return formatter.format(d);
}

/** Formats a single DateValue with locale-aware month names and qualifiers. */
export function formatDate(date: DateValue, locale?: string): string {
  if (!date) return '';
  const day = date.day ?? undefined;
  const month = date.month ?? undefined;
  const year = date.year ?? undefined;
  const qualifier = date.qualifier ?? undefined;
  const text = date.text ?? '';
  const parts = [
    qualifier ? getQualifier(qualifier, locale) : '',
    formatDateOnly(day, month, year, locale),
    text,
  ].filter(Boolean);
  return normalizeWhitespace(parts.join(' '));
}

/** Formats a DateOrRange object (`date` or `dateRange`). */
export function formatDateOrRange(
  dateOrRange: DateOrRange,
  locale?: string,
): string {
  if (!dateOrRange) return '';
  if (dateOrRange.date) {
    return formatDate(dateOrRange.date, locale);
  }
  if (!dateOrRange.dateRange) {
    return '';
  }
  const from = dateOrRange.dateRange.from
    ? formatDate(dateOrRange.dateRange.from, locale)
    : '';
  const to = dateOrRange.dateRange.to
    ? formatDate(dateOrRange.dateRange.to, locale)
    : '';
  if (from && to) {
    return normalizeWhitespace(`${from} .. ${to}`);
  }
  if (from) {
    return normalizeWhitespace(`${getQualifier('after', locale)} ${from}`);
  }
  if (to) {
    return normalizeWhitespace(`${getQualifier('before', locale)} ${to}`);
  }
  return '';
}
