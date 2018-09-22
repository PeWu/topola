import * as d3 from 'd3';
import {flextree} from 'd3-flextree';

import {ChartInfo, ChartOptions, TreeIndi, TreeNode} from './api';

/** Horizontal distance between boxes. */
const H_SPACING = 15;
/** Vertical distance between boxes. */
const V_SPACING = 30;
/** Margin around the whole drawing. */
const MARGIN = 15;

const HIDE_TIME_MS = 200;
const MOVE_TIME_MS = 500;


/** Assigns an identifier to a link. */
function linkId(node: d3.HierarchyPointNode<TreeNode>) {
  return node.data.generation > node.parent.data.generation ?
      `${node.parent.id}:${node.id}` :
      `${node.id}:${node.parent.id}`;
}


/** Utility class with common code for all chart types. */
export class ChartUtil {
  constructor(readonly options: ChartOptions) {}

  /** Returns the horizontal size. */
  private getHSize(node: TreeNode): number {
    if (this.options.horizontal) {
      return (node.indi && node.indi.height || 0) +
          (node.spouse && node.spouse.height || 0);
    }
    const indiHSize = (node.indi && node.indi.width || 0) +
        (node.spouse && node.spouse.width || 0);
    return d3.max([indiHSize, node.family && node.family.width]);
  }

  /** Returns the vertical size. */
  private getVSize(node: TreeNode): number {
    return this.getIndiVSize(node) + this.getFamVSize(node);
  }

  private getFamVSize(node: TreeNode): number {
    if (this.options.horizontal) {
      return node.family && node.family.width || 0;
    }
    return node.family && node.family.height || 0;
  }

  /** Returns the vertical size of individual boxes. */
  private getIndiVSize(node: TreeNode): number {
    if (this.options.horizontal) {
      return d3.max(
          [node.indi && node.indi.width, node.spouse && node.spouse.width]);
    }
    return d3.max(
        [node.indi && node.indi.height, node.spouse && node.spouse.height]);
  }

  /** Creates a path from parent to the child node (horizontal layout). */
  private linkHorizontal(
      s: d3.HierarchyPointNode<TreeNode>, d: d3.HierarchyPointNode<TreeNode>) {
    const midX = (s.x + s.data.width / 2 + d.x - d.data.width / 2) / 2;
    const sx = s.x - s.data.width / 2 + this.getIndiVSize(s.data) / 2;
    const sy = s.y -
        (s.data.indi && s.data.spouse &&
             (s.data.height / 2 - s.data.indi.height) ||
         0);
    const dx = d.x - d.data.width / 2 + this.getIndiVSize(d.data) / 2;
    const dy = d.data.spouse ?
        (s.data.parentsOfSpouse ?
             d.y + (d.data.indi && (d.data.indi.height / 2) || 0) :
             d.y - d.data.spouse.height / 2) :
        d.y;
    return `M ${sx} ${sy}
            L ${midX} ${sy},
              ${midX} ${dy},
              ${dx} ${dy}`;
  }

  /** Creates a path from parent to the child node (vertical layout). */
  private linkVertical(
      s: d3.HierarchyPointNode<TreeNode>, d: d3.HierarchyPointNode<TreeNode>) {
    const midY = (s.y + s.data.height / 2 + d.y - d.data.height / 2) / 2;
    const sx = s.x -
        (s.data.indi && s.data.spouse &&
             (s.data.width / 2 - s.data.indi.width) ||
         0);
    const sy = s.y - s.data.height / 2 + this.getIndiVSize(s.data) / 2;
    const dx = d.data.spouse ?
        (s.data.parentsOfSpouse ?
             d.x + (d.data.indi && (d.data.indi.width / 2) || 0) :
             d.x - d.data.spouse.width / 2) :
        d.x;
    const dy = d.y - d.data.height / 2 + this.getIndiVSize(d.data) / 2;
    return `M ${sx} ${sy}
            L ${sx} ${midY},
              ${dx} ${midY},
              ${dx} ${dy}`;
  }

