import type { Problem } from '../core/index.js';
import type {
  FamilyRecord,
  ModelDataInput,
  ModelGraph,
  PersonRecord,
} from './types.js';

const EMPTY_STRINGS: readonly string[] = Object.freeze([]);
const EMPTY_PARTNERS: readonly [string | null, string | null] = Object.freeze([
  null,
  null,
]);

/** Whether the value is a `ModelGraph` and not plain `ModelData`. */
export function isModelGraph(
  value: ModelDataInput | ModelGraph,
): value is ModelGraph {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as ModelGraph).getPerson === 'function' &&
    typeof (value as ModelGraph).hasPerson === 'function'
  );
}

/** Returns the graph of a model: the model itself if it is a graph. */
export function toModelGraph(model: ModelDataInput | ModelGraph): ModelGraph {
  return isModelGraph(model) ? model : createModelGraph(model);
}

/**
 * Wraps plain `ModelData` (`{ indis, fams }`) into an O(1) `ModelGraph`
 * implementing `FamilyGraph` while reconciling asymmetric one-sided
 * `indi` <-> `fam` pointers without mutating caller records.
 *
 * What cannot be reconciled is reported in `problems`: of two records with
 * one id the last one is used, a link that is listed twice counts once, and
 * a person is not a spouse in a family whose two partner slots are taken by
 * other people (a partner that does not exist gives way to the person).
 */
