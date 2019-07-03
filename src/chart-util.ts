import * as d3 from 'd3';
import { flextree } from 'd3-flextree';

import { ChartInfo, ChartOptions, TreeNode } from './api';

type SVGSelection = d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

/** Horizontal distance between boxes. */
export const H_SPACING = 15;
/** Vertical distance between boxes. */
export const V_SPACING = 30;
/** Margin around the whole drawing. */
const MARGIN = 15;

const HIDE_TIME_MS = 200;
const MOVE_TIME_MS = 500;

/** Assigns an identifier to a link. */
function linkId(node: d3.HierarchyPointNode<TreeNode>) {
  if (!node.parent) {
    return `${node.id}:A`;
  }
  const [child, parent] =
    node.data.generation! > node.parent.data.generation!
      ? [node.data, node.parent.data]
      : [node.parent.data, node.data];

  if (child.additionalMarriage) {
    return `${child.id}:A`;
  }
  return `${parent.id}:${child.id}`;
}

export function getChartInfo(
  nodes: Array<d3.HierarchyPointNode<TreeNode>>
): ChartInfo {
  // Calculate chart boundaries.
  const x0 = d3.min(nodes.map(d => d.x - d.data.width! / 2))! - MARGIN;
  const y0 = d3.min(nodes.map(d => d.y - d.data.height! / 2))! - MARGIN;
  const x1 = d3.max(nodes.map(d => d.x + d.data.width! / 2))! + MARGIN;
  const y1 = d3.max(nodes.map(d => d.y + d.data.height! / 2))! + MARGIN;
  return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
}

export function getChartInfoWithoutMargin(
  nodes: Array<d3.HierarchyPointNode<TreeNode>>
): ChartInfo {
  // Calculate chart boundaries.
  const x0 = d3.min(nodes.map(d => d.x - d.data.width! / 2))!;
  const y0 = d3.min(nodes.map(d => d.y - d.data.height! / 2))!;
  const x1 = d3.max(nodes.map(d => d.x + d.data.width! / 2))!;
  const y1 = d3.max(nodes.map(d => d.y + d.data.height! / 2))!;
  return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
}

/** Utility class with common code for all chart types. */
export class ChartUtil {
  constructor(readonly options: ChartOptions) {}

  /** Creates a path from parent to the child node (horizontal layout). */
  private linkHorizontal(
    s: d3.HierarchyPointNode<TreeNode>,
    d: d3.HierarchyPointNode<TreeNode>
  ) {
    const sAnchor = this.options.renderer.getFamilyAnchor(s.data);
    const dAnchor =
      s.id === d.data.spouseParentNodeId
        ? this.options.renderer.getSpouseAnchor(d.data)
        : this.options.renderer.getIndiAnchor(d.data);
    const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
    const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
    const midX = (s.x + s.data.width! / 2 + d.x - d.data.width! / 2) / 2;
    return `M ${sx} ${sy}
            L ${midX} ${sy},
              ${midX} ${dy},
              ${dx} ${dy}`;
  }

  /** Creates a path from parent to the child node (vertical layout). */
  private linkVertical(
    s: d3.HierarchyPointNode<TreeNode>,
    d: d3.HierarchyPointNode<TreeNode>
  ) {
    const sAnchor = this.options.renderer.getFamilyAnchor(s.data);
    const dAnchor =
      s.id === d.data.spouseParentNodeId
        ? this.options.renderer.getSpouseAnchor(d.data)
        : this.options.renderer.getIndiAnchor(d.data);
    const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
    const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
    const midY = s.y + s.data.height! / 2 + V_SPACING / 2;
    return `M ${sx} ${sy}
            L ${sx} ${midY},
              ${dx} ${midY},
              ${dx} ${dy}`;
  }

  private linkAdditionalMarriage(node: d3.HierarchyPointNode<TreeNode>) {
    const nodeIndex = node.parent!.children!.findIndex(
      n => n.data.id === node.data.id
    );
    // Assert nodeIndex > 0.
    const siblingNode = node.parent!.children![nodeIndex - 1];
    const sAnchor = this.options.renderer.getIndiAnchor(node.data);
    const dAnchor = this.options.renderer.getIndiAnchor(siblingNode.data);
    const [sx, sy] = [node.x + sAnchor[0], node.y + sAnchor[1]];
    const [dx, dy] = [siblingNode.x + dAnchor[0], siblingNode.y + dAnchor[1]];
    return `M ${sx}, ${sy}
            L ${dx}, ${dy}`;
  }

  updateSvgDimensions(chartInfo: ChartInfo) {
    const svg = d3.select(this.options.svgSelector);
    const group = svg.select('g');
    const transition = this.options.animate
      ? group
          .transition()
          .delay(HIDE_TIME_MS)
          .duration(MOVE_TIME_MS)
      : group;
    transition.attr(
      'transform',
      `translate(${chartInfo.origin[0]}, ${chartInfo.origin[1]})`
    );
  }

