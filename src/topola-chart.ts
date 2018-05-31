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
function link(
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


/** Returns the spouse of the given individual in the given family. */
function getSpouse(indiId: string, fam: Fam): string {
  if (fam.getFather() === indiId) {
    return fam.getMother();
  }
  return fam.getFather();
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


function setPreferredSize(indi: TreeIndi|undefined, renderer: Renderer): void {
  if (!indi) {
    return;
  }
  [indi.width, indi.height] = renderer.getPreferredSize(indi.id);
}


function renderChart(
    root: d3.HierarchyNode<TreeNode>, options: ChartOptions,
    flipHorizontally = false): void {
  const svgSelector = options.svgSelector || DEFAULT_SVG_SELECTOR;
  const treemap =
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

  d3.select(svgSelector).append('g');

  // Set preferred sizes.
  root.each((node) => {
    setPreferredSize(node.data.indi, options.renderer);
    setPreferredSize(node.data.spouse, options.renderer);
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
  const nodes = treemap(root).descendants();

  // Flip left-right.
  if (flipHorizontally) {
    nodes.forEach((node) => {
      node.y = -node.y;
    });
  }

  // Calculate graph boundaries.
  const x0 = d3.min(nodes.map((d) => d.x - getHeight(d.data) / 2));
  const y0 = d3.min(nodes.map((d) => d.y - d.data.indi.width / 2));
  const x1 = d3.max(nodes.map((d) => d.x + getHeight(d.data) / 2));
  const y1 = d3.max(nodes.map((d) => d.y + d.data.indi.width / 2));

  d3.select(svgSelector)
      .attr('width', y1 - y0 + 2 * MARGIN)
      .attr('height', x1 - x0 + 2 * MARGIN);
  d3.select(svgSelector)
      .select('g')
      .attr('transform', `translate(${- y0 + MARGIN}, ${- x0 + MARGIN})`);

  // Render nodes.
  const nodeEnter =
      d3.select(svgSelector)
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
  options.renderer.render(nodeEnter);

  // Render links.
  const links = nodes.slice(1);
  d3.select(svgSelector)
      .select('g')
      .selectAll('path.link')
      .data(links, (d: d3.HierarchyPointNode<Node>) => d.id)
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr(
          'd',
          (node) => flipHorizontally ? link(node, node.parent) :
                                       link(node.parent, node));
}


/** Renders an ancestors chart. */
export class AncestorChart<IndiT extends Indi, FamT extends Fam> {
  constructor(readonly options: ChartOptions) {}

  /** Creates a d3 hierarchy from the input data. */
  private createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];
    const indi = this.options.data.getIndi(this.options.startId);
    const famc = indi.getFamilyAsChild();
    parents.push({id: this.options.startId, indi: {id: this.options.startId}});
    const stack: TreeNode[] = [];
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

  /**
   * Renders the tree, calling the provided renderer to draw boxes for
   * individuals.
   */
  render(): void {
    const root = this.createHierarchy();
    renderChart(root, this.options, true);
  }
}


/** Renders a descendants chart. */
export class DescendantChart<IndiT extends Indi, FamT extends Fam> {
  constructor(readonly options: ChartOptions) {}

  private getNodes(id: string): TreeNode[] {
    const indi = this.options.data.getIndi(id);
    const famIds = indi.getFamiliesAsSpouse();
    if (!famIds.length) {
      // Single person.
      return [{
        id,
        indi: {
          id,
        }
      }];
    }
    // Marriages.
    return famIds.map((famId) => {
      const fam = this.options.data.getFam(famId);
      return {
        id: famId,
        indi: {
          id,
        },
        spouse: {
          id: getSpouse(id, fam),
        },
        family: {
          id: famId,
        }
      };
    });
  }

  /** Creates a d3 hierarchy from the input data. */
  private createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];
    const nodes = this.getNodes(this.options.startId);
    parents.push(...nodes);

    const stack: string[] = [];
    nodes.forEach((node) => {
      if (node.family) {
        stack.push(node.family.id);
      }
    });
    while (stack.length) {
      const famId = stack.pop();
      const fam = this.options.data.getFam(famId);
      const children = fam.getChildren();
      children.forEach((childId) => {
        const childNodes = this.getNodes(childId);
        childNodes.forEach((node) => {
          node.parentId = famId;
          if (node.family) {
            stack.push(node.family.id);
          }
        });
        parents.push(...childNodes);
      });
    }
    return d3.stratify<TreeNode>()(parents);
  }

  /**
   * Renders the tree, calling the provided renderer to draw boxes for
   * individuals.
   */
  render(): void {
    const root = this.createHierarchy();
    renderChart(root, this.options);
  }
}
