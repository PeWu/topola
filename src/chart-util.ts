/// <reference path='d3-flextree.d.ts' />

import { BaseType, select, Selection } from 'd3-selection';
import {
  ChartOptions,
  ExpanderDirection,
  ExpanderState,
  TreeNode,
  TreeNodeSelection,
} from './api';
import { flextree } from 'd3-flextree';
import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';
import { max, min } from 'd3-array';
import 'd3-transition';
import { getVSize } from './composite-renderer';

type SVGSelection = Selection<BaseType, {}, BaseType, {}>;

/** Horizontal distance between boxes. */
export const H_SPACING = 15;
/** Vertical distance between boxes. */
export const V_SPACING = 34;
/** Margin around the whole drawing. */
const MARGIN = 15;

const HIDE_TIME_MS = 200;
const MOVE_TIME_MS = 500;

/**
 * Additional layout options intended to be used internally by layout
 * implementations.
 */
export interface LayoutOptions {
  flipVertically?: boolean;
  vSpacing?: number;
  hSpacing?: number;
}

export interface ChartSizeInfo {
  // Chart size.
  size: [number, number];
  // The coordinates of the start indi or fam.
  origin: [number, number];
}

function getExpanderCss() {
  return `
.expander {
  fill: white;
  stroke: black;
  stroke-width: 2px;
  cursor: pointer;
}`;
}

/** Assigns an identifier to a link. */
export function linkId(node: HierarchyPointNode<TreeNode>) {
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
  nodes: Array<HierarchyPointNode<TreeNode>>
): ChartSizeInfo {
  // Calculate chart boundaries.
  const x0 = min(nodes, (d) => d.x - d.data.width! / 2)! - MARGIN;
  const y0 = min(nodes, (d) => d.y - d.data.height! / 2)! - MARGIN;
  const x1 = max(nodes, (d) => d.x + d.data.width! / 2)! + MARGIN;
  const y1 = max(nodes, (d) => d.y + d.data.height! / 2)! + MARGIN;
  return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
}

export function getChartInfoWithoutMargin(
  nodes: Array<HierarchyPointNode<TreeNode>>
): ChartSizeInfo {
  // Calculate chart boundaries.
  const x0 = min(nodes, (d) => d.x - d.data.width! / 2)!;
  const y0 = min(nodes, (d) => d.y - d.data.height! / 2)!;
  const x1 = max(nodes, (d) => d.x + d.data.width! / 2)!;
  const y1 = max(nodes, (d) => d.y + d.data.height! / 2)!;
  return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
}

/** Utility class with common code for all chart types. */
export class ChartUtil {
  constructor(readonly options: ChartOptions) {}

