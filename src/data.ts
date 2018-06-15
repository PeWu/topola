import {DataProvider, Fam, Indi} from './api';


export interface Date {
  qualifier?: string;
  day?: number;
  month?: number;
  year?: number;
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
  date?: Date;
  dateRange?: DateRange;
  place?: string;
  confirmed?: boolean;
}


/** Json representation of an individual. */
export interface JsonIndi {
  id: string;
  firstName?: string;
  lastName?: string;
  famc?: string;
  fams?: string[];
  birth?: JsonEvent;
  death?: JsonEvent;
}

/** Json representation of a family. */
export interface JsonFam {
  id: string;
  children?: string[];
  wife?: string;
  husb?: string;
  marriage: JsonEvent;
}

/** Json representation of Gedcom data. */
export interface JsonGedcomData {
  indis: JsonIndi[];
  fams: JsonFam[];
}

/** Details of an individual record. */
export interface IndiDetails extends Indi {
  getFirstName(): string|null;
  getLastName(): string|null;
  getBirthDate(): DateOrRange|null;
  getBirthPlace(): string|null;
  getDeathDate(): DateOrRange|null;
  getDeathPlace(): string|null;
  isConfirmedDeath(): boolean;
}


/** Details of a family record. */
export interface FamDetails extends Fam {
  getMarriageDate(): DateOrRange|null;
  getMarriagePlace(): string|null;
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
  getBirthDate(): DateOrRange|null {
    return this.json.birth || null;
  }
  getBirthPlace(): string|null {
    return this.json.birth && this.json.birth.place || null;
  }
  getDeathDate(): DateOrRange|null {
    return this.json.death || null;
  }
  getDeathPlace(): string|null {
    return this.json.death && this.json.death.place || null;
  }
  isConfirmedDeath(): boolean {
    return this.json.death && this.json.death.confirmed;
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
    return this.json.marriage;
  }
  getMarriagePlace() {
    return this.json.marriage && this.json.marriage.place || null;
  }
}

/** Implementation of the DataProvider interface based on Json input. */
export class JsonDataProvider implements DataProvider<IndiDetails, FamDetails> {
  readonly indis = new Map<string, IndiDetails>();
  readonly fams = new Map<string, FamDetails>();

  constructor(readonly json: JsonGedcomData) {
    json.indis.forEach(
        (indi) => this.indis.set(indi.id, new JsonIndiDetails(indi)));
    json.fams.forEach((fam) => this.fams.set(fam.id, new JsonFamDetails(fam)));
  }

  getIndi(id: string): IndiDetails|null {
    return this.indis.get(id) || null;
  }

  getFam(id: string): FamDetails|null {
    return this.fams.get(id) || null;
  }
}
