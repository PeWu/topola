import * as d3 from 'd3';

import {DataProvider, Node, Renderer} from './topola-api';
import {FamDetails, IndiDetails} from './topola-data';

const BOX_HEIGHT = 30;
const MIN_WIDTH = 50;


/** Calculates the length of the given text in pixels when rendered. */
function getLength(text: string) {
  const x = d3.select('svg').append('text').text(text);
  const w = (x.node() as SVGTextContentElement).getComputedTextLength();
  x.remove();
  return w;
}


/** Simple rendering of an individual box showing only the person's name. */
export class SimpleRenderer implements Renderer {
  constructor(
      readonly dataProvider: DataProvider<IndiDetails, FamDetails>,
      readonly hrefFunc?: (id: string) => string) {}

  getPreferredSize(id: string): [number, number] {
    const width =
        Math.max(getLength(this.dataProvider.getIndi(id).getName()), MIN_WIDTH);
    return [width, BOX_HEIGHT];
  }

  render(selection: d3.Selection<
         d3.BaseType, d3.HierarchyPointNode<Node>, d3.BaseType, {}>): void {
    // Optionally add a link.
    const group = this.hrefFunc ?
        selection.append('a').attr(
            'href', (node) => this.hrefFunc(node.data.id)) :
        selection;

    // Box.
    group.append('rect')
        .attr('width', (node) => node.data.width)
        .attr('height', (node) => node.data.height);

    // Text.
    group.append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .attr(
            'transform',
            (d) => `translate(${d.data.width / 2}, ${d.data.height / 2})`)
        .text((d) => this.dataProvider.getIndi(d.data.id).getName());
  }
}
