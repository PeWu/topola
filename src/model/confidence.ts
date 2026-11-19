import { isModelGraph, toModelGraph } from './graph-adapter.js';
import type {
  ModelData,
  ModelDataInput,
  ModelGraph,
  PersonRecord,
} from './types.js';

/** Path value meaning "no rated link on the way" (above QUAY 0..3). */
const UNLIMITED = 4;

/**
 * A confidence as a level 0..4, whatever number the data has (2.5, -1), or
 * undefined if it has none (`null` in data read from JSON).
 */
function toLevel(value: number | null | undefined): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(UNLIMITED, Math.floor(value)));
}

/** Whether the person has a confidence that can lower anybody's certainty. */
function isRated(
  person: Pick<PersonRecord, 'confidence' | 'parentLinkConfidence'> | undefined,
): boolean {
  return (
    person !== undefined &&
    ((toLevel(person.confidence) ?? UNLIMITED) < UNLIMITED ||
      (toLevel(person.parentLinkConfidence) ?? UNLIMITED) < UNLIMITED)
  );
}

/**
 * Computes effective QUAY certainty (0..3) per person using widest-path
 * propagation from `startIndiId` over reconciled bidirectional `indi` <-> `fam`
 * links without mutating caller records.
 *
 * For `ModelData` the result has every rated person, also those the start
 * person is not related to (they keep their own confidence). For a
 * `ModelGraph`, which cannot list its people, it has the people reachable
 * from the start person.
 *
 * The search visits everybody the start person is related to. A caller that
 * asks for many start persons of one model (a chart that is refocused on
 * every click) can pass a set as `unrated` and keep it between the calls:
 * the function adds the people it finds to have no rated relative at all,
 * and answers at once for a `ModelGraph` when the start person is in the
 * set (for `ModelData` unrelated rated people are still returned). Use one
 * set per model, and a new one when the confidences change.
 */