export function createModelGraph(data: ModelDataInput): ModelGraph {
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray(data.indis) ||
    !Array.isArray(data.fams)
  ) {
    throw new TypeError(
      'createModelGraph() expects { indis, fams } model data.',
    );
  }
  // The graph hands the records out as they are; it does not write to them.
  const personMap = new Map<string, PersonRecord>();
  const familyMap = new Map<string, FamilyRecord>();
  const problems: Problem[] = [];

  for (const indi of data.indis as readonly PersonRecord[]) {
    if (!indi?.id) continue;
    if (personMap.has(indi.id)) {
      problems.push({
        code: 'DUPLICATE_ID',
        message: `Person "${indi.id}" has more than one record; the last one is used.`,
        entityId: indi.id,
      });
    }
    personMap.set(indi.id, indi);
  }
  for (const fam of data.fams as readonly FamilyRecord[]) {
    if (!fam?.id) continue;
    if (familyMap.has(fam.id)) {
      problems.push({
        code: 'DUPLICATE_ID',
        message: `Family "${fam.id}" has more than one record; the last one is used.`,
        entityId: fam.id,
      });
    }
    familyMap.set(fam.id, fam);
  }

  const parentFamilyByPerson = new Map<string, string | null>();
  const spouseFamiliesByPerson = new Map<string, string[]>();
  const partnersByFamily = new Map<string, [string | null, string | null]>();
  const childrenByFamily = new Map<string, string[]>();
  // The same links as sets, to look them up.
  const spouseFamilySets = new Map<string, Set<string>>();
  const childSets = new Map<string, Set<string>>();

  /** Copies a list of links; a link that is listed twice counts once. */
  const uniqueLinks = (
    ids: readonly string[] | undefined,
    describe: () => string,
    ownerId: string,
  ): Set<string> => {
    const nonEmpty = ids?.filter((id) => Boolean(id));
    const unique = new Set(nonEmpty);
    if (nonEmpty && unique.size !== nonEmpty.length) {
      problems.push({
        code: 'DUPLICATE_LINK',
        message: `${describe()} more than once.`,
        entityId: ownerId,
      });
    }
    return unique;
  };

  // Initialize from raw records
  for (const indi of personMap.values()) {
    parentFamilyByPerson.set(indi.id, indi.famc || null);
    const fams = uniqueLinks(
      indi.fams,
      () => `Person "${indi.id}" lists a family in fams`,
      indi.id,
    );
    spouseFamilySets.set(indi.id, fams);
    spouseFamiliesByPerson.set(indi.id, [...fams]);
  }
  for (const fam of familyMap.values()) {
    const husb = fam.husb || null;
    let wife = fam.wife || null;
    if (husb !== null && husb === wife) {
      wife = null;
      problems.push({
        code: 'DUPLICATE_LINK',
        message: `Family "${fam.id}" lists "${husb}" as both partners.`,
        entityId: fam.id,
      });
    }
    partnersByFamily.set(fam.id, [husb, wife]);
    const children = uniqueLinks(
      fam.children,
      () => `Family "${fam.id}" lists a child`,
      fam.id,
    );
    childSets.set(fam.id, children);
    childrenByFamily.set(fam.id, [...children]);
  }

  // Reconcile person -> family pointers
  for (const indi of personMap.values()) {
    if (indi.famc) {
      const famChildren = childrenByFamily.get(indi.famc);
      const famChildSet = childSets.get(indi.famc);
      if (!famChildren || !famChildSet) {
        problems.push({
          code: 'MISSING_FAMILY',
          message: `Person "${indi.id}" references missing famc "${indi.famc}".`,
          entityId: indi.famc,
        });
      } else if (!famChildSet.has(indi.id)) {
        famChildSet.add(indi.id);
        famChildren.push(indi.id);
        problems.push({
          code: 'ASYMMETRIC_CHILD_LINK',
          message: `Person "${indi.id}" has famc "${indi.famc}", but family did not list them in children.`,
          entityId: indi.id,
        });
      }
    }

    for (const famId of spouseFamilySets.get(indi.id)!) {
      const partners = partnersByFamily.get(famId);
      if (!partners) {
        problems.push({
          code: 'MISSING_FAMILY',
          message: `Person "${indi.id}" references missing fams "${famId}".`,
          entityId: famId,
        });
        continue;
      }
      if (partners[0] !== indi.id && partners[1] !== indi.id) {
        // The person takes an empty slot (a woman the second one first),
        // or else the slot of somebody who does not exist, who is reported
        // and gives way.
        const slots: ReadonlyArray<0 | 1> = indi.sex === 'F' ? [1, 0] : [0, 1];
        const isMissing = (slot: 0 | 1): boolean => {
          const partnerId = partners[slot];
          return partnerId !== null && !personMap.has(partnerId);
        };
        const slot =
          slots.find((s) => partners[s] === null) ?? slots.find(isMissing);
        if (slot !== undefined) {
          const missing = partners[slot];
          if (missing !== null) {
            problems.push({
              code: 'MISSING_PERSON',
              message: `Family "${famId}" references missing partner "${missing}".`,
              entityId: missing,
            });
          }
          partners[slot] = indi.id;
        } else {
          // Both slots are taken by others: the person is not a spouse here.
          spouseFamilySets.get(indi.id)!.delete(famId);
          spouseFamiliesByPerson.set(
            indi.id,
            spouseFamiliesByPerson.get(indi.id)!.filter((id) => id !== famId),
          );
          problems.push({
            code: 'UNRESOLVED_SPOUSE_LINK',
            message: `Person "${indi.id}" has fams "${famId}", but the family already has two other partners; the link is ignored.`,
            entityId: indi.id,
          });
          continue;
        }
        problems.push({
          code: 'ASYMMETRIC_SPOUSE_LINK',
          message: `Person "${indi.id}" has fams "${famId}", but family did not list them as partner.`,
          entityId: indi.id,
        });
      }
    }
  }

  // Reconcile family -> person pointers
  for (const fam of familyMap.values()) {
    const [husb, wife] = partnersByFamily.get(fam.id)!;
    for (const partnerId of [husb, wife]) {
      if (!partnerId) continue;
      const pFams = spouseFamiliesByPerson.get(partnerId);
      const pFamSet = spouseFamilySets.get(partnerId);
      if (!pFams || !pFamSet) {
        problems.push({
          code: 'MISSING_PERSON',
          message: `Family "${fam.id}" references missing partner "${partnerId}".`,
          entityId: partnerId,
        });
      } else if (!pFamSet.has(fam.id)) {
        pFamSet.add(fam.id);
        pFams.push(fam.id);
        problems.push({
          code: 'ASYMMETRIC_SPOUSE_LINK',
          message: `Family "${fam.id}" lists partner "${partnerId}", but person did not list "${fam.id}" in fams.`,
          entityId: fam.id,
        });
      }
    }

    for (const childId of childSets.get(fam.id)!) {
      if (!personMap.has(childId)) {
        problems.push({
          code: 'MISSING_PERSON',
          message: `Family "${fam.id}" references missing child "${childId}".`,
          entityId: childId,
        });
        continue;
      }
      const curFamc = parentFamilyByPerson.get(childId);
      if (!curFamc) {
        parentFamilyByPerson.set(childId, fam.id);
        problems.push({
          code: 'ASYMMETRIC_CHILD_LINK',
          message: `Family "${fam.id}" lists child "${childId}", but person had no famc.`,
          entityId: childId,
        });
      } else if (!familyMap.has(curFamc)) {
        // The family the person names does not exist; this one does.
        parentFamilyByPerson.set(childId, fam.id);
        problems.push({
          code: 'ASYMMETRIC_CHILD_LINK',
          message: `Family "${fam.id}" lists child "${childId}", whose famc "${curFamc}" does not exist.`,
          entityId: childId,
        });
      }
    }
  }

  return {
    problems,
    hasPerson(id: string): boolean {
      return personMap.has(id);
    },
    hasFamily(id: string): boolean {
      return familyMap.has(id);
    },
    getPerson(id: string): PersonRecord | undefined {
      return personMap.get(id);
    },
    getFamily(id: string): FamilyRecord | undefined {
      return familyMap.get(id);
    },
    getPersonParentFamily(personId: string): string | null {
      return parentFamilyByPerson.get(personId) ?? null;
    },
    getPersonSpouseFamilies(personId: string): readonly string[] {
      return spouseFamiliesByPerson.get(personId) ?? EMPTY_STRINGS;
    },
    getFamilyPartners(
      familyId: string,
    ): readonly [string | null, string | null] {
      return partnersByFamily.get(familyId) ?? EMPTY_PARTNERS;
    },
    getFamilyChildren(familyId: string): readonly string[] {
      return childrenByFamily.get(familyId) ?? EMPTY_STRINGS;
    },
  };
}
