import { Date as GedcomDate, DateOrRange } from "./data";

/** Month in English is used as fallback if a requested translation is not found. */
const MONTHS_EN: Map<number, string> = new Map([
  [1, "Jan"],
  [2, "Feb"],
  [3, "Mar"],
  [4, "Apr"],
  [5, "May"],
  [6, "Jun"],
  [7, "Jul"],
  [8, "Aug"],
  [9, "Sep"],
  [10, "Oct"],
  [11, "Nov"],
  [12, "Dec"],
]);

/** Translations of the GEDCOM date qualifiers. */
const QUALIFIERS_I18N: Map<string, Map<string, string>> = new Map([
  [
    "cs",
    new Map([
      ["cal", "vypočt."],
      ["abt", "o"],
      ["est", "ocenil"],
      ["before", "před"],
      ["after", "po"],
    ]),
  ],
  [
    "de",
    new Map([
      ["cal", "errech."],
      ["abt", "etwa"],
      ["est", "geschät."],
      ["before", "vor"],
      ["after", "nach"],
    ]),
  ],
  [
    "fr",
    new Map([
      ["cal", "calc."],
      ["abt", "vers"],
      ["est", "est."],
      ["before", "avant"],
      ["after", "après"],
    ]),
  ],
  [
    "it",
    new Map([
      ["cal", "calc."],
      ["abt", "circa il"],
      ["est", "stim."],
      ["before", "prima del"],
      ["after", "dopo del"],
    ]),
  ],
  [
    "pl",
    new Map([
      ["cal", "wyl."],
      ["abt", "ok."],
      ["est", "szac."],
      ["before", "przed"],
      ["after", "po"],
    ]),
  ],
  [
    "ru",
    new Map([
      ["cal", "выч."],
      ["abt", "ок."],
      ["est", "оцен."],
      ["before", "до"],
      ["after", "после"],
    ]),
  ],
]);

const shortMonthCache = new Map<string, string>();

function getShortMonth(month: number, locale?: string) {
  if (!Intl || !Intl.DateTimeFormat) {
    return MONTHS_EN.get(month);
  }
  const cacheKey = `${month}|${locale || ""}`;
  if (shortMonthCache.has(cacheKey)) {
    return shortMonthCache.get(cacheKey);
  }
  const result = new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(2000, month - 1)
  );
  shortMonthCache.set(cacheKey, result);
  return result;
}

function getQualifier(qualifier: string, locale?: string) {
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
    return "";
  }

  // Fall back to formatting the date manually in case of
  // - locale not provided
  // - English (to avoid formatting like 'Oct 11, 2009')
  // - Lack of i18n support in the browser
  if (!Intl || !Intl.DateTimeFormat || !locale || locale === "en") {
    return [day, month && getShortMonth(month, locale), year].join(" ");
  }

  const format: Intl.DateTimeFormatOptions = {
    day: day ? "numeric" : undefined,
    month: month ? "short" : undefined,
    year: year ? "numeric" : undefined,
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
  ].join(" ");
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
    return "";
  }
  const from =
    dateOrRange.dateRange.from && formatDate(dateOrRange.dateRange.from);
  const to = dateOrRange.dateRange.to && formatDate(dateOrRange.dateRange.to);
  if (from && to) {
    return `${from} .. ${to}`;
  }
  if (from) {
    return `${getQualifier("after", locale)} ${from}`;
  }
  if (to) {
    return `${getQualifier("before", locale)} ${to}`;
  }
  return "";
}