  private linkAdditionalMarriage(node: d3.HierarchyPointNode<TreeNode>) {
    const nodeIndex = node.parent.children.findIndex((n) => n.id === node.id);
    // Assert nodeIndex > 0.
    const siblingNode = node.parent.children[nodeIndex - 1];
    const sx = node.x + (node.data.indi.width - node.data.width) / 2;
    const sy = node.y + (node.data.indi.height - node.data.height) / 2;
    const dx = siblingNode.x +
        (siblingNode.data.indi.width - siblingNode.data.width) / 2;
    const dy = siblingNode.y +
        (siblingNode.data.indi.height - siblingNode.data.height) / 2;
    return `M ${sx}, ${sy}
            L ${dx}, ${dy}`;
  }

  private setPreferredIndiSize(indi: TreeIndi|undefined): void {
    if (!indi) {
      return;
    }
    [indi.width, indi.height] =
        this.options.renderer.getPreferredIndiSize(indi.id);
  }

  getChartInfo(nodes: Array<d3.HierarchyPointNode<TreeNode>>): ChartInfo {
    // Calculate chart boundaries.
    const x0 = d3.min(nodes.map((d) => d.x - d.data.width / 2)) - MARGIN;
    const y0 = d3.min(nodes.map((d) => d.y - d.data.height / 2)) - MARGIN;
    const x1 = d3.max(nodes.map((d) => d.x + d.data.width / 2)) + MARGIN;
    const y1 = d3.max(nodes.map((d) => d.y + d.data.height / 2)) + MARGIN;
    return {size: [x1 - x0, y1 - y0], origin: [-x0, -y0]};
  }

