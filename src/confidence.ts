import { JsonGedcomData } from './data';

/** Path value meaning "no rated link on the way". Above any QUAY value. */
const UNLIMITED = 4;

/**
 * Propagates relationship uncertainty outward from a start individual.
 *
 * Each individual's link to their parents is rated by parentLinkConfidence
 * (falling back to confidence). Everyone reached from the start individual only through a
 * weak link inherits that link's rating: if the start individual's father is
 * only rated QUAY 2, the father's parents, all their ancestors and the
 * father's siblings are rated at most 2. When there are several ways to reach
 * someone, the best one counts. Links between spouses are not rated.
 *
 * Returns a copy of the data in which each reachable individual's confidence
 * is the lower of their own confidence and the confidence of the best path
 * from the start individual. Other individuals keep their own confidence.
 */
export function propagateConfidence(
  data: JsonGedcomData,
  startId: string,
): JsonGedcomData {
  const edges = new Map<string, Array<[string, number]>>();
  const addEdge = (a: string, b: string, weight: number) => {
    if (!edges.has(a)) edges.set(a, []);
    if (!edges.has(b)) edges.set(b, []);
    edges.get(a)!.push([b, weight]);
    edges.get(b)!.push([a, weight]);
  };
  data.indis.forEach((indi) => {
    if (indi.famc) {
      const weight = indi.parentLinkConfidence ?? indi.confidence ?? UNLIMITED;
      addEdge(`i:${indi.id}`, `f:${indi.famc}`, weight);
    }
    (indi.fams || []).forEach((fam) =>
      addEdge(`i:${indi.id}`, `f:${fam}`, UNLIMITED),
    );
  });

  // Widest-path search: the value of a path is its weakest link. Values are
  // small integers, so process one bucket per value, best first.
  const best = new Map<string, number>();
  const buckets: string[][] = [[], [], [], [], []];
  const start = `i:${startId}`;
  best.set(start, UNLIMITED);
  buckets[UNLIMITED].push(start);
  for (let level = UNLIMITED; level >= 0; level--) {
    while (buckets[level].length) {
      const node = buckets[level].pop()!;
      if (best.get(node) !== level) {
        continue;
      }
      (edges.get(node) || []).forEach(([next, weight]) => {
        const value = Math.min(level, weight);
        if (value > (best.get(next) ?? -1)) {
          best.set(next, value);
          buckets[value].push(next);
        }
      });
    }
  }

  return {
    ...data,
    indis: data.indis.map((indi) => {
      const path = best.get(`i:${indi.id}`);
      if (path === undefined) {
        return indi;
      }
      const confidence = Math.min(indi.confidence ?? UNLIMITED, path);
      if (confidence === indi.confidence) {
        return indi;
      }
      const result = { ...indi };
      if (confidence === UNLIMITED) {
        delete result.confidence;
      } else {
        result.confidence = confidence;
      }
      return result;
    }),
  };
}
