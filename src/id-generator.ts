/** Provides unique identifiers. */
export class IdGenerator {
  readonly ids: Map<string, number> = new Map();

  /**
   * Returns the given identifier if it wasn't used before. Otherwise, appends
   * a number to the given identifier to make it unique.
   */
  getId(id: string): string {
    if (this.ids.has(id)) {
      const num = this.ids.get(id)!;
      this.ids.set(id, num + 1);
      return `${id}:${num}`;
    }
    this.ids.set(id, 1);
    return id;
  }
}
