import * as d3 from 'd3';
import {formatDefaultLocale} from 'd3';

import {DataProvider, Renderer, RendererOptions, TreeIndi, TreeNode, TreeNodeSelection} from './api';
import {Date, FamDetails, IndiDetails} from './data';

const INDI_MIN_HEIGHT = 58;
const INDI_MIN_WIDTH = 50;
const FAM_MIN_HEIGHT = 15;
const FAM_MIN_WIDTH = 15;


/** Calculates the length of the given text in pixels when rendered. */
function getLength(text: string) {
  const x = d3.select('svg')
                .append('g')
                .attr('class', 'detailed node')
                .append('text')
                .attr('class', 'name')
                .text(text);
  const w = (x.node() as SVGTextContentElement).getComputedTextLength();
  x.remove();
  return w;
}


const MONTHS: Map<number, string> = new Map([
  [1, 'Jan'],
  [2, 'Feb'],
  [3, 'Mar'],
  [4, 'Apr'],
  [5, 'May'],
  [6, 'Jun'],
  [7, 'Jul'],
  [8, 'Aug'],
  [9, 'Sep'],
  [10, 'Oct'],
  [11, 'Nov'],
  [12, 'Dec'],
]);


const SEX_SYMBOLS: Map<string, string> =
    new Map([['F', '\u2640'], ['M', '\u2642']]);


/** Simple date formatter. */
function formatDate(date: Date) {
  return [
    date.qualifier, date.day, date.month && MONTHS.get(date.month), date.year
  ].join(' ');
}


interface DetailsLine {
  symbol: string;
  text: string;
}


/** Extracts lines of details for a person. */
function getIndiDetails(indi: IndiDetails): DetailsLine[] {
  const detailsList: DetailsLine[] = [];
  const birthDate = indi.getBirthDate() && indi.getBirthDate().date &&
      formatDate(indi.getBirthDate().date);
  const birthPlace = indi.getBirthPlace();
  const deathDate = indi.getDeathDate() && indi.getDeathDate().date &&
      formatDate(indi.getDeathDate().date);
  const deathPlace = indi.getDeathPlace();
  if (birthDate) {
    detailsList.push({symbol: '', text: birthDate});
  }
  if (birthPlace) {
    detailsList.push({symbol: '', text: birthPlace});
  }
  if (birthDate || birthPlace) {
    detailsList[0].symbol = '*';
  }
  const listIndex = detailsList.length;
  if (deathDate) {
    detailsList.push({symbol: '', text: deathDate});
  }
  if (deathPlace) {
    detailsList.push({symbol: '', text: deathPlace});
  }
  if (deathDate || deathPlace) {
    detailsList[listIndex].symbol = '+';
  }
  return detailsList;
}


/** Extracts lines of details for a family. */
function getFamDetails(fam: FamDetails): DetailsLine[] {
  const detailsList: DetailsLine[] = [];
  const marriageDate = fam.getMarriageDate() && fam.getMarriageDate().date &&
      formatDate(fam.getMarriageDate().date);
  const marriagePlace = fam.getMarriagePlace();
  if (marriageDate) {
    detailsList.push({symbol: '', text: marriageDate});
  }
  if (marriagePlace) {
    detailsList.push({symbol: '', text: marriagePlace});
  }
  if (marriageDate || marriagePlace) {
    detailsList[0].symbol = '\u26AD';
  }
  return detailsList;
}


/**
 * Renders some details about a person such as date and place of birth
 * and death.
 */
export class DetailedRenderer implements Renderer {
  constructor(readonly options: RendererOptions<IndiDetails, FamDetails>) {}

  getPreferredIndiSize(id: string): [number, number] {
    const indi = this.options.data.getIndi(id);
    const details = getIndiDetails(indi);

    const height = INDI_MIN_HEIGHT + details.length * 14;

    const maxDetailsWidth = d3.max(details.map((x) => getLength(x.text)));
    const width = d3.max([
      maxDetailsWidth + 8,
      getLength(indi.getFirstName()) + 8,
      getLength(indi.getLastName()) + 8,
      INDI_MIN_WIDTH,
    ]);
    return [width, height];
  }

  getPreferredFamSize(id: string): [number, number] {
    const fam = this.options.data.getFam(id);
    const details = getFamDetails(fam);

    const height = d3.max([10 + details.length * 14, FAM_MIN_HEIGHT]);
    const maxDetailsWidth = d3.max(details.map((x) => getLength(x.text)));
    const width = d3.max([maxDetailsWidth + 8, FAM_MIN_WIDTH]);
    return [width, height];
  }

