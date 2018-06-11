import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {Chart, DataProvider, Fam, Indi, Renderer, TreeIndi, TreeNode} from './topola-api';

/** Horizontal distance between boxes. */
const DISTANCE_H = 30;
/** Vertical distance between boxes. */
const DISTANCE_V = 15;
/** Margin around the whole drawing. */
const MARGIN = 15;

const DEFAULT_SVG_SELECTOR = 'svg';


/**
 * Returns the height of the whole tree node as the sum of the heights of both
 * spouses.
 */
function getHeight(node: TreeNode): number {
  return (node.indi && node.indi.height || 0) +
      (node.spouse && node.spouse.height || 0);
}


/**
 * Returns the size of the whole tree node, including both spouses and
 * the family.
 */
function getWidth(node: TreeNode): number {
  const indiWidth =
      d3.max([node.indi && node.indi.width, node.spouse && node.spouse.width]);
  const famWidth = node.family && node.family.width || 0;
  return indiWidth + famWidth;
}


/** Creates a path from parent to the child node. */
function link(
    s: d3.HierarchyPointNode<TreeNode>, d: d3.HierarchyPointNode<TreeNode>) {
  const midX = (s.y + s.data.width / 2 + d.y - d.data.width / 2) / 2;
  const sy = s.x - s.data.height / 2 + s.data.indi.height;
  const dy = d.data.spouse ?
      (s.data.parentsOfSpouse ? d.x + d.data.indi.height / 2 :
                                d.x - d.data.spouse.height / 2) :
      d.x;
  return `M ${s.y} ${sy}
          L ${midX} ${sy},
            ${midX} ${dy},
            ${d.y} ${dy}`;
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
  // The ID of the root individual or family. Set either startIndi or startFam.
  startIndi?: string;
  startFam?: string;
  // CSS selector of the SVG tag to draw in. If not provided, the chart will be
  // rendered in the first SVG tag.
  svgSelector?: string;
}


function setPreferredIndiSize(
    indi: TreeIndi|undefined, renderer: Renderer): void {
  if (!indi) {
    return;
  }
  [indi.width, indi.height] = renderer.getPreferredIndiSize(indi.id);
}


function updateSvgDimensions(
    nodes: Array<d3.HierarchyPointNode<TreeNode>>, svgSelector?: string) {
  const selector = svgSelector || DEFAULT_SVG_SELECTOR;

  // Calculate chart boundaries.
  const x0 = d3.min(nodes.map((d) => d.x - getHeight(d.data) / 2));
  const y0 = d3.min(nodes.map((d) => d.y - getWidth(d.data) / 2));
  const x1 = d3.max(nodes.map((d) => d.x + getHeight(d.data) / 2));
  const y1 = d3.max(nodes.map((d) => d.y + getWidth(d.data) / 2));

  d3.select(selector)
      .attr('width', y1 - y0 + 2 * MARGIN)
      .attr('height', x1 - x0 + 2 * MARGIN);
  d3.select(selector).select('g').attr(
      'transform', `translate(${- y0 + MARGIN}, ${- x0 + MARGIN})`);
}


function renderChart(
    root: d3.HierarchyNode<TreeNode>, options: ChartOptions,
    flipHorizontally = false): Array<d3.HierarchyPointNode<TreeNode>> {
  const svgSelector = options.svgSelector || DEFAULT_SVG_SELECTOR;
  const treemap =
      flextree<TreeNode>()
          .nodeSize((node) => {
            let w = 0;
            if (node.children) {
              node.children.forEach((child) => {
                const childW = child.data.width;
                w = Math.max(w, childW);
              });
            }
            return [node.data.height, (w + node.data.width) / 2 + DISTANCE_H];
          })
          .spacing((a, b) => DISTANCE_V);

  d3.select(svgSelector).append('g');

  // Set preferred sizes.
  root.each((node) => {
    setPreferredIndiSize(node.data.indi, options.renderer);
    setPreferredIndiSize(node.data.spouse, options.renderer);
    if (node.data.family) {
      [node.data.family.width, node.data.family.height] =
          options.renderer.getPreferredFamSize(node.data.family.id);
    }
  });

  // Calculate individual width per depth.
  const indiWidthPerDepth = new Map<number, number>();
  root.each((node) => {
    const depth = node.depth;
    const maxIndiWidth = d3.max([
      node.data.indi && node.data.indi.width,
      node.data.spouse && node.data.spouse.width,
      indiWidthPerDepth.get(depth),
    ]);
    indiWidthPerDepth.set(depth, maxIndiWidth);
  });

  // Set same width for each depth.
  root.each((node) => {
    if (node.data.indi) {
      node.data.indi.width = indiWidthPerDepth.get(node.depth);
    }
    if (node.data.spouse) {
      node.data.spouse.width = indiWidthPerDepth.get(node.depth);
    }
  });

  const widthPerDepth = new Map<number, number>();
  root.each((node) => {
    const depth = node.depth;
    const maxWidth = d3.max([getWidth(node.data), widthPerDepth.get(depth)]);
    widthPerDepth.set(depth, maxWidth);
  });

  // Set sizes of whole nodes.
  root.each((node) => {
    node.data.width = widthPerDepth.get(node.depth);
    node.data.height = getHeight(node.data);
  });

  // Assigns the x and y position for the nodes.
  const nodes = treemap(root).descendants();

  // Flip left-right.
  if (flipHorizontally) {
    nodes.forEach((node) => {
      node.y = -node.y;
    });
  }

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
              (node) => `translate(${node.y - node.data.width / 2}, ${
                  node.x - node.data.height / 2})`);
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
  return nodes;
}