  /** Creates a path from parent to the child node (horizontal layout). */
  private linkHorizontal(
    s: HierarchyPointNode<TreeNode>,
    d: HierarchyPointNode<TreeNode>
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
    s: HierarchyPointNode<TreeNode>,
    d: HierarchyPointNode<TreeNode>
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

  private linkAdditionalMarriage(node: HierarchyPointNode<TreeNode>) {
    const nodeIndex = node.parent!.children!.findIndex(
      (n) => n.data.id === node.data.id
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

  updateSvgDimensions(chartInfo: ChartSizeInfo) {
    const svg = select(this.options.svgSelector);
    const group = svg.select('g');
    const transition = this.options.animate
      ? group.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS)
      : group;
    transition.attr(
      'transform',
      `translate(${chartInfo.origin[0]}, ${chartInfo.origin[1]})`
    );
  }

  layOutChart<N extends TreeNode>(
    root: HierarchyNode<N>,
    layoutOptions: LayoutOptions = {}
  ): Array<HierarchyPointNode<N>> {
    // Add styles so that calculating text size is correct.
    const svg = select(this.options.svgSelector);
    if (svg.select('style').empty()) {
      svg
        .append('style')
        .text(this.options.renderer.getCss() + getExpanderCss());
    }

    // Assign generation number.
    root.each((node) => {
      node.data.generation =
        node.depth * (layoutOptions.flipVertically ? -1 : 1) +
        (this.options.baseGeneration || 0);
    });

    // Set preferred sizes.
    this.options.renderer.updateNodes(root.descendants());

    const vSizePerDepth = new Map<number, number>();
    root.each((node) => {
      const depth = node.depth;
      const maxVSize = max([
        this.options.horizontal ? node.data.width! : node.data.height!,
        vSizePerDepth.get(depth)!,
      ])!;
      vSizePerDepth.set(depth, maxVSize);
    });

    // Set sizes of whole nodes.
    root.each((node) => {
      const vSize = vSizePerDepth.get(node.depth);
      if (this.options.horizontal) {
        node.data.width = vSize;
      } else {
        node.data.height = vSize;
      }
    });

    const vSpacing =
      layoutOptions.vSpacing !== undefined ? layoutOptions.vSpacing : V_SPACING;
    const hSpacing =
      layoutOptions.hSpacing !== undefined ? layoutOptions.hSpacing : H_SPACING;
    // Assigns the x and y position for the nodes.
    const treemap = flextree<N>()
      .nodeSize((node) => {
        if (this.options.horizontal) {
          const maxChildSize =
            max(node.children || [], (n) => n.data.width) || 0;
          return [
            node.data.height!,
            (maxChildSize + node.data.width!) / 2 + vSpacing,
          ];
        }
        const maxChildSize =
          max(node.children || [], (n) => n.data.height) || 0;
        return [
          node.data.width!,
          (maxChildSize + node.data.height!) / 2 + vSpacing,
        ];
      })
      .spacing((a, b) => hSpacing);
    const nodes = treemap(root).descendants();

    // Swap x-y coordinates for horizontal layout.
    nodes.forEach((node) => {
      if (layoutOptions.flipVertically) {
        node.y = -node.y;
      }
      if (this.options.horizontal) {
        [node.x, node.y] = [node.y, node.x];
      }
    });
    return nodes;
  }

  renderChart(nodes: Array<HierarchyPointNode<TreeNode>>): Promise<void> {
    const svg = this.getSvgForRendering();
    const nodeAnimation = this.renderNodes(nodes, svg);
    const linkAnimation = this.renderLinks(nodes, svg);
    const expanderAnimation = this.renderControls(nodes, svg);
    return Promise.all([
      nodeAnimation,
      linkAnimation,
      expanderAnimation,
    ]) as unknown as Promise<void>;
  }

  renderNodes(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection
  ): Promise<void> {
    const animationPromise = new Promise<void>((resolve) => {
      const boundNodes = svg
        .select('g')
        .selectAll('g.node')
        .data(nodes, (d: HierarchyPointNode<TreeNode>) => d.id!);

      const nodeEnter = boundNodes.enter().append('g' as string);

      let transitionsPending =
        boundNodes.exit().size() + boundNodes.size() + nodeEnter.size();
      const transitionDone = () => {
        transitionsPending--;
        if (transitionsPending === 0) {
          resolve();
        }
      };
      if (!this.options.animate || transitionsPending === 0) {
        resolve();
      }

      nodeEnter
        .merge(boundNodes)
        .attr('class', (node) => `node generation${node.data.generation}`);
      nodeEnter.attr(
        'transform',
        (node: HierarchyPointNode<TreeNode>) =>
          `translate(${node.x - node.data.width! / 2}, ${
            node.y - node.data.height! / 2
          })`
      );
      if (this.options.animate) {
        nodeEnter
          .style('opacity', 0)
          .transition()
          .delay(HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(HIDE_TIME_MS)
          .style('opacity', 1)
          .on('end', transitionDone);
      }
      const updateTransition = this.options.animate
        ? boundNodes
            .transition()
            .delay(HIDE_TIME_MS)
            .duration(MOVE_TIME_MS)
            .on('end', transitionDone)
        : boundNodes;
      updateTransition.attr(
        'transform',
        (node: HierarchyPointNode<TreeNode>) =>
          `translate(${node.x - node.data.width! / 2}, ${
            node.y - node.data.height! / 2
          })`
      );
      this.options.renderer.render(nodeEnter, boundNodes);
      if (this.options.animate) {
        boundNodes
          .exit()
          .transition()
          .duration(HIDE_TIME_MS)
          .style('opacity', 0)
          .remove()
          .on('end', transitionDone);
      } else {
        boundNodes.exit().remove();
      }
    });
    return animationPromise;
  }

  renderLinks(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection
  ): Promise<void> {
    const animationPromise = new Promise<void>((resolve) => {
      const link = (
        parent: HierarchyPointNode<TreeNode>,
        child: HierarchyPointNode<TreeNode>
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

      const links = nodes.filter(
        (n) => !!n.parent || n.data.additionalMarriage
      );
      const boundLinks = svg
        .select('g')
        .selectAll('path.link')
        .data(links, linkId);
      const path = boundLinks
        .enter()
        .insert('path', 'g')
        .attr('class', (node) =>
          node.data.additionalMarriage ? 'link additional-marriage' : 'link'
        )
        .attr('d', (node) => link(node.parent!, node));

      let transitionsPending =
        boundLinks.exit().size() + boundLinks.size() + path.size();
      const transitionDone = () => {
        transitionsPending--;
        if (transitionsPending === 0) {
          resolve();
        }
      };
      if (!this.options.animate || transitionsPending === 0) {
        resolve();
      }

      const linkTransition = this.options.animate
        ? boundLinks
            .transition()
            .delay(HIDE_TIME_MS)
            .duration(MOVE_TIME_MS)
            .on('end', transitionDone)
        : boundLinks;
      linkTransition.attr('d', (node) => link(node.parent!, node));

      if (this.options.animate) {
        path
          .style('opacity', 0)
          .transition()
          .delay(2 * HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(0)
          .style('opacity', 1)
          .on('end', transitionDone);
      }
      if (this.options.animate) {
        boundLinks
          .exit()
          .transition()
          .duration(0)
          .style('opacity', 0)
          .remove()
          .on('end', transitionDone);
      } else {
        boundLinks.exit().remove();
      }
    });
    return animationPromise;
  }

  renderExpander(
    nodes: TreeNodeSelection,
    stateGetter: (
      node: HierarchyPointNode<TreeNode>
    ) => ExpanderState | undefined,
    clickCallback?: (id: string) => void
  ) {
    nodes = nodes.filter((node) => stateGetter(node) !== undefined);

    nodes.on('click', (event, data) => {
      clickCallback?.(data.id!);
    });
    nodes.append('rect').attr('width', 12).attr('height', 12);
    nodes
      .append('line')
      .attr('x1', 3)
      .attr('y1', 6)
      .attr('x2', 9)
      .attr('y2', 6)
      .attr('stroke', 'black');
    nodes
      .filter((node) => stateGetter(node) === ExpanderState.PLUS)
      .append('line')
      .attr('x1', 6)
      .attr('y1', 3)
      .attr('x2', 6)
      .attr('y2', 9)
      .attr('stroke', 'black');
  }

  renderFamilyControls(nodes: TreeNodeSelection) {
    const boundNodes = nodes
      .selectAll('g.familyExpander')
      .data((node) => (node.data.family?.expander !== undefined ? [node] : []));

    const nodeEnter: TreeNodeSelection = boundNodes
      .enter()
      .append('g')
      .attr('class', 'familyExpander expander');

    const merged = nodeEnter.merge(boundNodes);

    const updateTransition = this.options.animate
      ? merged.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS)
      : merged;

    updateTransition.attr('transform', (node: HierarchyPointNode<TreeNode>) => {
      const anchor = this.options.renderer.getFamilyAnchor(node.data);
      return `translate(${anchor[0] - 6}, ${
        -node.data.height! / 2 +
        getVSize(node.data, !!this.options.horizontal)
      })`;
  });
    this.renderExpander(
      merged,
      (node) => node.data.family?.expander,
      (id) => this.options.expanderCallback?.(id, ExpanderDirection.FAMILY)
    );
    boundNodes.exit().remove();
  }

  renderIndiControls(nodes: TreeNodeSelection) {
    const boundNodes = nodes
      .selectAll('g.indiExpander')
      .data((node) => (node.data.indi?.expander !== undefined ? [node] : []));

    const nodeEnter: TreeNodeSelection = boundNodes
      .enter()
      .append('g')
      .attr('class', 'indiExpander expander');

    const merged = nodeEnter.merge(boundNodes);

    const updateTransition = this.options.animate
      ? merged.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS)
      : merged;

    updateTransition.attr('transform', (node: HierarchyPointNode<TreeNode>) => {
      const anchor = this.options.renderer.getIndiAnchor(node.data);
      return `translate(${anchor[0] - 6}, ${-node.data.height! / 2 - 12})`;
    });
    this.renderExpander(
      merged,
      (node) => node.data.indi?.expander,
      (id) => this.options.expanderCallback?.(id, ExpanderDirection.INDI)
    );
    boundNodes.exit().remove();
  }

  renderSpouseControls(nodes: TreeNodeSelection) {
    const boundNodes = nodes
      .selectAll('g.spouseExpander')
      .data((node) => (node.data.spouse?.expander !== undefined ? [node] : []));

    const nodeEnter: TreeNodeSelection = boundNodes
      .enter()
      .append('g')
      .attr('class', 'spouseExpander expander');

    const merged = nodeEnter.merge(boundNodes);

    const updateTransition = this.options.animate
      ? merged.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS)
      : merged;

    updateTransition.attr('transform', (node: HierarchyPointNode<TreeNode>) => {
      const anchor = this.options.renderer.getSpouseAnchor(node.data);
      return `translate(${anchor[0] - 6}, ${-node.data.height! / 2 - 12})`;
    });
    this.renderExpander(
      merged,
      (node) => node.data.spouse?.expander,
      (id) => this.options.expanderCallback?.(id, ExpanderDirection.SPOUSE)
    );
    boundNodes.exit().remove();
  }

  renderControls(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection
  ): Promise<void> {
    if (!this.options.expanders) {
      return Promise.resolve();
    }
    const animationPromise = new Promise<void>((resolve) => {
      const boundNodes = svg
        .select('g')
        .selectAll('g.controls')
        .data(nodes, (d: HierarchyPointNode<TreeNode>) => d.id!);

      const nodeEnter = boundNodes
        .enter()
        .append('g' as string)
        .attr('class', 'controls');
      nodeEnter.attr(
        'transform',
        (node: HierarchyPointNode<TreeNode>) =>
          `translate(${node.x}, ${node.y})`
      );

      let transitionsPending =
        boundNodes.exit().size() + boundNodes.size() + nodeEnter.size();
      const transitionDone = () => {
        transitionsPending--;
        if (transitionsPending === 0) {
          resolve();
        }
      };
      if (!this.options.animate || transitionsPending === 0) {
        resolve();
      }

      const updateTransition = this.options.animate
        ? boundNodes
            .transition()
            .delay(HIDE_TIME_MS)
            .duration(MOVE_TIME_MS)
            .on('end', transitionDone)
        : boundNodes;
      updateTransition.attr(
        'transform',
        (node: HierarchyPointNode<TreeNode>) =>
          `translate(${node.x}, ${node.y})`
      );
      if (this.options.animate) {
        nodeEnter
          .style('opacity', 0)
          .transition()
          .delay(HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(HIDE_TIME_MS)
          .style('opacity', 1)
          .on('end', transitionDone);
      }

      const merged = nodeEnter.merge(boundNodes);
      this.renderFamilyControls(merged);
      this.renderIndiControls(merged);
      this.renderSpouseControls(merged);

      if (this.options.animate) {
        boundNodes
          .exit()
          .transition()
          .duration(HIDE_TIME_MS)
          .style('opacity', 0)
          .remove()
          .on('end', transitionDone);
      } else {
        boundNodes.exit().remove();
      }
    });

    return animationPromise;
  }

  getSvgForRendering(): SVGSelection {
    const svg = select(this.options.svgSelector) as SVGSelection;
    if (svg.select('g').empty()) {
      svg.append('g');
    }
    return svg;
  }
}
