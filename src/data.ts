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
  place?: string;
  confirmed?: boolean;
}

export interface JsonImage {
  url?: string;
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
  imageUrl?: JsonImage;
  images?: JsonImage[];
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
  getMainImage(): JsonImage | null;
  getAlbumImages(): JsonImage[] | null;
}

/** Details of a family record. */
export interface FamDetails extends Fam {
  getMarriageDate(): DateOrRange | null;
  getMarriagePlace(): string | null;
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
    return this.json.imageUrl && this.json.imageUrl.url || null;
  }
  getMainImage() {
    return this.json.imageUrl || null;
  }
  getAlbumImages() {
    return this.json.images || null;
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
}

/** Implementation of the DataProvider interface based on Json input. */
export class JsonDataProvider implements DataProvider<IndiDetails, FamDetails> {
  readonly indis = new Map<string, IndiDetails>();
  readonly fams = new Map<string, FamDetails>();

  constructor(readonly json: JsonGedcomData) {
    json.indis.forEach(indi =>
      this.indis.set(indi.id, new JsonIndiDetails(indi))
    );
    json.fams.forEach(fam => this.fams.set(fam.id, new JsonFamDetails(fam)));
  }

  getIndi(id: string): IndiDetails | null {
    return this.indis.get(id) || null;
  }

  getFam(id: string): FamDetails | null {
    return this.fams.get(id) || null;
  }
}