/** Renders an ancestors chart. */
export class AncestorChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  constructor(readonly options: ChartOptions) {}

  /** Creates a d3 hierarchy from the input data. */
  createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];
    const stack: TreeNode[] = [];
    if (this.options.startIndi) {
      const indi = this.options.data.getIndi(this.options.startIndi);
      const famc = indi.getFamilyAsChild();
      if (famc) {
        stack.push({
          id: famc,
          parentId: this.options.startIndi,
          family: {id: famc},
        });
      }
      parents.push(
          {id: this.options.startIndi, indi: {id: this.options.startIndi}});
    } else {
      stack.push({
        id: this.options.startFam,
        family: {id: this.options.startFam},
      });
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
          stack.push({
            id: famc,
            parentId: entry.id,
            parentsOfSpouse: true,
            family: {id: famc},
          });
        }
      }
      if (father) {
        entry.indi = {id: father};
        const indi = this.options.data.getIndi(father);
        const famc = indi.getFamilyAsChild();
        if (famc) {
          stack.push({
            id: famc,
            parentId: entry.id,
            parentsOfSpouse: false,
            family: {id: famc},
          });
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
    const nodes = renderChart(root, this.options, true);
    updateSvgDimensions(nodes, this.options.svgSelector);
  }
}


/** Renders a descendants chart. */
export class DescendantChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
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

  private getFamNode(famId: string): TreeNode {
    const node: TreeNode = {id: famId, family: {id: famId}};
    const fam = this.options.data.getFam(famId);
    const father = fam.getFather();
    if (father) {
      node.indi = {id: father};
    }
    const mother = fam.getMother();
    if (mother) {
      node.spouse = {id: mother};
    }
    return node;
  }

  /** Creates a d3 hierarchy from the input data. */
  createHierarchy(): d3.HierarchyNode<TreeNode> {
    const parents: TreeNode[] = [];

    const nodes = this.options.startIndi ?
        this.getNodes(this.options.startIndi) :
        [this.getFamNode(this.options.startFam)];

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
    const nodes = renderChart(root, this.options);
    updateSvgDimensions(nodes, this.options.svgSelector);
  }
}

/**
 * Renders an hourglass chart. It consists of an ancestor chart and
 * a descendant chart for a family.
 */
export class HourglassChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  constructor(readonly options: ChartOptions) {}

  render(): void {
    // If the start individual is set and this person has children, start with
    // the family instead.
    if (this.options.startIndi) {
      const indi = this.options.data.getIndi(this.options.startIndi);
      const fams = indi.getFamiliesAsSpouse();
      if (fams.length) {
        this.options.startFam = fams[0];
        this.options.startIndi = undefined;
      }
    }

    const ancestors = new AncestorChart(this.options);
    const ancestorsRoot = ancestors.createHierarchy();
    const ancestorNodes = renderChart(ancestorsRoot, this.options, true);

    const descendants = new DescendantChart(this.options);
    const descendantsRoot = descendants.createHierarchy();
    const descendantNodes = renderChart(descendantsRoot, this.options);

    const nodes = ancestorNodes.concat(descendantNodes);
    updateSvgDimensions(nodes, this.options.svgSelector);
  }
}
