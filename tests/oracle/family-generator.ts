export interface GeneratedDate {
  qualifier?: string;
  day?: number;
  month?: number;
  year?: number;
  text?: string;
}

export interface GeneratedEvent {
  date?: GeneratedDate;
  place?: string;
  confirmed?: boolean;
  confidence?: number;
}

export interface GeneratedIndi {
  id: string;
  firstName?: string;
  lastName?: string;
  maidenName?: string;
  sex?: string;
  famc?: string;
  fams?: string[];
  birth?: GeneratedEvent;
  death?: GeneratedEvent;
  confidence?: number;
  parentLinkConfidence?: number;
}

export interface GeneratedFam {
  id: string;
  husb?: string;
  wife?: string;
  children?: string[];
  marriage?: GeneratedEvent;
}

export interface GeneratedFamilyData {
  indis: GeneratedIndi[];
  fams: GeneratedFam[];
}

export interface GeneratorParams {
  ancestorGenerations: number;
  descendantGenerations: number;
  maxSiblings: number;
  remarriageProb: number;
  pedigreeCollapseProb: number;
  singleParentProb: number;
  parentlessSiblingsProb: number;
  marriageDetailsProb: number;
  wideMarriageProb?: number;
}

/** Deterministic Mulberry32 PRNG. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES_M = [
  'Jan',
  'Aleksander',
  'Stanisław',
  'Piotr',
  'Kazimierz',
  'Władysław',
  'Mikołaj',
  'Krzysztof',
  'Andrzej',
  'Tomasz',
];

const FIRST_NAMES_F = [
  'Anna',
  'Maria',
  'Katarzyna',
  'Zofia',
  'Małgorzata',
  'Barbara',
  'Elżbieta',
  'Jadwiga',
  ' Magdalena',
  'Agnieszka',
];

const LAST_NAMES = [
  'Kowalski',
  'Nowak',
  'Wiśniewski',
  'Wójcik',
  'Kowalczyk',
  'Kamiński',
  'Lewandowski',
  'Zieliński',
  'Szymański',
  'Woźniak',
  'Dąbrowski',
  'Kozłowski',
];

const PLACES = [
  'Warszawa',
  'Kraków',
  'Gdańsk, Pomorskie',
  'Poznań, Wielkopolskie',
  'Wrocław, Dolnośląskie',
  'Lublin',
  'Toruń, Kujawsko-Pomorskie, Polska',
];

/**
 * Generates a deterministic synthetic genealogical graph with bidirectional
 * `indi` <-> `fam` pointers and strict generational ordering (DAG, no cycles).
 */
