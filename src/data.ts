import { DataProvider, Fam, Indi } from './api';

export interface Date {
  qualifier?: string;
  day?: number;
  month?: number;
  year?: number;
  // Free-form representation of the date, not meant to be parsed.
  text?: string;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DateOrRange {
  date?: Date;
  dateRange?: DateRange;
}

export interface JsonEvent extends DateOrRange {
  type?: string;
  place?: string;
  confirmed?: boolean;
  notes?: string[];
  /**
   * Certainty of the event: the highest GEDCOM QUAY value (0-3) among its
   * source citations. Undefined if no citation has a QUAY value.
   */
  confidence?: number;
}

export interface JsonImage {
  url: string;
  title?: string;
}

/** Json representation of an individual. */
export interface JsonIndi {
  id: string;
  firstName?: string;
  lastName?: string;
  maidenName?: string;
  famc?: string;
  fams?: string[];
  numberOfChildren?: number;
  numberOfMarriages?: number;
  birth?: JsonEvent;
  death?: JsonEvent;
  sex?: string;
  images?: JsonImage[];
  notes?: string[];
  events?: JsonEvent[];
  hideId?: boolean;
  hideSex?: boolean;
  /**
   * Certainty of the individual and their parentage: the highest GEDCOM QUAY
   * value (0-3) among citations on the individual record and on their birth,
   * christening or baptism. Undefined if no citation has a QUAY value.
   */
  confidence?: number;
  /**
   * Certainty (QUAY 0-3) of the link between the individual and their
   * parents. Taken from the same citations as `confidence`, but unlike it,
   * not changed by propagateConfidence().
   */
  parentLinkConfidence?: number;
}

/** Json representation of a family. */
export interface JsonFam {
  id: string;
  children?: string[];
  wife?: string;
  husb?: string;
  marriage?: JsonEvent;
}

/** Json representation of Gedcom data. */
export interface JsonGedcomData {
  indis: JsonIndi[];
  fams: JsonFam[];
}

/** Details of an individual record. */
export interface IndiDetails extends Indi {
  getFirstName(): string | null;
  getLastName(): string | null;
  getMaidenName(): string | null;
  getNumberOfChildren(): number | null;
  getNumberOfMarriages(): number | null;
  getMaidenName(): string | null;
  getBirthDate(): DateOrRange | null;
  getBirthPlace(): string | null;
  getDeathDate(): DateOrRange | null;
  getDeathPlace(): string | null;
  isConfirmedDeath(): boolean;
  getSex(): string | null;
  getImageUrl(): string | null;
  getImages(): JsonImage[] | null;
  getNotes(): string[] | null;
  getEvents(): JsonEvent[] | null;
  showId(): boolean;
  showSex(): boolean;
  /** QUAY-based certainty (0-3) of the individual, if known. */
  getConfidence?(): number | null;
  /** QUAY-based certainty (0-3) of the link to the parents, if known. */
  getParentLinkConfidence?(): number | null;
  /** QUAY-based certainty (0-3) of the birth event, if known. */
  getBirthConfidence?(): number | null;
  /** QUAY-based certainty (0-3) of the death event, if known. */
  getDeathConfidence?(): number | null;
}

/** Details of a family record. */
export interface FamDetails extends Fam {
  getMarriageDate(): DateOrRange | null;
  getMarriagePlace(): string | null;
  /** QUAY-based certainty (0-3) of the marriage event, if known. */
  getMarriageConfidence?(): number | null;
}

/** Details of an individual based on Json input. */
class JsonIndiDetails implements IndiDetails {
  constructor(readonly json: JsonIndi) {}
  getId() {
    return this.json.id;
  }
  getFamiliesAsSpouse() {
    return this.json.fams || [];
  }
  getFamilyAsChild() {
    return this.json.famc || null;
  }
  getFirstName() {
    return this.json.firstName || null;
  }
  getLastName() {
    return this.json.lastName || null;
  }
  getBirthDate() {
    return this.json.birth || null;
  }
  getMaidenName() {
    return this.json.maidenName || null;
  }
  getNumberOfChildren() {
    return this.json.numberOfChildren || null;
  }
  getNumberOfMarriages() {
    return this.json.numberOfMarriages || null;
  }
  getBirthPlace() {
    return (this.json.birth && this.json.birth.place) || null;
  }
  getDeathDate() {
    return this.json.death || null;
  }
  getDeathPlace() {
    return (this.json.death && this.json.death.place) || null;
  }
  isConfirmedDeath() {
    return !!this.json.death && !!this.json.death.confirmed;
  }
  getSex() {
    return this.json.sex || null;
  }
  getImageUrl() {
    return (
      (this.json.images &&
        this.json.images.length > 0 &&
        this.json.images[0].url) ||
      null
    );
  }
  getImages() {
    return this.json.images || null;
  }
  getNotes() {
    return this.json.notes || null;
  }
  getEvents() {
    return this.json.events || null;
  }
  showId() {
    return !this.json.hideId;
  }
  showSex() {
    return !this.json.hideSex;
  }
  getConfidence() {
    return this.json.confidence ?? null;
  }
  getParentLinkConfidence() {
    return this.json.parentLinkConfidence ?? null;
  }
  getBirthConfidence() {
    return this.json.birth?.confidence ?? null;
  }
  getDeathConfidence() {
    return this.json.death?.confidence ?? null;
  }
}

/** Details of a family based on Json input. */
class JsonFamDetails implements FamDetails {
  constructor(readonly json: JsonFam) {}
  getId() {
    return this.json.id;
  }
  getFather() {
    return this.json.husb || null;
  }
  getMother() {
    return this.json.wife || null;
  }
  getChildren() {
    return this.json.children || [];
  }
  getMarriageDate() {
    return this.json.marriage || null;
  }
  getMarriagePlace() {
    return (this.json.marriage && this.json.marriage.place) || null;
  }
  getMarriageConfidence() {
    return this.json.marriage?.confidence ?? null;
  }
}

/** Implementation of the DataProvider interface based on Json input. */
export class JsonDataProvider implements DataProvider<IndiDetails, FamDetails> {
  readonly indis = new Map<string, IndiDetails>();
  readonly fams = new Map<string, FamDetails>();

  constructor(readonly json: JsonGedcomData) {
    json.indis.forEach((indi) =>
      this.indis.set(indi.id, new JsonIndiDetails(indi)),
    );
    json.fams.forEach((fam) => this.fams.set(fam.id, new JsonFamDetails(fam)));
  }

  getIndi(id: string): IndiDetails | null {
    return this.indis.get(id) || null;
  }

  getFam(id: string): FamDetails | null {
    return this.fams.get(id) || null;
  }
}