  updateSvgDimensions(chartInfo: ChartInfo) {
    const svg = d3.select(this.options.svgSelector);
    const group = svg.select('g');
    const transition = this.options.animate ?
        group.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS) :
        group;
    transition.attr(
        'transform',
        `translate(${chartInfo.origin[0]}, ${chartInfo.origin[1]})`);
  }

  layOutChart(root: d3.HierarchyNode<TreeNode>, flipVertically = false):
      Array<d3.HierarchyPointNode<TreeNode>> {
    // Add styles so that calculating text size is correct.
    const svg = d3.select(this.options.svgSelector);
    if (svg.select('style').empty()) {
      svg.append('style').text(this.options.renderer.getCss());
    }

    const treemap =
        flextree<TreeNode>()
            .nodeSize((node) => {
              if (this.options.horizontal) {
                const maxChildSize =
                    d3.max(node.children || [], (n) => n.data.width) || 0;
                return [
                  node.data.height,
                  (maxChildSize + node.data.width) / 2 + V_SPACING
                ];
              }
              const maxChildSize =
                  d3.max(node.children || [], (n) => n.data.height) || 0;
              return [
                node.data.width,
                (maxChildSize + node.data.height) / 2 + V_SPACING
              ];
            })
            .spacing((a, b) => H_SPACING);

    // Assign generation number.
    root.each((node) => {
      node.data.generation = node.depth * (flipVertically ? -1 : 1) +
          (this.options.baseGeneration || 0);
    });

    // Set preferred sizes.
    root.each((node) => {
      this.setPreferredIndiSize(node.data.indi);
      this.setPreferredIndiSize(node.data.spouse);
      if (node.data.family) {
        [node.data.family.width, node.data.family.height] =
            this.options.renderer.getPreferredFamSize(node.data.family.id);
      }
    });

    // Calculate individual vertical size per depth.
    const indiVSizePerDepth = new Map<number, number>();
    root.each((node) => {
      const depth = node.depth;
      const maxIndiVSize = d3.max([
        this.getIndiVSize(node.data),
        indiVSizePerDepth.get(depth),
      ]);
      indiVSizePerDepth.set(depth, maxIndiVSize);
    });

    // Set same width for each depth.
    root.each((node) => {
      if (this.options.horizontal) {
        if (node.data.indi) {
          node.data.indi.width = indiVSizePerDepth.get(node.depth);
        }
        if (node.data.spouse) {
          node.data.spouse.width = indiVSizePerDepth.get(node.depth);
        }
      } else {
        if (node.data.indi) {
          node.data.indi.height = indiVSizePerDepth.get(node.depth);
        }
        if (node.data.spouse) {
          node.data.spouse.height = indiVSizePerDepth.get(node.depth);
        }
      }
    });

    const vSizePerDepth = new Map<number, number>();
    root.each((node) => {
      const depth = node.depth;
      const maxVSize =
          d3.max([this.getVSize(node.data), vSizePerDepth.get(depth)]);
      vSizePerDepth.set(depth, maxVSize);
    });

    // Set sizes of whole nodes.
    root.each((node) => {
      if (this.options.horizontal) {
        node.data.width = vSizePerDepth.get(node.depth);
        node.data.height = this.getHSize(node.data);
      } else {
        node.data.height = vSizePerDepth.get(node.depth);
        node.data.width = this.getHSize(node.data);
      }
    });

    // Assigns the x and y position for the nodes.
    const nodes = treemap(root).descendants();

    // Swap x-y coordinates for horizontal layout.
    nodes.forEach((node) => {
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
    const svg = d3.select(this.options.svgSelector);
    if (svg.select('g').empty()) {
      svg.append('g');
    }

    // Render nodes.
    const boundNodes = svg.select('g').selectAll('g.node').data(
        nodes, (d: d3.HierarchyPointNode<Node>) => d.id);

    const nodeEnter = boundNodes.enter().append('g');
    nodeEnter.merge(boundNodes)
        .attr('class', (node) => `node generation${node.data.generation}`);
    nodeEnter.attr(
        'transform',
        (node) => `translate(${node.x - node.data.width / 2}, ${
            node.y - node.data.height / 2})`);
    if (this.options.animate) {
      nodeEnter.style('opacity', 0)
          .transition()
          .delay(HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(HIDE_TIME_MS)
          .style('opacity', 1);
    }
    const updateTransition = this.options.animate ?
        boundNodes.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS) :
        boundNodes;
    updateTransition.attr(
        'transform',
        (node) => `translate(${node.x - node.data.width / 2}, ${
            node.y - node.data.height / 2})`);
    this.options.renderer.render(nodeEnter, boundNodes);
    if (this.options.animate) {
      boundNodes.exit()
          .transition()
          .duration(HIDE_TIME_MS)
          .style('opacity', 0)
          .remove();
    } else {
      boundNodes.exit().remove();
    }

    const link =
        (parent: d3.HierarchyPointNode<TreeNode>,
         child: d3.HierarchyPointNode<TreeNode>) => {
          if (child.data.additionalMarriage) {
            return this.linkAdditionalMarriage(child);
          }
          const flipVertically = parent.data.generation > child.data.generation;
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

    // Render links.
    const links = nodes.filter(n => !!n.parent);
    const boundLinks =
        svg.select('g').selectAll('path.link').data(links, linkId);
    const path = boundLinks.enter()
                     .insert('path', 'g')
                     .attr(
                         'class',
                         (node) => node.data.additionalMarriage ?
                             'link additional-marriage' :
                             'link')
                     .attr('d', (node) => link(node.parent, node));

    const linkTransition = this.options.animate ?
        boundLinks.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS) :
        boundLinks;
    linkTransition.attr('d', (node) => link(node.parent, node));

    if (this.options.animate) {
      path.style('opacity', 0)
          .transition()
          .delay(2 * HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(0)
          .style('opacity', 1);
    }
    if (this.options.animate) {
      boundLinks.exit().transition().duration(0).style('opacity', 0).remove();
    } else {
      boundLinks.exit().remove();
    }
  }
}