export function computeConfidenceMap(
  input: ModelDataInput | ModelGraph,
  startIndiId: string,
  unrated?: Set<string>,
): Map<string, number> {
  if (isModelGraph(input)) {
    if (unrated?.has(startIndiId)) {
      return new Map();
    }
  } else {
    if (
      !input ||
      typeof input !== 'object' ||
      !Array.isArray(input.indis) ||
      !Array.isArray(input.fams)
    ) {
      throw new TypeError(
        'computeConfidenceMap() expects a ModelGraph or { indis, fams } model data.',
      );
    }
    if (!input.indis.some((indi) => Boolean(indi?.id) && isRated(indi))) {
      // Nobody is rated, so everybody is certain: no graph is needed.
      if (unrated) {
        for (const indi of input.indis) {
          if (indi?.id) unrated.add(indi.id);
        }
      }
      return new Map();
    }
  }
  const graph = toModelGraph(input);

  // Collect all person IDs known to graph; if raw ModelData was passed, iterate indis directly,
  // else discover via graph if ModelGraph was passed.
  const allPersonIds = new Set<string>();
  const knownFamilyIds = new Set<string>();
  if (!isModelGraph(input)) {
    for (const indi of input.indis) {
      if (indi?.id) allPersonIds.add(indi.id);
    }
    for (const fam of input.fams) {
      if (fam?.id && graph.hasFamily(fam.id)) knownFamilyIds.add(fam.id);
    }
  } else {
    // Seed from startIndiId + traverse reconciled graph components
    const queue: string[] = [];
    let anyRated = false;
    if (graph.hasPerson(startIndiId)) {
      allPersonIds.add(startIndiId);
      queue.push(startIndiId);
      anyRated = isRated(graph.getPerson(startIndiId));
    }
    /** Adds a person that has not been seen yet. */
    const visitPerson = (p: string | null): void => {
      if (p && !allPersonIds.has(p) && graph.hasPerson(p)) {
        allPersonIds.add(p);
        queue.push(p);
        anyRated ||= isRated(graph.getPerson(p));
      }
    };
    /** Adds the members of a family that have not been seen yet. */
    const visitFamily = (familyId: string | null): void => {
      if (
        !familyId ||
        knownFamilyIds.has(familyId) ||
        !graph.hasFamily(familyId)
      ) {
        return;
      }
      knownFamilyIds.add(familyId);
      const [h, w] = graph.getFamilyPartners(familyId);
      visitPerson(h);
      visitPerson(w);
      for (const child of graph.getFamilyChildren(familyId)) {
        visitPerson(child);
      }
    };
    while (queue.length > 0) {
      const pid = queue.pop()!;
      visitFamily(graph.getPersonParentFamily(pid));
      for (const sf of graph.getPersonSpouseFamilies(pid)) {
        visitFamily(sf);
      }
    }
    if (!anyRated) {
      // Nobody the start person is related to is rated: everybody is
      // certain, also from the point of view of any of them.
      if (unrated) {
        for (const pid of allPersonIds) unrated.add(pid);
      }
      return new Map();
    }
  }

  // The search works on numbers: person n is the n-th id of `allPersonIds`,
  // families are numbered as they come up. Links come from both sides so
  // that adopted / multi-family children (listed in `getFamilyChildren` of
  // a second family while `getPersonParentFamily` points at the first) and
  // one-sided links of custom graphs carry confidence too.
  const personIds = [...allPersonIds];
  const personIndex = new Map<string, number>();
  for (let n = 0; n < personIds.length; n++) {
    personIndex.set(personIds[n]!, n);
  }
  const familyNumbers = new Map<string, number>();
  const linkPerson: number[] = [];
  const linkFamily: number[] = [];
  const linkWeight: number[] = [];
  /** The links of every person. */
  const personLinks: number[][] = Array.from(
    { length: personIds.length },
    () => [],
  );
  /** The links of every family. */
  const familyLinks: number[][] = [];
  const addLink = (person: number, familyId: string, weight: number): void => {
    let family = familyNumbers.get(familyId);
    if (family === undefined) {
      family = familyLinks.length;
      familyNumbers.set(familyId, family);
      familyLinks.push([]);
    }
    const idx = linkPerson.length;
    personLinks[person]!.push(idx);
    familyLinks[family]!.push(idx);
    linkPerson.push(person);
    linkFamily.push(family);
    linkWeight.push(weight);
  };
  const parentWeight = (pid: string): number => {
    const person = graph.getPerson(pid);
    return (
      toLevel(person?.parentLinkConfidence) ??
      toLevel(person?.confidence) ??
      UNLIMITED
    );
  };
  let startPerson = -1;
  for (let n = 0; n < personIds.length; n++) {
    const pid = personIds[n]!;
    if (pid === startIndiId) startPerson = n;
    const famc = graph.getPersonParentFamily(pid);
    if (famc && graph.hasFamily(famc)) {
      knownFamilyIds.add(famc);
      addLink(n, famc, parentWeight(pid));
    }
    for (const famsId of graph.getPersonSpouseFamilies(pid)) {
      if (graph.hasFamily(famsId)) {
        knownFamilyIds.add(famsId);
        addLink(n, famsId, UNLIMITED);
      }
    }
  }
  for (const fid of knownFamilyIds) {
    for (const partnerId of graph.getFamilyPartners(fid)) {
      if (!partnerId) continue;
      const pIdx = personIndex.get(partnerId);
      if (
        pIdx !== undefined &&
        !graph.getPersonSpouseFamilies(partnerId).includes(fid)
      ) {
        addLink(pIdx, fid, UNLIMITED);
      }
    }
    const seenChildren = new Set<string>();
    for (const childId of graph.getFamilyChildren(fid)) {
      if (seenChildren.has(childId)) continue;
      seenChildren.add(childId);
      const cIdx = personIndex.get(childId);
      if (cIdx !== undefined && graph.getPersonParentFamily(childId) !== fid) {
        addLink(cIdx, fid, parentWeight(childId));
      }
    }
  }

  // Bucketed widest-path search (levels 4 down to 0). -1 stands for "not
  // reached"; a bucket holds people as n and families as -n - 1.
  const bestPerson = new Int8Array(personIds.length).fill(-1);
  const bestFamily = new Int8Array(familyLinks.length).fill(-1);
  const buckets: number[][] = [[], [], [], [], []];
  if (startPerson !== -1) {
    bestPerson[startPerson] = UNLIMITED;
    buckets[UNLIMITED]!.push(startPerson);
  }

  for (let level = UNLIMITED; level >= 0; level--) {
    const bucket = buckets[level]!;
    while (bucket.length > 0) {
      const node = bucket.pop()!;
      if (node >= 0) {
        if (bestPerson[node] !== level) continue;
        for (const link of personLinks[node]!) {
          const family = linkFamily[link]!;
          const val = Math.min(level, linkWeight[link]!);
          if (val > bestFamily[family]!) {
            bestFamily[family] = val;
            buckets[val]!.push(-family - 1);
          }
        }
      } else {
        const family = -node - 1;
        if (bestFamily[family] !== level) continue;
        for (const link of familyLinks[family]!) {
          const person = linkPerson[link]!;
          const val = Math.min(level, linkWeight[link]!);
          if (val > bestPerson[person]!) {
            bestPerson[person] = val;
            buckets[val]!.push(person);
          }
        }
      }
    }
  }

  const result = new Map<string, number>();
  for (let n = 0; n < personIds.length; n++) {
    const pid = personIds[n]!;
    const own = toLevel(graph.getPerson(pid)?.confidence) ?? UNLIMITED;
    const pathVal = bestPerson[n]!;
    const effective = pathVal !== -1 ? Math.min(own, pathVal) : own;
    if (effective < UNLIMITED) {
      result.set(pid, effective);
    }
  }
  return result;
}

/**
 * Returns a non-mutated copy of `ModelData` with each reachable person's
 * `confidence` updated to `min(ownConfidence, widestPathConfidence)` while
 * keeping `parentLinkConfidence` unchanged.
 */
export function propagateConfidence(
  data: ModelData,
  startIndiId: string,
): ModelData {
  const confMap = computeConfidenceMap(data, startIndiId);
  return {
    ...data,
    indis: data.indis.map((indi) => {
      if (!indi?.id) return indi;
      const effective = confMap.get(indi.id);
      if (effective === indi.confidence) {
        return indi;
      }
      const copy = { ...indi };
      if (effective === undefined) {
        delete copy.confidence;
      } else {
        copy.confidence = effective;
      }
      return copy;
    }),
  };
}
