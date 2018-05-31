import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {DataProvider, Fam, Indi, Renderer, TreeIndi, TreeNode} from './topola-api';

/** Horizontal distance between boxes. */
const DISTANCE_H = 30;
/** Vertical distance between boxes. */
const DISTANCE_V = 15;
/** Margin around the whole drawing. */
const MARGIN = 15;

const DEFAULT_SVG_SELECTOR = 'svg';


/** Creates a path from parent to the child node. */
function diagonal(
    s: d3.HierarchyPointNode<TreeNode>, d: d3.HierarchyPointNode<TreeNode>) {
  const mid = (s.y + s.data.indi.width / 2 + d.y - d.data.indi.width / 2) / 2;
  const dy = d.data.spouse ?
      (s.data.parentsOfSpouse ? d.x + d.data.spouse.height / 2 :
                                d.x - d.data.indi.height / 2) :
      d.x;
  return `M ${s.y} ${s.x}
          L ${mid} ${s.x},
            ${mid} ${dy},
            ${d.y} ${dy}`;
}


/**
 * Returns the height of the whole tree node as the sum of the heights of both
 * spouses.
 */
function getHeight(node: TreeNode): number {
  return node.indi.height + (node.spouse && node.spouse.height || 0);
}


export interface ChartOptions {
  // Input data.
  data: DataProvider<Indi, Fam>;
  // Renderer for individual data.
  renderer: Renderer;
  // The root of the drawn tree for whom the ancestors will be drawn.
  startId: string;
  // CSS selector of the SVG tag to draw in. If not provided, the chart will be
  // rendered in the first SVG tag.
  svgSelector?: string;
}


/** Renders an ancestor chart. */
export class AncestorChart<IndiT extends Indi, FamT extends Fam> {
  treemap: FlexTreeLayout<TreeNode>;
  svgSelector: string;

  constructor(readonly options: ChartOptions) {
    this.treemap =
        flextree<TreeNode>()
            .nodeSize((node) => {
              let w = 0;
              if (node.children) {
                node.children.forEach((child) => {
                  const childW = child.data.indi.width;
                  w = Math.max(w, childW);
                });
              }
              const thisW = node.data.indi.width;
              return [getHeight(node.data), (w + thisW) / 2 + DISTANCE_H];
            })
            .spacing((a, b) => DISTANCE_V);
    this.svgSelector = options.svgSelector || DEFAULT_SVG_SELECTOR;
  }

  /** Creates a d3 hierarchy from the input data. */
  private createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];
    const indi = this.options.data.getIndi(this.options.startId);
    const famc = indi.getFamilyAsChild();
    parents.push({id: this.options.startId, indi: {id: this.options.startId}});
    const stack: Array<TreeNode> = [];
    if (famc) {
      stack.push({id: famc, parentId: this.options.startId});
    }
    while (stack.length) {
      const entry = stack.pop();
      const fam = this.options.data.getFam(entry.id);
      if (!fam) {
        continue;
      }
      const father = fam.getFather();
      const mother = fam.getMother();
      if (!father && !mother) {
        continue;
      }
      if (mother) {
        entry.spouse = {id: mother};
        const indi = this.options.data.getIndi(mother);
        const famc = indi.getFamilyAsChild();
        if (famc) {
          stack.push({id: famc, parentId: entry.id, parentsOfSpouse: true});
        }
      }
      if (father) {
        entry.indi = {id: father};
        const indi = this.options.data.getIndi(father);
        const famc = indi.getFamilyAsChild();
        if (famc) {
          stack.push({id: famc, parentId: entry.id, parentsOfSpouse: false});
        }
      }
      parents.push(entry);
    }
    return d3.stratify<TreeNode>()(parents);
  }

  private setPreferredSize(indi: TreeIndi|undefined): void {
    if (!indi) {
      return;
    }
    const [width, height] = this.options.renderer.getPreferredSize(indi.id);
    indi.width = width;
    indi.height = height;
  }

  /**
   * Renders the tree, calling the provided renderer to draw boxes for
   * individuals.
   */
  render(): void {
    const root = this.createHierarchy();
    d3.select(this.svgSelector).append('g');

    // Set preferred sizes.
    root.each((node) => {
      this.setPreferredSize(node.data.indi);
      this.setPreferredSize(node.data.spouse);
    });

    // Calculate width per depth.
    const widthPerDepth = new Map<number, number>();
    root.each((node) => {
      const depth = node.depth;
      const maxWidth = Math.max(
          node.data.indi && node.data.indi.width || 0,
          node.data.spouse && node.data.spouse.width || 0,
          widthPerDepth.get(depth) || 0);
      widthPerDepth.set(depth, maxWidth);
    });

    // Set same width for each depth.
    root.each((node) => {
      if (node.data.indi) {
        node.data.indi.width = widthPerDepth.get(node.depth);
      }
      if (node.data.spouse) {
        node.data.spouse.width = widthPerDepth.get(node.depth);
      }
    });

    // Assigns the x and y position for the nodes.
    const nodes = this.treemap(root).descendants();

    // Flip left-right.
    nodes.forEach((node) => {
      node.y = -node.y;
    });

    // Calculate graph boundaries.
    const x0 = d3.min(nodes.map((d) => d.x - getHeight(d.data) / 2));
    const y0 = d3.min(nodes.map((d) => d.y - d.data.indi.width / 2));
    const x1 = d3.max(nodes.map((d) => d.x + getHeight(d.data) / 2));
    const y1 = d3.max(nodes.map((d) => d.y + d.data.indi.width / 2));

    d3.select(this.svgSelector)
        .attr('width', y1 - y0 + 2 * MARGIN)
        .attr('height', x1 - x0 + 2 * MARGIN);
    d3.select(this.svgSelector).select('g').attr(
        'transform', `translate(${- y0 + MARGIN}, ${- x0 + MARGIN})`);

    // Render nodes.
    const nodeEnter =
        d3.select(this.svgSelector)
            .select('g')
            .selectAll('g.node')
            .data(nodes, (d: d3.HierarchyPointNode<Node>) => d.id)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr(
                'transform',
                (node) => `translate(${node.y - node.data.indi.width / 2}, ${
                    node.x - getHeight(node.data) / 2})`);
    this.options.renderer.render(nodeEnter);

    // Render links.
    const links = nodes.slice(1);
    d3.select(this.svgSelector)
        .select('g')
        .selectAll('path.link')
        .data(links, (d: d3.HierarchyPointNode<Node>) => d.id)
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', (d) => diagonal(d, d.parent));
  }
}
