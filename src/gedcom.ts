import { GedcomEntry, parse as parseGedcom } from 'parse-gedcom';

import {
  Date,
  DateOrRange,
  JsonEvent,
  JsonFam,
  JsonGedcomData,
  JsonIndi,
  JsonImage,
} from './data';

/** Returns the first entry with the given tag or undefined if not found. */
function findTag(tree: GedcomEntry[], tag: string): GedcomEntry | undefined {
  return tree.find(entry => entry.tag === tag);
}

/** Returns all entries with the given tag. */
function findTags(tree: GedcomEntry[], tag: string): GedcomEntry[] {
  return tree.filter(entry => entry.tag === tag);
}

/**
 * Returns the identifier extracted from a pointer string.
 * E.g. '@I123@' -> 'I123'
 */
function pointerToId(pointer: string): string {
  return pointer.substring(1, pointer.length - 1);
}

/** Extracts the first and last name from a GEDCOM name field. */
function extractName(name: string): { firstName?: string; lastName?: string } {
  const arr = name.split('/');
  if (arr.length === 1) {
    return { firstName: arr[0].trim() };
  }
  return { firstName: arr[0].trim(), lastName: arr[1].trim() };
}

/** Maps month abbreviations used in GEDCOM to month numbers. */
const MONTHS: Map<string, number> = new Map([
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

/** Parses the GEDCOM date into the Date structure. */
function parseDate(parts: string[]): Date | undefined {
  if (!parts || !parts.length) {
    return undefined;
  }
  const result: Date = {};
  const firstPart = parts[0].toLowerCase();

  if (firstPart.startsWith('(') && parts[parts.length - 1].endsWith(')')) {
    result.text = parts.join(' ');
    result.text = result.text.substring(1, result.text.length - 1);
    return result;
  }
  if (firstPart === 'cal' || firstPart === 'abt' || firstPart === 'est') {
    result.qualifier = firstPart;
    parts = parts.slice(1);
  }
  if (parts.length && parts[parts.length - 1].match(/^\d{1,4}$/)) {
    result.year = Number(parts[parts.length - 1]);
    parts = parts.slice(0, parts.length - 1);
  }
  if (parts.length) {
    const lastPart = parts[parts.length - 1].toLowerCase();
    if (MONTHS.has(lastPart)) {
      result.month = MONTHS.get(lastPart);
      parts = parts.slice(0, parts.length - 1);
    }
  }
  if (parts.length && parts[0].match(/^\d\d?$/)) {
    result.day = Number(parts[0]);
  }
  return result;
}

/** Parses a GEDCOM date or date range. */
export function getDate(gedcomDate: string): DateOrRange | undefined {
  const parts = gedcomDate.replace(/@.*@/, '').trim().split(' ');
  const firstPart = parts[0].toLowerCase();
  if (firstPart.startsWith('bet')) {
    const i = parts.findIndex(x => x.toLowerCase() === 'and');
    const from = parseDate(parts.slice(1, i));
    const to = parseDate(parts.slice(i + 1));
    return { dateRange: { from, to } };
  }
  if (firstPart.startsWith('bef') || firstPart.startsWith('aft')) {
    const date = parseDate(parts.slice(1));
    if (firstPart.startsWith('bef')) {
      return { dateRange: { to: date } };
    }
    return { dateRange: { from: date } };
  }
  const date = parseDate(parts);
  if (date) {
    return { date };
  }
  return undefined;
}

/**
 * tries to treat an input tag as NOTE and parsse all lines of notes
 */
function createNotes(notesTag: GedcomEntry | undefined): string[] | undefined {
  if (!notesTag || notesTag.tag !== 'NOTE') return undefined;

  return findTags(notesTag.tree, 'CONT')
    .filter(x => x.data)
    .reduce((a, i) => a.concat(i.data), [notesTag.data]);
}

/**
 * Creates a JsonEvent object from a GEDCOM entry.
 * Used for BIRT, DEAT and MARR tags.
 */
function createEvent(entry: GedcomEntry | undefined): JsonEvent | undefined {
  if (!entry) {
    return undefined;
  }
  const typeTag = findTag(entry.tree, 'TYPE');
  const dateTag = findTag(entry.tree, 'DATE');
  const placeTag = findTag(entry.tree, 'PLAC');

  const date = dateTag && dateTag.data && getDate(dateTag.data);
  const place = placeTag && placeTag.data;
  if (date || place) {
    const result: JsonEvent = date || {};
    if (place) {
      result.place = place;
    }
    result.confirmed = true;
    result.type = typeTag ? typeTag!.data : undefined;
    result.notes = createNotes(findTag(entry.tree, 'NOTE'));
    return result;
  }
  if (entry.data && entry.data.toLowerCase() === 'y') {
    return { confirmed: true };
  }
  return undefined;
}

/** Creates a JsonIndi object from an INDI entry in GEDCOM. */
function createIndi(
  entry: GedcomEntry,
  objects: Map<string, GedcomEntry>
): JsonIndi {
  const id = pointerToId(entry.pointer);
  const fams = findTags(entry.tree, 'FAMS').map(entry =>
    pointerToId(entry.data)
  );
  const indi: JsonIndi = { id, fams };

  // Name.
  const nameTags = findTags(entry.tree, 'NAME');
  const isMaiden = (nameTag: GedcomEntry) => {
    const type = findTag(nameTag.tree, 'TYPE');
    return type !== undefined && type.data === 'maiden';
  };
  const main = nameTags.find(x => !isMaiden(x));
  const maiden = nameTags.find(isMaiden);

  if (main) {
    const { firstName, lastName } = extractName(main.data);
    if (firstName) {
      indi.firstName = firstName;
    }
    if (lastName) {
      indi.lastName = lastName;
    }
  }

  if (maiden) {
    const { firstName, lastName } = extractName(maiden.data);
    if (lastName) {
      indi.maidenName = lastName;
    }
    if (firstName && !indi.firstName) {
      indi.firstName = firstName;
    }
  }

  // Number of children.
  const nchiTag = findTag(entry.tree, 'NCHI');
  if (nchiTag) {
    indi.numberOfChildren = +nchiTag.data;
  }

  // Number of marriages.
  const nmrTag = findTag(entry.tree, 'NMR');
  if (nmrTag) {
    indi.numberOfMarriages = +nmrTag.data;
  }

  // Sex.
  const sexTag = findTag(entry.tree, 'SEX');
  if (sexTag) {
    indi.sex = sexTag.data;
  }

  // Family with parents.
  const famcTag = findTag(entry.tree, 'FAMC');
  if (famcTag) {
    indi.famc = pointerToId(famcTag.data);
  }

  // Image URL.
  const objeTags = findTags(entry.tree, 'OBJE');
  if (objeTags.length > 0) {
    // Dereference OBJEct if needed.
    const getFileTag = (tag: GedcomEntry) => {
      const realObjeTag = tag.data ? objects.get(pointerToId(tag.data)) : tag;
      if (!realObjeTag) return undefined;

      const file = findTag(realObjeTag.tree, 'FILE');
      const title = findTag(realObjeTag.tree, 'TITL');

      if (!file) return undefined;
      return {
        url: file.data,
        title: title && title.data,
      } as JsonImage;
    };

    indi.images = objeTags
      .map(getFileTag)
      .filter((x): x is JsonImage => x !== undefined);
  }

  // Birth date and place.
  const birth = createEvent(findTag(entry.tree, 'BIRT'));
  if (birth) {
    indi.birth = birth;
  }

  // Events
  indi.events = findTags(entry.tree, 'EVEN')
    .map(createEvent)
    .filter((x): x is JsonEvent => x !== null);

  // Death date and place.
  const death = createEvent(findTag(entry.tree, 'DEAT'));
  if (death) {
    indi.death = death;
  }

  // Notes.
  indi.notes = createNotes(findTag(entry.tree, 'NOTE'));

  return indi;
}

/** Creates a JsonFam object from an FAM entry in GEDCOM. */
function createFam(entry: GedcomEntry): JsonFam {
  const id = pointerToId(entry.pointer);
  const children = findTags(entry.tree, 'CHIL').map(entry =>
    pointerToId(entry.data)
  );
  const fam: JsonFam = { id, children };

  // Husband.
  const husbTag = findTag(entry.tree, 'HUSB');
  if (husbTag) {
    fam.husb = pointerToId(husbTag.data);
  }

  // Wife.
  const wifeTag = findTag(entry.tree, 'WIFE');
  if (wifeTag) {
    fam.wife = pointerToId(wifeTag.data);
  }

  // Marriage
  const marriage = createEvent(findTag(entry.tree, 'MARR'));
  if (marriage) {
    fam.marriage = marriage;
  }
  return fam;
}

/** Creates a map from ID to entry from an array of entries. */
function createMap(entries: GedcomEntry[]): Map<string, GedcomEntry> {
  return new Map(entries.map(entry => [pointerToId(entry.pointer), entry]));
}

/** Parses a GEDCOM file into a JsonGedcomData structure. */
export function gedcomToJson(gedcomContents: string): JsonGedcomData {
  return gedcomEntriesToJson(parseGedcom(gedcomContents));
}

/** Converts parsed GEDCOM entries into a JsonGedcomData structure. */
export function gedcomEntriesToJson(gedcom: GedcomEntry[]): JsonGedcomData {
  const objects = createMap(findTags(gedcom, 'OBJE'));
  const indis = findTags(gedcom, 'INDI').map(entry =>
    createIndi(entry, objects)
  );
  const fams = findTags(gedcom, 'FAM').map(createFam);
  return { indis, fams };
}
