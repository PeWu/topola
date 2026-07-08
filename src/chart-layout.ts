/// <reference path='d3-flextree.d.ts' />

import { flextree } from 'd3-flextree';
import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';
import { max, min } from 'd3-array';
import { select } from 'd3-selection';
import { ChartOptions, TreeNode } from './api';
import { getExpanderCss } from './control-renderer';

/** Horizontal distance between boxes. */
export const H_SPACING = 15;
/** Vertical distance between boxes. */
export const V_SPACING = 34;
/** Margin around the whole drawing. */
export const MARGIN = 15;

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

export function getChartInfo(
  nodes: Array<HierarchyPointNode<TreeNode>>,
  margin: number = MARGIN,
): ChartSizeInfo {
  // Calculate chart boundaries.
  const x0 = min(nodes, (d) => d.x - d.data.width! / 2)! - margin;
  const y0 = min(nodes, (d) => d.y - d.data.height! / 2)! - margin;
  const x1 = max(nodes, (d) => d.x + d.data.width! / 2)! + margin;
  const y1 = max(nodes, (d) => d.y + d.data.height! / 2)! + margin;
  return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
}

export function getChartInfoWithoutMargin(
  nodes: Array<HierarchyPointNode<TreeNode>>,
): ChartSizeInfo {
  return getChartInfo(nodes, 0);
}

/** Handles calculation of tree node positions and chart sizing. */
export class ChartLayout {
  constructor(private readonly options: ChartOptions) {}

  layOutChart<N extends TreeNode>(
    root: HierarchyNode<N>,
    layoutOptions: LayoutOptions = {},
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
      const vSize = vSizePerDepth.get(node.depth)!;
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
      .spacing((_a, _b) => hSpacing);
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
}