  layOutChart<N extends TreeNode>(
    root: d3.HierarchyNode<N>,
    flipVertically = false
  ): Array<d3.HierarchyPointNode<N>> {
    // Add styles so that calculating text size is correct.
    const svg = d3.select(this.options.svgSelector);
    if (svg.select('style').empty()) {
      svg.append('style').text(this.options.renderer.getCss());
    }

    // Assign generation number.
    root.each(node => {
      node.data.generation =
        node.depth * (flipVertically ? -1 : 1) +
        (this.options.baseGeneration || 0);
    });

    // Set preferred sizes.
    this.options.renderer.updateNodes(root.descendants());

    const vSizePerDepth = new Map<number, number>();
    root.each(node => {
      const depth = node.depth;
      const maxVSize = d3.max([
        this.options.horizontal ? node.data.width! : node.data.height!,
        vSizePerDepth.get(depth)!,
      ])!;
      vSizePerDepth.set(depth, maxVSize);
    });

    // Set sizes of whole nodes.
    root.each(node => {
      const vSize = vSizePerDepth.get(node.depth);
      if (this.options.horizontal) {
        node.data.width = vSize;
      } else {
        node.data.height = vSize;
      }
    });

    // Assigns the x and y position for the nodes.
    const treemap = flextree<N>()
      .nodeSize(node => {
        if (this.options.horizontal) {
          const maxChildSize =
            d3.max(node.children || [], n => n.data.width) || 0;
          return [
            node.data.height!,
            (maxChildSize + node.data.width!) / 2 + V_SPACING,
          ];
        }
        const maxChildSize =
          d3.max(node.children || [], n => n.data.height) || 0;
        return [
          node.data.width!,
          (maxChildSize + node.data.height!) / 2 + V_SPACING,
        ];
      })
      .spacing((a, b) => H_SPACING);
    const nodes = treemap(root).descendants();

    // Swap x-y coordinates for horizontal layout.
    nodes.forEach(node => {
      if (flipVertically) {
        node.y = -node.y;
      }
      if (this.options.horizontal) {
        [node.x, node.y] = [node.y, node.x];
      }
    });
    return nodes;
  }

  renderChart(nodes: Array<d3.HierarchyPointNode<TreeNode>>) {
    const svg = this.getSvgForRendering();
    this.renderNodes(nodes, svg);
    this.renderLinks(nodes, svg);
  }

  renderNodes(
    nodes: Array<d3.HierarchyPointNode<TreeNode>>,
    svg: SVGSelection
  ) {
    const boundNodes = svg
      .select('g')
      .selectAll('g.node')
      .data(nodes, (d: d3.HierarchyPointNode<TreeNode>) => d.id!);

    const nodeEnter = boundNodes.enter().append('g' as string);
    nodeEnter
      .merge(boundNodes)
      .attr(
        'class',
        (node: d3.HierarchyPointNode<TreeNode>) =>
          `node generation${node.data.generation}`
      );
    nodeEnter.attr(
      'transform',
      (node: d3.HierarchyPointNode<TreeNode>) =>
        `translate(${node.x - node.data.width! / 2}, ${node.y -
          node.data.height! / 2})`
    );
    if (this.options.animate) {
      nodeEnter
        .style('opacity', 0)
        .transition()
        .delay(HIDE_TIME_MS + MOVE_TIME_MS)
        .duration(HIDE_TIME_MS)
        .style('opacity', 1);
    }
    const updateTransition = this.options.animate
      ? boundNodes
          .transition()
          .delay(HIDE_TIME_MS)
          .duration(MOVE_TIME_MS)
      : boundNodes;
    updateTransition.attr(
      'transform',
      (node: d3.HierarchyPointNode<TreeNode>) =>
        `translate(${node.x - node.data.width! / 2}, ${node.y -
          node.data.height! / 2})`
    );
    this.options.renderer.render(nodeEnter, boundNodes);
    if (this.options.animate) {
      boundNodes
        .exit()
        .transition()
        .duration(HIDE_TIME_MS)
        .style('opacity', 0)
        .remove();
    } else {
      boundNodes.exit().remove();
    }
  }

  renderLinks(
    nodes: Array<d3.HierarchyPointNode<TreeNode>>,
    svg: SVGSelection
  ) {
    const link = (
      parent: d3.HierarchyPointNode<TreeNode>,
      child: d3.HierarchyPointNode<TreeNode>
    ) => {
      if (child.data.additionalMarriage) {
        return this.linkAdditionalMarriage(child);
      }
      const flipVertically = parent.data.generation! > child.data.generation!;
      if (this.options.horizontal) {
        if (flipVertically) {
          return this.linkHorizontal(child, parent);
        }
        return this.linkHorizontal(parent, child);
      }
      if (flipVertically) {
        return this.linkVertical(child, parent);
      }
      return this.linkVertical(parent, child);
    };

    const links = nodes.filter(n => !!n.parent || n.data.additionalMarriage);
    const boundLinks = svg
      .select('g')
      .selectAll('path.link')
      .data(links, linkId);
    const path = boundLinks
      .enter()
      .insert('path', 'g')
      .attr('class', node =>
        node.data.additionalMarriage ? 'link additional-marriage' : 'link'
      )
      .attr('d', node => link(node.parent!, node));

    const linkTransition = this.options.animate
      ? boundLinks
          .transition()
          .delay(HIDE_TIME_MS)
          .duration(MOVE_TIME_MS)
      : boundLinks;
    linkTransition.attr('d', node => link(node.parent!, node));

    if (this.options.animate) {
      path
        .style('opacity', 0)
        .transition()
        .delay(2 * HIDE_TIME_MS + MOVE_TIME_MS)
        .duration(0)
        .style('opacity', 1);
    }
    if (this.options.animate) {
      boundLinks
        .exit()
        .transition()
        .duration(0)
        .style('opacity', 0)
        .remove();
    } else {
      boundLinks.exit().remove();
    }
  }

  getSvgForRendering(): SVGSelection {
    const svg = d3.select(this.options.svgSelector);
    if (svg.select('g').empty()) svg.append('g');
    return svg;
  }
}
