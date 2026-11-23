import type { FamilyGraph, Problem } from '../core/index.js';

export interface DateValue {
  qualifier?: string | undefined;
  day?: number | undefined;
  month?: number | undefined;
  year?: number | undefined;
  text?: string | undefined;
}

export interface DateRange {
  from?: DateValue | undefined;
  to?: DateValue | undefined;
}

export interface DateOrRange {
  date?: DateValue | undefined;
  dateRange?: DateRange | undefined;
}

export interface EventRecord extends DateOrRange {
  type?: string | undefined;
  place?: string | undefined;
  confirmed?: boolean | undefined;
  notes?: string[] | undefined;
  confidence?: number | undefined;
  extras?: Record<string, unknown> | undefined;
}

export interface MediaRecord {
  url: string;
  title?: string | undefined;
}

export interface PersonRecord {
  id: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  maidenName?: string | undefined;
  famc?: string | undefined;
  fams?: string[] | undefined;
  numberOfChildren?: number | undefined;
  numberOfMarriages?: number | undefined;
  birth?: EventRecord | undefined;
  death?: EventRecord | undefined;
  sex?: string | undefined;
  images?: MediaRecord[] | undefined;
  notes?: string[] | undefined;
  events?: EventRecord[] | undefined;
  hideId?: boolean | undefined;
  hideSex?: boolean | undefined;
  confidence?: number | undefined;
  parentLinkConfidence?: number | undefined;
  /** Occupations of the individual (GEDCOM OCCU), in order of appearance. */
  occupations?: string[] | undefined;
  /** Titles of the individual (GEDCOM TITL), in order of appearance. */
  titles?: string[] | undefined;
  extras?: Record<string, unknown> | undefined;
}

export interface FamilyRecord {
  id: string;
  husb?: string | undefined;
  wife?: string | undefined;
  children?: string[] | undefined;
  marriage?: EventRecord | undefined;
  notes?: string[] | undefined;
  events?: EventRecord[] | undefined;
  extras?: Record<string, unknown> | undefined;
}

export interface ModelData {
  indis: PersonRecord[];
  fams: FamilyRecord[];
}

/** A type as read-only data has it, all the way down. */
type DeepReadonly<T> = T extends readonly (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/**
 * `ModelData` as the library takes it: it changes neither the lists nor the
 * records, so data that is read-only (declared `as const`, or from an
 * immutable store) is accepted wherever a model is passed in. `ModelData` is
 * the same data as the type that can be written to, which `gedcomToModel`
 * returns.
 */
export interface ModelDataInput {
  readonly indis: readonly DeepReadonly<PersonRecord>[];
  readonly fams: readonly DeepReadonly<FamilyRecord>[];
}

export interface ModelGraph extends FamilyGraph {
  /** The record of the person, or nothing if no person has this id. */
  getPerson(id: string): PersonRecord | undefined;
  /** The record of the family, or nothing if no family has this id. */
  getFamily(id: string): FamilyRecord | undefined;
  readonly problems: readonly Problem[];
}
