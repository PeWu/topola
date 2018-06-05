import * as d3 from 'd3';
import {formatDefaultLocale} from 'd3';

import {DataProvider, Renderer, TreeIndi, TreeNode, TreeNodeSelection} from './topola-api';
import {Date, FamDetails, IndiDetails} from './topola-data';

const MIN_HEIGHT = 44;
const MIN_WIDTH = 50;


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
function getDetails(indi: IndiDetails): DetailsLine[] {
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


/**
 * Renders some details about a person such as date and place of birth
 * and death.
 */
export class DetailedRenderer implements Renderer {
  constructor(
      readonly dataProvider: DataProvider<IndiDetails, FamDetails>,
      readonly hrefFunc?: (id: string) => string) {}

  getPreferredSize(id: string): [number, number] {
    const indi = this.dataProvider.getIndi(id);
    const details = getDetails(indi);

    const height = MIN_HEIGHT + details.length * 14;

    const maxDetailsWidth = d3.max(details.map((x) => getLength(x.text)));
    const width = d3.max([
      maxDetailsWidth, getLength(indi.getFirstName()) + 8,
      getLength(indi.getLastName()) + 8, MIN_WIDTH
    ]);
    return [width, height];
  }

  render(selection: TreeNodeSelection): void {
    this.renderIndi(selection, (node) => node.indi);
    const spouseSelection =
        selection.filter((d) => !!d.data.spouse)
            .append('g')
            .attr(
                'transform',
                (node) => `translate(0, ${node.data.indi.height})`);
    this.renderIndi(spouseSelection, (node) => node.spouse);
  }

  private renderIndi(
      selection: TreeNodeSelection,
      indiFunc: (node: TreeNode) => TreeIndi): void {
    // Optionally add a link.
    selection = selection.append('g').attr('class', 'detailed');
    const group = this.hrefFunc ?
        selection.append('a').attr(
            'href', (node) => this.hrefFunc(indiFunc(node.data).id)) :
        selection;

    // Box.
    group.append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('width', (node) => indiFunc(node.data).width)
        .attr('height', (node) => indiFunc(node.data).height);

    // Name.
    group.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'name')
        .attr(
            'transform',
            (node) => `translate(${indiFunc(node.data).width / 2}, 17)`)
        .text(
            (node) => this.dataProvider.getIndi(indiFunc(node.data).id)
                          .getFirstName());
    group.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'name')
        .attr(
            'transform',
            (node) => `translate(${indiFunc(node.data).width / 2}, 33)`)
        .text(
            (node) => this.dataProvider.getIndi(indiFunc(node.data).id)
                          .getLastName());
    // Extract details.
    const details = new Map<string, DetailsLine[]>();
    group.each((node) => {
      const indiId = indiFunc(node.data).id;
      const indi = this.dataProvider.getIndi(indiId);
      const detailsList = getDetails(indi);
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
          .attr('text-anchor', 'left')
          .attr('class', 'details')
          .attr('transform', `translate(15, ${49 + i * 14})`)
          .text((node) => details.get(indiFunc(node.data).id)[i].text);
    }
  }
}