export function generateFamily(
  seed: number,
  params: GeneratorParams,
): { data: GeneratedFamilyData; startIndi: string } {
  const rng = createRng(seed);
  const indis = new Map<string, GeneratedIndi>();
  const fams = new Map<string, GeneratedFam>();
  // Pool of individuals per generation level (negative = older ancestors, positive = younger descendants)
  const poolByGen = new Map<number, string[]>();

  let indiSeq = 1;
  let famSeq = 1;

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;

  const makePerson = (gen: number, sexOverride?: 'M' | 'F'): GeneratedIndi => {
    const id = `I${indiSeq++}`;
    const sex = sexOverride ?? (rng() < 0.5 ? 'M' : 'F');
    const firstName =
      rng() < 0.92
        ? pick(sex === 'M' ? FIRST_NAMES_M : FIRST_NAMES_F).trim()
        : undefined;
    const lastName = rng() < 0.9 ? pick(LAST_NAMES) : undefined;
    const baseYear = 1850 + gen * 28 + Math.floor(rng() * 10);
    const hasBirth = rng() < 0.7;
    const hasDeath = rng() < 0.5;

    const indi: GeneratedIndi = {
      id,
      sex,
      fams: [],
    };
    if (firstName !== undefined) indi.firstName = firstName;
    if (lastName !== undefined) indi.lastName = lastName;
    if (hasBirth) {
      indi.birth = { date: { year: baseYear } };
      if (rng() < 0.4) {
        indi.birth.place = pick(PLACES);
      }
    }
    if (hasDeath) {
      indi.death = { date: { year: baseYear + 45 + Math.floor(rng() * 35) } };
    }
    indis.set(id, indi);
    const genPool = poolByGen.get(gen) ?? [];
    genPool.push(id);
    poolByGen.set(gen, genPool);
    return indi;
  };

  const makeFamily = (
    husbId: string | undefined,
    wifeId: string | undefined,
    gen: number,
  ): GeneratedFam => {
    const id = `F${famSeq++}`;
    const fam: GeneratedFam = { id, children: [] };
    if (husbId) {
      fam.husb = husbId;
      const h = indis.get(husbId)!;
      h.fams = h.fams ?? [];
      if (!h.fams.includes(id)) h.fams.push(id);
    }
    if (wifeId) {
      fam.wife = wifeId;
      const w = indis.get(wifeId)!;
      w.fams = w.fams ?? [];
      if (!w.fams.includes(id)) w.fams.push(id);
    }
    if (rng() < params.marriageDetailsProb) {
      const wide = rng() < (params.wideMarriageProb ?? 0.15);
      fam.marriage = {
        date: { year: 1875 + gen * 28 },
        ...(wide
          ? {
              place:
                'Królewskie Stołeczne Miasto Kraków, Województwo Małopolskie',
            }
          : rng() < 0.5
            ? { place: pick(PLACES) }
            : {}),
      };
    }
    fams.set(id, fam);
    return fam;
  };

  const addChildToFam = (fam: GeneratedFam, child: GeneratedIndi) => {
    child.famc = fam.id;
    fam.children = fam.children ?? [];
    if (!fam.children.includes(child.id)) {
      fam.children.push(child.id);
    }
  };

  // Create start person at generation 0
  const startPerson = makePerson(0);

  // Build ancestor tree upward from a person at `gen`
  const buildAncestors = (child: GeneratedIndi, gen: number, remDepth: number) => {
    if (remDepth <= 0 || child.famc) return;

    const parentGen = gen - 1;

    // Optional parentless multi-child sibling group at leaf or intermediate level
    if (rng() < params.parentlessSiblingsProb) {
      const parentlessFam = makeFamily(undefined, undefined, parentGen);
      addChildToFam(parentlessFam, child);
      const extraSibs = 1 + Math.floor(rng() * Math.max(1, params.maxSiblings - 1));
      for (let s = 0; s < extraSibs; s++) {
        const sib = makePerson(gen);
        addChildToFam(parentlessFam, sib);
        if (rng() < 0.4) {
          populateDescendants(sib, gen, Math.min(1, params.descendantGenerations));
        }
      }
      return;
    }

    // Check pedigree collapse: reuse an existing couple or person at `parentGen`
    const existingCandidates = (poolByGen.get(parentGen) ?? []).filter(
      (cid) => cid !== child.id,
    );
    let father: GeneratedIndi | undefined;
    let mother: GeneratedIndi | undefined;

    if (
      existingCandidates.length >= 2 &&
      rng() < params.pedigreeCollapseProb
    ) {
      // Find an existing family at parentGen if one exists
      const existingM = existingCandidates.find(
        (id) => indis.get(id)?.sex === 'M' && (indis.get(id)?.fams?.length ?? 0) > 0,
      );
      if (existingM) {
        const existingFamId = indis.get(existingM)!.fams![0]!;
        const existingFam = fams.get(existingFamId)!;
        addChildToFam(existingFam, child);
        return;
      }
    }

    const isSingleParent = rng() < params.singleParentProb;
    if (isSingleParent) {
      if (rng() < 0.5) {
        father = makePerson(parentGen, 'M');
      } else {
        mother = makePerson(parentGen, 'F');
      }
    } else {
      father = makePerson(parentGen, 'M');
      mother = makePerson(parentGen, 'F');
    }

    const fam = makeFamily(father?.id, mother?.id, parentGen);
    addChildToFam(fam, child);

    // Add siblings to this ancestor family
    const sibCount = Math.floor(rng() * params.maxSiblings);
    for (let s = 0; s < sibCount; s++) {
      const sib = makePerson(gen);
      addChildToFam(fam, sib);
      if (rng() < 0.45) {
        populateDescendants(sib, gen, 1 + Math.floor(rng() * 2));
      }
    }

    // Optional remarriages on direct ancestors (exercises Issue #30!)
    if (father && rng() < params.remarriageProb) {
      const extraWife = makePerson(parentGen, 'F');
      const extraFam = makeFamily(father.id, extraWife.id, parentGen);
      if (rng() < 0.25 && father.fams && father.fams.length === 2) {
        // Occasionally put the extra marriage BEFORE the main marriage in fams[]
        father.fams.reverse();
      }
      const halfSibs = Math.floor(rng() * (params.maxSiblings + 1));
      for (let hs = 0; hs < halfSibs; hs++) {
        const hsib = makePerson(gen);
        addChildToFam(extraFam, hsib);
      }
    }
    if (mother && rng() < params.remarriageProb) {
      const extraHusb = makePerson(parentGen, 'M');
      const extraFam = makeFamily(extraHusb.id, mother.id, parentGen);
      const halfSibs = Math.floor(rng() * (params.maxSiblings + 1));
      for (let hs = 0; hs < halfSibs; hs++) {
        const hsib = makePerson(gen);
        addChildToFam(extraFam, hsib);
      }
    }

    if (father) buildAncestors(father, parentGen, remDepth - 1);
    if (mother) buildAncestors(mother, parentGen, remDepth - 1);
  };

  // Build marriages and descendants downward from a person at `gen`
  const populateDescendants = (
    person: GeneratedIndi,
    gen: number,
    remDepth: number,
  ) => {
    if (remDepth <= 0 && rng() < 0.5) return;

    const marriageCount =
      rng() < 0.2
        ? 0
        : rng() < params.remarriageProb
          ? 2 + (rng() < 0.25 ? 1 : 0)
          : 1;

    for (let m = 0; m < marriageCount; m++) {
      const wantSingleParent = rng() < params.singleParentProb * 0.5;
      let spouse: GeneratedIndi | undefined;
      if (!wantSingleParent) {
        const desiredSex: 'M' | 'F' = person.sex === 'M' ? 'F' : 'M';
        const sameGenPool = (poolByGen.get(gen) ?? []).filter(
          (cid) =>
            cid !== person.id &&
            indis.get(cid)?.sex === desiredSex &&
            (indis.get(cid)?.fams?.length ?? 0) === 0 &&
            (!person.famc || indis.get(cid)?.famc !== person.famc || rng() < 0.3),
        );
        if (sameGenPool.length > 0 && rng() < params.pedigreeCollapseProb) {
          spouse = indis.get(pick(sameGenPool))!;
        } else {
          spouse = makePerson(gen, desiredSex);
          // If this is startPerson's first spouse, optionally give them ancestors too
          if (person.id === startPerson.id && m === 0 && params.ancestorGenerations > 0) {
            buildAncestors(spouse, gen, Math.max(1, params.ancestorGenerations - 1));
          }
        }
      }

      const husbId = person.sex === 'M' ? person.id : spouse?.id;
      const wifeId = person.sex === 'M' ? spouse?.id : person.id;
      const fam = makeFamily(husbId, wifeId, gen);

      if (remDepth > 0) {
        const childCount = Math.floor(rng() * (params.maxSiblings + 1));
        for (let c = 0; c < childCount; c++) {
          const child = makePerson(gen + 1);
          addChildToFam(fam, child);
          populateDescendants(child, gen + 1, remDepth - 1);
        }
      }
    }
  };

  buildAncestors(startPerson, 0, params.ancestorGenerations);
  populateDescendants(startPerson, 0, params.descendantGenerations);

  return {
    data: {
      indis: Array.from(indis.values()),
      fams: Array.from(fams.values()),
    },
    startIndi: startPerson.id,
  };
}

export type OracleSizingMode = 'simple' | 'withMarriage';
export type V3ChartKind = 'hourglass' | 'ancestor' | 'descendant' | 'relatives';

export interface SnapshotNode {
  id: string;
  generation: number;
  indiId?: string;
  spouseId?: string;
  familyId?: string;
  x: number;
  y: number;
}

export interface SnapshotChartResult {
  size: [number, number];
  origin: [number, number];
  nodes: SnapshotNode[];
  hasUnequalMultiMarriageRoot?: boolean;
  unequalRootAncDeltaY?: number;
}

export interface SnapshotScenario {
  id: string;
  source:
    | { kind: 'dataset'; file: string }
    | { kind: 'generated'; seed: number; params: GeneratorParams };
  startIndi: string;
  sizingMode: OracleSizingMode;
  hasRemarriedTraversedAncestor: boolean;
  hasSingleParentOrWideFamAncestor: boolean;
  charts: Record<V3ChartKind, SnapshotChartResult>;
}

export interface V3LayoutSnapshotsFile {
  version: 1;
  scenarios: SnapshotScenario[];
}
