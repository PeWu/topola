import { parse as parseGedcom } from 'parse-gedcom';
import type {
  DateOrRange,
  DateRange,
  DateValue,
  EventRecord,
  FamilyRecord,
  MediaRecord,
  ModelData,
  PersonRecord,
} from '../model/index.js';

/** Structural GEDCOM entry node compatible with `parse-gedcom` ASTs. */
export interface GedcomEntry {
  level: number;
  pointer: string;
  tag: string;
  data: string;
  tree: GedcomEntry[];
}

function findTag(
  tree: readonly GedcomEntry[] | undefined,
  tag: string,
): GedcomEntry | undefined {
  return tree?.find((entry) => entry.tag === tag);
}

function findTags(
  tree: readonly GedcomEntry[] | undefined,
  tag: string,
): GedcomEntry[] {
  return tree ? tree.filter((entry) => entry.tag === tag) : [];
}

/**
 * The text of a line together with any `CONC` / `CONT` continuations under it.
 */
function rawText(entry: GedcomEntry | undefined): string {
  if (!entry) return '';
  let text = entry.data ?? '';
  for (const child of entry.tree ?? []) {
    if (child.tag === 'CONC') {
      text += child.data ?? '';
    } else if (child.tag === 'CONT') {
      text += `\n${child.data ?? ''}`;
    }
  }
  return text;
}

/**
 * The value of a line without the white space around it. For every value but
 * free text (notes), where a space at the end of a line counts.
 */
function valueOf(entry: GedcomEntry | undefined): string {
  return rawText(entry).trim();
}

function pointerToId(rawPointer: string): string {
  const pointer = (rawPointer ?? '').trim();
  if (pointer.startsWith('@') && pointer.endsWith('@')) {
    return pointer.length > 2 ? pointer.slice(1, -1) : '';
  }
  return pointer;
}

/** Returns the ids without repetitions, in their order. */
function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

/** A count such as NCHI: a whole number, or nothing. */
function parseCount(entry: GedcomEntry | undefined): number | undefined {
  const value = valueOf(entry);
  return /^\d+$/.test(value) ? Number(value) : undefined;
}

function extractName(name: string | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const arr = (name ?? '').split('/');
  const first = arr[0]?.trim();
  if (arr.length === 1) {
    return first ? { firstName: first } : {};
  }
  const last = arr[1]?.trim();
  return {
    ...(first ? { firstName: first } : {}),
    ...(last ? { lastName: last } : {}),
  };
}

const MONTHS = new Map<string, number>([
  ['jan', 1],
  ['feb', 2],
  ['mar', 3],
  ['apr', 4],
  ['may', 5],
  ['jun', 6],
  ['jul', 7],
  ['aug', 8],
  ['sep', 9],
  ['oct', 10],
  ['nov', 11],
  ['dec', 12],
]);

function hasWrappingParens(text: string): boolean {
  if (!text.startsWith('(') || !text.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < text.length - 1; i++) {
    const ch = text[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return false;
    }
  }
  return depth === 1;
}

function parseSingleDateTokens(rawParts: string[]): DateValue | undefined {
  let parts = rawParts.filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }

  const result: DateValue = {};

  // Strip surrounding parentheses only when one pair wraps the whole phrase
  const joined = parts.join(' ');
  if (hasWrappingParens(joined)) {
    const inner = joined.slice(1, -1).trim();
    if (!inner) return undefined;
    parts = inner.split(/\s+/).filter(Boolean);
  }

  const fullText = parts.join(' ');
  const firstLower = parts[0]!.toLowerCase();
  if (firstLower === 'cal' || firstLower === 'abt' || firstLower === 'est') {
    result.qualifier = firstLower;
    parts = parts.slice(1);
  }

  if (parts.length > 0 && /^\d{1,4}$/.test(parts[parts.length - 1]!)) {
    result.year = Number(parts[parts.length - 1]!);
    parts = parts.slice(0, parts.length - 1);
  }

  if (parts.length > 0) {
    const lastLower = parts[parts.length - 1]!.toLowerCase();
    const monthNum = MONTHS.get(lastLower);
    if (monthNum !== undefined) {
      result.month = monthNum;
      parts = parts.slice(0, parts.length - 1);
    }
  }

  if (
    result.month !== undefined &&
    parts.length > 0 &&
    /^\d\d?$/.test(parts[0]!)
  ) {
    const day = Number(parts[0]!);
    // "32 JAN" is no date: it stays text.
    if (day >= 1 && day <= 31) {
      result.day = day;
      parts = parts.slice(1);
    }
  }

  if (parts.length > 0) {
    return { text: fullText };
  }
  // Nothing of a date, or only a qualifier ("ABT"), stays text as well.
  if (
    result.year === undefined &&
    result.month === undefined &&
    result.day === undefined
  ) {
    return { text: fullText };
  }
  return result;
}

