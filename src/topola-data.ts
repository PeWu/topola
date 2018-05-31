import {DataProvider, Fam, Indi} from './topola-api';

/** Json representation of an individual. */
export interface JsonIndi {
  id: string;
  name?: string;
  famc?: string;
  fams?: string[];
}

/** Json representation of a family. */
export interface JsonFam {
  id: string;
  children?: string[];
  wife?: string;
  husb?: string;
}

/** Json representation of Gedcom data. */
export interface JsonGedcomData {
  indis: JsonIndi[];
  fams: JsonFam[];
}

/** Details of an individual record. */
export interface IndiDetails extends Indi {
  getName(): string|null;
}

/** Details of a family record. */
export interface FamDetails extends Fam {}

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
  getName() {
    return this.json.name || null;
  }
}

/** Details of a family based on Json input. */
class JsonFamDetails implements Fam {
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