  render(selection: TreeNodeSelection): void {
    this.renderIndi(selection, (node) => node.indi);
    const spouseSelection =
        selection.filter((node) => !!node.data.spouse)
            .append('g')
            .attr(
                'transform',
                (node) => this.options.horizontal ?
                    `translate(0, ${node.data.indi.height})` :
                    `translate(${node.data.indi.width}, 0)`);
    this.renderIndi(spouseSelection, (node) => node.spouse);
    const familySelection =
        selection.filter((node) => !!node.data.family)
            .append('g')
            .attr(
                'transform',
                (node) => this.options.horizontal ?
                    `translate(${node.data.indi.width}, ${
                        node.data.indi.height - node.data.family.height / 2})` :
                    `translate(${
                        node.data.indi.width -
                        node.data.family.width /
                            2}, ${node.data.indi.height})`);
    this.renderFamily(familySelection);
  }

  private renderIndi(
      selection: TreeNodeSelection,
      indiFunc: (node: TreeNode) => TreeIndi): void {
    // Optionally add a link.
    selection = selection.append('g').attr('class', 'detailed');
    const group = this.options.indiHrefFunc ?
        selection.append('a').attr(
            'href',
            (node) => this.options.indiHrefFunc(indiFunc(node.data).id)) :
        selection;

    // Box.
    group.append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('width', (node) => indiFunc(node.data).width)
        .attr('height', (node) => indiFunc(node.data).height);

    const getIndi = (node: d3.HierarchyPointNode<TreeNode>) =>
        this.options.data.getIndi(indiFunc(node.data).id);

    // Name.
    group.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'name')
        .attr(
            'transform',
            (node) => `translate(${indiFunc(node.data).width / 2}, 17)`)
        .text((node) => getIndi(node).getFirstName());
    group.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'name')
        .attr(
            'transform',
            (node) => `translate(${indiFunc(node.data).width / 2}, 33)`)
        .text((node) => getIndi(node).getLastName());
    // Extract details.
    const details = new Map<string, DetailsLine[]>();
    group.each((node) => {
      const indiId = indiFunc(node.data).id;
      const indi = this.options.data.getIndi(indiId);
      const detailsList = getIndiDetails(indi);
      details.set(indiId, detailsList);
    });

    const maxDetails = d3.max(Array.from(details.values(), (v) => v.length));

    // Render details.
    for (let i = 0; i < maxDetails; ++i) {
      const lineGroup = group.filter(
          (node) => details.get(indiFunc(node.data).id).length > i);
      lineGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('class', 'details')
          .attr('transform', `translate(9, ${49 + i * 14})`)
          .text((node) => details.get(indiFunc(node.data).id)[i].symbol);
      lineGroup.append('text')
          .attr('class', 'details')
          .attr('transform', `translate(15, ${49 + i * 14})`)
          .text((node) => details.get(indiFunc(node.data).id)[i].text);
    }

    // Render id.
    group.append('text')
        .attr('class', 'id')
        .attr(
            'transform',
            (node) => `translate(9, ${indiFunc(node.data).height - 5})`)
        .text((node) => indiFunc(node.data).id);

    // Render sex.
    group.append('text')
        .attr('class', 'details')
        .attr('text-anchor', 'end')
        .attr(
            'transform',
            (node) => `translate(${indiFunc(node.data).width - 5}, ${
                indiFunc(node.data).height - 5})`)
        .text((node) => SEX_SYMBOLS.get(getIndi(node).getSex()));
  }

  renderFamily(selection: TreeNodeSelection) {
    selection = selection.append('g').attr('class', 'detailed');
    const group = this.options.famHrefFunc ?
        selection.append('a').attr(
            'href', (node) => this.options.famHrefFunc(node.data.family.id)) :
        selection;

    // Box.
    group.append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('width', (node) => node.data.family.width)
        .attr('height', (node) => node.data.family.height);

    // Extract details.
    const details = new Map<string, DetailsLine[]>();
    group.each((node) => {
      const famId = node.data.family.id;
      const fam = this.options.data.getFam(famId);
      const detailsList = getFamDetails(fam);
      details.set(famId, detailsList);
    });
    const maxDetails = d3.max(Array.from(details.values(), (v) => v.length));

    // Render details.
    for (let i = 0; i < maxDetails; ++i) {
      const lineGroup =
          group.filter((node) => details.get(node.data.family.id).length > i);
      lineGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('class', 'details')
          .attr('transform', `translate(9, ${16 + i * 14})`)
          .text((node) => details.get(node.data.family.id)[i].symbol);
      lineGroup.append('text')
          .attr('text-anchor', 'left')
          .attr('class', 'details')
          .attr('transform', `translate(15, ${16 + i * 14})`)
          .text((node) => details.get(node.data.family.id)[i].text);
    }
  }
}
