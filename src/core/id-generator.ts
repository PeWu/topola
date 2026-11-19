/**
 * Assigns deterministic node IDs (`id`, `id:1`, `id:2`) in traversal order.
 * No id is issued twice, also when a requested id looks like an issued one
 * (`K:1` after two `K`).
 */
export class IdGenerator {
  private readonly counts = new Map<string, number>();
  private readonly issued: Set<string>;

  /** `reserved` ids are never issued, e.g. the ids of another generator. */
  constructor(reserved?: Iterable<string>) {
    this.issued = new Set(reserved);
  }

  /**
   * Returns an id that was not issued before: `id` itself the first time, then
   * `id:1`, `id:2` and so on.
   */
  getId(id: string): string {
    let count = this.counts.get(id) ?? 0;
    let candidate = count === 0 ? id : `${id}:${count}`;
    while (this.issued.has(candidate)) {
      count++;
      candidate = `${id}:${count}`;
    }
    this.counts.set(id, count + 1);
    this.issued.add(candidate);
    return candidate;
  }
}
