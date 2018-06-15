import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {Chart, DataProvider, Fam, Indi, Renderer, TreeIndi, TreeNode} from './topola-api';

/** Horizontal distance between boxes. */
const H_SPACING = 15;
/** Vertical distance between boxes. */
const V_SPACING = 30;
/** Margin around the whole drawing. */
const MARGIN = 15;

const DEFAULT_SVG_SELECTOR = 'svg';


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
  horizontal?: boolean;
}


/** Utility class with common code for all chart types. */
class ChartUtil {
  constructor(readonly options: ChartOptions) {}

  /** Returns the horizontal size. */
  getHSize(node: TreeNode): number {
    if (this.options.horizontal) {
      return (node.indi && node.indi.height || 0) +
          (node.spouse && node.spouse.height || 0);
    }
    return (node.indi && node.indi.width || 0) +
        (node.spouse && node.spouse.width || 0);
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
            .attr('class', 'node')
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


/** Renders an ancestors chart. */
export class AncestorChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

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
    const nodes = this.util.renderChart(root, true);
    this.util.updateSvgDimensions(nodes);
  }
}


/** Renders a descendants chart. */
export class DescendantChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

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
    const nodes = this.util.renderChart(root);
    this.util.updateSvgDimensions(nodes);
  }
}

/**
 * Renders an hourglass chart. It consists of an ancestor chart and
 * a descendant chart for a family.
 */
export class HourglassChart<IndiT extends Indi, FamT extends Fam> implements
    Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

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
    const ancestorNodes = this.util.renderChart(ancestorsRoot, true);

    const descendants = new DescendantChart(this.options);
    const descendantsRoot = descendants.createHierarchy();
    const descendantNodes = this.util.renderChart(descendantsRoot);

    const nodes = ancestorNodes.concat(descendantNodes);
    this.util.updateSvgDimensions(nodes);
  }
}
