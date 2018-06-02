import * as d3 from 'd3';

import {DataProvider, Renderer, TreeIndi, TreeNode, TreeNodeSelection} from './topola-api';
import {FamDetails, IndiDetails} from './topola-data';

const MIN_HEIGHT = 27;
const MIN_WIDTH = 50;


/** Calculates the length of the given text in pixels when rendered. */
function getLength(text: string) {
  const x = d3.select('svg').append('text').text(text);
  const w = (x.node() as SVGTextContentElement).getComputedTextLength();
  x.remove();
  return w;
}


function getYears(indi: IndiDetails) {
  const birthDate = indi.getBirthDate();
  const birthYear = birthDate && birthDate.date && birthDate.date.year;

  const deathDate = indi.getDeathDate();
  const deathYear = deathDate && deathDate.date && deathDate.date.year;

  if (!birthYear && !deathYear) {
    return '';
  }
  return `${birthYear || ''} – ${deathYear || ''}`;
}


/** Simple rendering of an individual box showing only the person's name. */
export class SimpleRenderer implements Renderer {
  constructor(
      readonly dataProvider: DataProvider<IndiDetails, FamDetails>,
      readonly hrefFunc?: (id: string) => string) {}

  getPreferredSize(id: string): [number, number] {
    const indi = this.dataProvider.getIndi(id);
    const years = getYears(indi);
    const width =
        Math.max(getLength(indi.getName()), getLength(years), MIN_WIDTH);
    const height = years ? MIN_HEIGHT + 14 : MIN_HEIGHT;
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
    const group = this.hrefFunc ?
        selection.append('a').attr(
            'href', (node) => this.hrefFunc(indiFunc(node.data).id)) :
        selection;

    // Box.
    group.append('rect')
        .attr('width', (node) => indiFunc(node.data).width)
        .attr('height', (node) => indiFunc(node.data).height);

    // Text.
    group.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'name')
        .attr(
            'transform',
            (node) => `translate(${indiFunc(node.data).width / 2}, 17)`)
        .text(
            (node) =>
                this.dataProvider.getIndi(indiFunc(node.data).id).getName());
    group.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'details')
        .attr(
            'transform',
            (node) => `translate(${indiFunc(node.data).width / 2}, 33)`)
        .text(
            (node) =>
                getYears(this.dataProvider.getIndi(indiFunc(node.data).id)));
  }
}
