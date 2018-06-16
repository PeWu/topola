import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {Chart, ChartOptions, DataProvider, Fam, Indi, Renderer, TreeIndi, TreeNode} from './api';

/** Horizontal distance between boxes. */
const H_SPACING = 15;
/** Vertical distance between boxes. */
const V_SPACING = 30;
/** Margin around the whole drawing. */
const MARGIN = 15;

const DEFAULT_SVG_SELECTOR = 'svg';


/** Utility class with common code for all chart types. */
export class ChartUtil {
  constructor(readonly options: ChartOptions) {}

  /** Returns the horizontal size. */
  getHSize(node: TreeNode): number {
    if (this.options.horizontal) {
      return (node.indi && node.indi.height || 0) +
          (node.spouse && node.spouse.height || 0);
    }
    const indiHSize = (node.indi && node.indi.width || 0) +
        (node.spouse && node.spouse.width || 0);
    return d3.max([indiHSize, node.family && node.family.width]);
  }

  /** Returns the vertical size. */
  getVSize(node: TreeNode): number {
    return this.getIndiVSize(node) + this.getFamVSize(node);
  }

  getFamVSize(node: TreeNode): number {
    if (this.options.horizontal) {
      return node.family && node.family.width || 0;
    }
    return node.family && node.family.height || 0;
  }

  /** Returns the vertical size of individual boxes. */
  getIndiVSize(node: TreeNode): number {
    if (this.options.horizontal) {
      return d3.max(
          [node.indi && node.indi.width, node.spouse && node.spouse.width]);
    }
    return d3.max(
        [node.indi && node.indi.height, node.spouse && node.spouse.height]);
  }

  /** Creates a path from parent to the child node (horizontal layout). */
  linkHorizontal(
      s: d3.HierarchyPointNode<TreeNode>, d: d3.HierarchyPointNode<TreeNode>) {
    const midX = (s.x + s.data.width / 2 + d.x - d.data.width / 2) / 2;
    const sx = s.x - s.data.width / 2 + this.getIndiVSize(s.data) / 2;
    const sy = s.y - s.data.height / 2 + s.data.indi.height;
    const dx = d.x - d.data.width / 2 + this.getIndiVSize(d.data) / 2;
    const dy = d.data.spouse ?
        (s.data.parentsOfSpouse ? d.y + d.data.indi.height / 2 :
                                  d.y - d.data.spouse.height / 2) :
        d.y;
    return `M ${sx} ${sy}
            L ${midX} ${sy},
              ${midX} ${dy},
              ${dx} ${dy}`;
  }

  /** Creates a path from parent to the child node (vertical layout). */
  linkVertical(
      s: d3.HierarchyPointNode<TreeNode>, d: d3.HierarchyPointNode<TreeNode>) {
    const midY = (s.y + s.data.height / 2 + d.y - d.data.height / 2) / 2;
    const sx = s.x - s.data.width / 2 + s.data.indi.width;
    const sy = s.y - s.data.height / 2 + this.getIndiVSize(s.data) / 2;
    const dx = d.data.spouse ?
        (s.data.parentsOfSpouse ? d.x + d.data.indi.width / 2 :
                                  d.x - d.data.spouse.width / 2) :
        d.x;
    const dy = d.y - d.data.height / 2 + this.getIndiVSize(d.data) / 2;
    return `M ${sx} ${sy}
            L ${sx} ${midY},
              ${dx} ${midY},
              ${dx} ${dy}`;
  }

  setPreferredIndiSize(indi: TreeIndi|undefined): void {
    if (!indi) {
      return;
    }
    [indi.width, indi.height] =
        this.options.renderer.getPreferredIndiSize(indi.id);
  }

  updateSvgDimensions(nodes: Array<d3.HierarchyPointNode<TreeNode>>) {
    const selector = this.options.svgSelector || DEFAULT_SVG_SELECTOR;

    // Calculate chart boundaries.
    const x0 = d3.min(nodes.map((d) => d.x - d.data.width / 2));
    const y0 = d3.min(nodes.map((d) => d.y - d.data.height / 2));
    const x1 = d3.max(nodes.map((d) => d.x + d.data.width / 2));
    const y1 = d3.max(nodes.map((d) => d.y + d.data.height / 2));

    d3.select(selector)
        .attr('width', x1 - x0 + 2 * MARGIN)
        .attr('height', y1 - y0 + 2 * MARGIN);
    d3.select(selector).select('g').attr(
        'transform', `translate(${- x0 + MARGIN}, ${- y0 + MARGIN})`);
  }

  renderChart(root: d3.HierarchyNode<TreeNode>, flipVertically = false):
      Array<d3.HierarchyPointNode<TreeNode>> {
    const svgSelector = this.options.svgSelector || DEFAULT_SVG_SELECTOR;
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

    d3.select(svgSelector).append('g');

    // Assign generation number.
    root.each((node) => {
      node.data.generation = node.depth * (flipVertically ? -1 : 1);
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

    // Render nodes.
    const nodeEnter =
        d3.select(svgSelector)
            .select('g')
            .selectAll('g.node')
            .data(nodes, (d: d3.HierarchyPointNode<Node>) => d.id)
            .enter()
            .append('g')
            .attr('class', (node) => `node generation${node.data.generation}`)
            .attr(
                'transform',
                (node) => `translate(${node.x - node.data.width / 2}, ${
                    node.y - node.data.height / 2})`);
    this.options.renderer.render(nodeEnter);

    const link =
        (parent: d3.HierarchyPointNode<TreeNode>,
         child: d3.HierarchyPointNode<TreeNode>) => {
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
    const links = nodes.slice(1);
    d3.select(svgSelector)
        .select('g')
        .selectAll('path.link')
        .data(links, (d: d3.HierarchyPointNode<Node>) => d.id)
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', (node) => link(node.parent, node));
    return nodes;
  }
}
