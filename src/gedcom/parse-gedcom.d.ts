// Internal ambient type declaration for parse-gedcom scoped to src/gedcom/.
declare module 'parse-gedcom' {
  export interface RawGedcomEntry {
    level: number;
    pointer: string;
    tag: string;
    data: string;
    tree: RawGedcomEntry[];
  }

  export function parse(input: string): RawGedcomEntry[];
}