function hasDatePart(date: DateValue | undefined): date is DateValue {
  return (
    date !== undefined &&
    (date.year !== undefined ||
      date.month !== undefined ||
      date.day !== undefined)
  );
}

/**
 * Parses a GEDCOM date or date range string into a `DateOrRange` record.
 */
export function parseGedcomDate(gedcomDate: string): DateOrRange | undefined {
  const cleaned = gedcomDate.replace(/@#?[^@]*@/g, '').trim();
  if (!cleaned) return undefined;
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return undefined;

  const fullText = parts.join(' ');
  const firstLower = parts[0]!.toLowerCase();
  if (/^(?:bet|bet\.|between)$/.test(firstLower)) {
    const andIdx = parts.findIndex((x) => x.toLowerCase() === 'and');
    if (andIdx === -1) {
      // Malformed BET without AND: treat remaining tokens safely without slicing -1
      const fallback = parseSingleDateTokens(parts.slice(1));
      return hasDatePart(fallback)
        ? { dateRange: { from: fallback } }
        : { date: { text: fullText } };
    }
    const from = parseSingleDateTokens(parts.slice(1, andIdx));
    const to = parseSingleDateTokens(parts.slice(andIdx + 1));
    if (!hasDatePart(from) && !hasDatePart(to)) {
      return { date: { text: fullText } };
    }
    const dateRange: DateRange = {};
    if (from) dateRange.from = from;
    if (to) dateRange.to = to;
    return { dateRange };
  }

  if (/^(?:bef|bef\.|before|aft|aft\.|after)$/.test(firstLower)) {
    const date = parseSingleDateTokens(parts.slice(1));
    if (!hasDatePart(date)) return { date: { text: fullText } };
    return firstLower.startsWith('bef')
      ? { dateRange: { to: date } }
      : { dateRange: { from: date } };
  }

  const date = parseSingleDateTokens(parts);
  return date ? { date } : undefined;
}

/** What records refer to by id: media objects and shared notes. */
interface SharedRecords {
  objects: ReadonlyMap<string, GedcomEntry>;
  notes: ReadonlyMap<string, GedcomEntry>;
}

/**
 * Returns the lines of all NOTE entries of a record or event: inline notes
 * with their CONC / CONT continuations, and shared notes (`1 NOTE @N1@`)
 * looked up among the NOTE records. Nothing if there is no text at all.
 */
function createNotes(
  tree: readonly GedcomEntry[] | undefined,
  shared: SharedRecords,
): string[] | undefined {
  const lines: string[] = [];
  for (const noteTag of findTags(tree, 'NOTE')) {
    const reference = /^@([^@#][^@]*)@$/.exec((noteTag.data ?? '').trim());
    const note = reference ? shared.notes.get(reference[1]!) : noteTag;
    if (!note) continue;
    lines.push(note.data ?? '');
    for (const entry of note.tree ?? []) {
      if (entry.tag === 'CONC') {
        lines[lines.length - 1] += entry.data ?? '';
      } else if (entry.tag === 'CONT') {
        // An empty CONT is an empty line.
        lines.push(entry.data ?? '');
      }
    }
  }
  return lines.some((line) => line.trim() !== '') ? lines : undefined;
}

/**
 * Returns the highest QUAY value (0..3) among direct SOUR citations under the
 * given entries, or `undefined` if none carry a valid QUAY value.
 */
export function bestCitationQuality(
  entries: ReadonlyArray<GedcomEntry | undefined>,
): number | undefined {
  let best: number | undefined;
  for (const entry of entries) {
    if (!entry) continue;
    for (const sour of findTags(entry.tree, 'SOUR')) {
      const quay = findTag(sour.tree, 'QUAY');
      const raw = valueOf(quay);
      const val = /^[0-3]$/.test(raw) ? Number(raw) : NaN;
      if (val >= 0 && val <= 3 && (best === undefined || val > best)) {
        best = val;
      }
    }
  }
  return best;
}

function createEvent(
  entry: GedcomEntry | undefined,
  shared: SharedRecords,
): EventRecord | undefined {
  if (!entry) return undefined;
  const typeTag = findTag(entry.tree, 'TYPE');
  const dateTag = findTag(entry.tree, 'DATE');
  const placeTag = findTag(entry.tree, 'PLAC');
  const confidence = bestCitationQuality([entry]);

  const dateText = rawText(dateTag);
  const parsedDate = dateText ? parseGedcomDate(dateText) : undefined;
  const place = valueOf(placeTag) || undefined;
  const type = valueOf(typeTag);

  let result: EventRecord | undefined;
  if (parsedDate || place) {
    result = parsedDate ? { ...parsedDate } : {};
    if (place) result.place = place;
    result.confirmed = true;
    if (type) result.type = type;
    const notes = createNotes(entry.tree, shared);
    if (notes) result.notes = notes;
  } else if (valueOf(entry).toLowerCase() === 'y') {
    result = { confirmed: true };
  }

  if (result && confidence !== undefined) {
    result.confidence = confidence;
  }
  return result;
}

function createIndi(
  entry: GedcomEntry,
  shared: SharedRecords,
  familyIds: ReadonlySet<string>,
): PersonRecord {
  const id = pointerToId(entry.pointer);
  const fams = unique(
    findTags(entry.tree, 'FAMS')
      .map((e) => pointerToId(e.data))
      .filter((fid) => familyIds.has(fid)),
  );

  const indi: PersonRecord = { id, fams };

  // Name & maiden name
  const nameTags = findTags(entry.tree, 'NAME');
  const isMaiden = (nameTag: GedcomEntry) => {
    // "maiden" in GEDCOM 5.5.1, "MAIDEN" in GEDCOM 7.
    const type = findTag(nameTag.tree, 'TYPE');
    return valueOf(type).toLowerCase() === 'maiden';
  };
  const main = nameTags.find((x) => !isMaiden(x));
  const maiden = nameTags.find(isMaiden);

  if (main) {
    const { firstName, lastName } = extractName(rawText(main));
    if (firstName) indi.firstName = firstName;
    if (lastName) indi.lastName = lastName;
  }
  if (maiden) {
    const { firstName, lastName } = extractName(rawText(maiden));
    if (lastName) indi.maidenName = lastName;
    if (firstName && !indi.firstName) indi.firstName = firstName;
  }

  const numberOfChildren = parseCount(findTag(entry.tree, 'NCHI'));
  if (numberOfChildren !== undefined) {
    indi.numberOfChildren = numberOfChildren;
  }
  const numberOfMarriages = parseCount(findTag(entry.tree, 'NMR'));
  if (numberOfMarriages !== undefined) {
    indi.numberOfMarriages = numberOfMarriages;
  }
  const sex = valueOf(findTag(entry.tree, 'SEX'));
  if (sex) {
    indi.sex = sex;
  }

  // Multi-FAMC: skip @VOID@ or dangling FAMC tags to pick the first valid existing family
  for (const famcTag of findTags(entry.tree, 'FAMC')) {
    const famcId = pointerToId(famcTag.data);
    if (familyIds.has(famcId)) {
      indi.famc = famcId;
      break;
    }
  }

  // Images (inline OBJE or top-level @O1@ pointer)
  const objeTags = findTags(entry.tree, 'OBJE');
  if (objeTags.length > 0) {
    const images: MediaRecord[] = [];
    for (const tag of objeTags) {
      const reference = /^@([^@#][^@]*)@$/.exec((tag.data ?? '').trim());
      const realObje = reference ? shared.objects.get(reference[1]!) : tag;
      if (!realObje) continue;
      const url = valueOf(findTag(realObje.tree, 'FILE'));
      const title = valueOf(findTag(realObje.tree, 'TITL'));
      if (!url) continue;
      images.push({ url, ...(title ? { title } : {}) });
    }
    indi.images = images;
  }

  const birth = createEvent(findTag(entry.tree, 'BIRT'), shared);
  if (birth) indi.birth = birth;

  const death = createEvent(findTag(entry.tree, 'DEAT'), shared);
  if (death) indi.death = death;

  const confidence = bestCitationQuality([
    entry,
    findTag(entry.tree, 'BIRT'),
    findTag(entry.tree, 'CHR'),
    findTag(entry.tree, 'BAPM'),
  ]);
  if (confidence !== undefined) {
    indi.confidence = confidence;
    indi.parentLinkConfidence = confidence;
  }

  const notes = createNotes(entry.tree, shared);
  if (notes) indi.notes = notes;

  // Occupations and titles (distinct, non-empty level-1 values in order of appearance).
  const occupations = unique(
    findTags(entry.tree, 'OCCU')
      .map((e) => valueOf(e))
      .filter((v): v is string => Boolean(v)),
  );
  if (occupations.length > 0) indi.occupations = occupations;

  const titles = unique(
    findTags(entry.tree, 'TITL')
      .map((e) => valueOf(e))
      .filter((v): v is string => Boolean(v)),
  );
  if (titles.length > 0) indi.titles = titles;

  // Filter out undefined EVEN entries cleanly (fixes V3 `x !== null` bug!)
  indi.events = findTags(entry.tree, 'EVEN')
    .map((even) => createEvent(even, shared))
    .filter((x): x is EventRecord => x !== undefined);

  return indi;
}

function createFam(
  entry: GedcomEntry,
  shared: SharedRecords,
  personIds: ReadonlySet<string>,
): FamilyRecord {
  const id = pointerToId(entry.pointer);
  const children = unique(
    findTags(entry.tree, 'CHIL')
      .map((e) => pointerToId(e.data))
      .filter((cid) => personIds.has(cid)),
  );

  const fam: FamilyRecord = { id, children };

  // A line that is there twice names one partner, not two.
  const validHusbs = unique(
    findTags(entry.tree, 'HUSB')
      .map((t) => pointerToId(t.data))
      .filter((pid) => personIds.has(pid)),
  );
  const validWifes = unique(
    findTags(entry.tree, 'WIFE')
      .map((t) => pointerToId(t.data))
      .filter((pid) => personIds.has(pid)),
  );

  // Support both traditional (HUSB + WIFE) and same-sex (HUSB + HUSB or WIFE + WIFE) partner slots
  if (validHusbs.length >= 2 && validWifes.length === 0) {
    fam.husb = validHusbs[0]!;
    fam.wife = validHusbs[1]!;
  } else if (validWifes.length >= 2 && validHusbs.length === 0) {
    fam.husb = validWifes[0]!;
    fam.wife = validWifes[1]!;
  } else {
    if (validHusbs[0]) fam.husb = validHusbs[0];
    // One person is not both partners.
    const wife = validWifes.find((pid) => pid !== fam.husb);
    if (wife) fam.wife = wife;
  }

  const marriage = createEvent(findTag(entry.tree, 'MARR'), shared);
  if (marriage) fam.marriage = marriage;

  return fam;
}

/**
 * Converts a parsed `GedcomEntry[]` AST into `ModelData` (`{ indis, fams }`).
 * References to records that do not exist, or that are of another kind (a
 * FAMS that points at a person), are left out, and so are INDI and FAM
 * records without an id.
 */
export function gedcomEntriesToModel(
  entries: readonly GedcomEntry[],
): ModelData {
  /** The records of a kind by id; `@VOID@` is the id of no record. */
  const recordsByTag = (tag: string): Map<string, GedcomEntry> => {
    const records = new Map<string, GedcomEntry>();
    for (const e of entries) {
      const id = e.tag === tag ? pointerToId(e.pointer) : '';
      if (id && id !== 'VOID') records.set(id, e);
    }
    return records;
  };
  const shared: SharedRecords = {
    objects: recordsByTag('OBJE'),
    notes: recordsByTag('NOTE'),
  };
  const personEntries = recordsByTag('INDI');
  const familyEntries = recordsByTag('FAM');
  const personIds = new Set(personEntries.keys());
  const familyIds = new Set(familyEntries.keys());

  const hasId = (e: GedcomEntry): boolean => {
    const id = pointerToId(e.pointer);
    return id !== '' && id !== 'VOID';
  };
  const indis = entries
    .filter((e) => e.tag === 'INDI' && hasId(e))
    .map((e) => createIndi(e, shared, familyIds));
  const fams = entries
    .filter((e) => e.tag === 'FAM' && hasId(e))
    .map((e) => createFam(e, shared, personIds));

  return { indis, fams };
}

/**
 * Parses raw GEDCOM text into `ModelData` (`{ indis, fams }`). Lines may end
 * in LF, CR LF or CR. An empty or blank text gives an empty model, and so
 * does GEDCOM without people (`0 HEAD` alone): look at `indis.length` before
 * taking a start person from the result.
 *
 * @throws TypeError if the argument is not a string.
 * @throws Error with a message that starts with `Invalid GEDCOM` if the text
 * has no GEDCOM line at all (a web page, JSON, an image), or if its first
 * GEDCOM line is not at level 0; the error of the tokenizer is then its
 * `cause`.
 */
export function gedcomToModel(gedcomText: string): ModelData {
  if (typeof gedcomText !== 'string') {
    throw new TypeError(
      'gedcomToModel() takes the text of a GEDCOM file as a string.',
    );
  }
  const text = gedcomText.replace(/\r\n?/g, '\n');
  let entries: GedcomEntry[];
  try {
    entries = parseGedcom(text) as GedcomEntry[];
  } catch (cause) {
    throw new Error(
      'Invalid GEDCOM: the text has to start with a level 0 line, such as "0 HEAD".',
      { cause },
    );
  }
  const withoutBom = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const firstLine = withoutBom.split('\n').find((line) => line.trim() !== '');
  if (
    firstLine !== undefined &&
    (entries.length === 0 ||
      !/^\s*0 (?:@[^@]+@ )?[A-Za-z_][A-Za-z0-9_]*(?:\s|$)/.test(firstLine))
  ) {
    throw new Error(
      'Invalid GEDCOM: the text has no GEDCOM line, such as "0 HEAD".',
    );
  }
  return gedcomEntriesToModel(entries);
}
