import { FamDetails, IndiDetails } from './data';
import { HierarchyNode } from 'd3-hierarchy';
import {
  Renderer,
  RendererOptions,
  TreeNode,
  TreeNodeSelection,
  TreeEntry,
} from './api';

/** Renders person or married couple inside a sircle. */
export class CircleRenderer implements Renderer {
  constructor(readonly options: RendererOptions<IndiDetails, FamDetails>) {}

  getFamilyAnchor(node: TreeNode): [number, number] {
    return [0, 0];
  }

  getIndiAnchor(node: TreeNode): [number, number] {
    return [0, 0];
  }

  getSpouseAnchor(node: TreeNode): [number, number] {
    return [0, 0];
  }

  updateNodes(nodes: Array<HierarchyNode<TreeNode>>) {
    nodes.forEach((node) => {
      [node.data.width, node.data.height] = node.data.family
        ? [120, 120]
        : [80, 80];
    });
  }

  getName(entry: TreeEntry | undefined) {
    if (!entry) {
      return '';
    }
    const indi = this.options.data.getIndi(entry.id)!;
    const firstName = indi.getFirstName();
    return firstName ? firstName.split(' ')[0] : '';
  }

  render(enter: TreeNodeSelection, update: TreeNodeSelection): void {
    enter = enter.append('g').attr('class', 'circle');
    update = update.select('g');

    enter
      .append('circle')
      .attr('r', (node) => node.data.width! / 2)
      .attr('cx', (node) => node.data.width! / 2)
      .attr('cy', (node) => node.data.height! / 2);
    enter
      .filter((node) => !!node.data.family)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr(
        'transform',
        (node) =>
          `translate(${node.data.width! / 2}, ${node.data.height! / 2 - 4})`
      )
      .text((node) => this.getName(node.data.indi));
    enter
      .filter((node) => !!node.data.family)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr(
        'transform',
        (node) =>
          `translate(${node.data.width! / 2}, ${node.data.height! / 2 + 14})`
      )
      .text((node) => this.getName(node.data.spouse));
    enter
      .filter((node) => !node.data.family)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr(
        'transform',
        (node) =>
          `translate(${node.data.width! / 2}, ${node.data.height! / 2 + 4})`
      )
      .text((node) => this.getName(node.data.indi));
  }

  getCss() {
    return `
    circle {
      fill: white;
      stroke: #040;
      stroke-width: 5px;
    }
    .circle text {
      font-family: verdana, arial, sans-serif;
      font-size: 12px;
    }
    .background {
      stroke: none;
    }
    `;
  }
}
