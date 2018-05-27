import * as d3 from 'd3';
import {flextree, FlexTreeLayout} from 'd3-flextree';

import {DataProvider, Fam, Indi, Node, Renderer} from './topola-api';

const DISTANCE_H = 30;
const DISTANCE_V = 30;
const MARGIN = 10;


/** Creates a path from parent to the child node. */
function diagonal(
    s: d3.HierarchyPointNode<Node>, d: d3.HierarchyPointNode<Node>) {
  const mid = (s.y - s.data.width / 2 + d.y + d.data.width / 2) / 2;
  return `M ${s.y} ${s.x}
          L ${mid} ${s.x},
            ${mid} ${d.x},
            ${d.y} ${d.x}`;
}


/** Renders an ancestor chart. */
export class AncestorChart<IndiT extends Indi, FamT extends Fam> {
  treemap: FlexTreeLayout<Node>;

  /**
   *
   * @param data Input data.
   * @param renderer Renderer for individual data.
   * @param startId The root of the drawn tree for whom the ancestors will
   *     be drawn.
   */
  constructor(
      readonly data: DataProvider<Indi, Fam>, readonly renderer: Renderer,
      readonly startId: string) {
    this.treemap = flextree<Node>()
                       .nodeSize((node) => {
                         let w = 0;
                         if (node.children) {
                           node.children.forEach((child) => {
                             const childW = child.data.width;
                             w = Math.max(w, childW);
                           });
                         }
                         const thisW = node.data.width;
                         return [DISTANCE_V, (w + thisW) / 2 + DISTANCE_H];
                       })
                       .spacing((a, b) => {
                         if (a.parent.data.id === b.parent.data.id) {
                           return 0;
                         }
                         return DISTANCE_V;
                       });
  }

  /** Creates a d3 hierarchy from the input data. */
  private createHierarchy(): d3.HierarchyNode<Node> {
    const parents: Node[] = [];
    parents.push({id: this.startId});
    const stack = [this.startId];
    while (stack.length) {
      const id = stack.pop();
      const indi = this.data.getIndi(id);
      // Assume indi exists.
      const famId = indi.getFamilyAsChild();
      if (!famId) {
        continue;
      }
      const fam = this.data.getFam(famId);
      if (!fam) {
        continue;
      }
      const father = fam.getFather();
      const mother = fam.getMother();
      if (father) {
        parents.push({id: father, parentId: id});
        stack.push(father);
      }
      if (mother) {
        parents.push({id: mother, parentId: id});
        stack.push(mother);
      }
    }
    return d3.stratify<Node>()(parents);
  }

  /**
   * Renders the tree, calling the provided renderer to draw boxes for
   * individuals.
   */
  render(): void {
    const root = this.createHierarchy();
    d3.select('svg').append('g');

    // Get preferred sizes.
    root.each((node) => {
      const [width, height] = this.renderer.getPreferredSize(node.data.id);
      node.data.width = width;
      node.data.height = height;
    });

    // Calculate width per depth.
    const widthPerDepth = new Map<number, number>();
    root.each((node) => {
      const depth = node.depth;
      widthPerDepth.set(
          depth, Math.max(node.data.width, widthPerDepth.get(depth) || 0));
    });

    // Set same width for each depth.
    root.each((node) => {
      node.data.width = widthPerDepth.get(node.depth);
    });

    // Assigns the x and y position for the nodes
    const treeData = this.treemap(root);

    const nodes = treeData.descendants();
    const x0 = d3.min(nodes.map((d) => d.x - d.data.height / 2));
    const y0 = d3.min(nodes.map((d) => d.y - d.data.width / 2));
    const x1 = d3.max(nodes.map((d) => d.x + d.data.height / 2));
    const y1 = d3.max(nodes.map((d) => d.y + d.data.width / 2));

    d3.select('svg')
        .attr('width', y1 - y0 + 2 * MARGIN)
        .attr('height', x1 - x0 + 2 * MARGIN);
    d3.select('svg g').attr(
        'transform', `translate(${- y0 + MARGIN}, ${- x0 + MARGIN})`);

    // Render nodes.
    const nodeEnter = d3.select('svg g')
                          .selectAll('g.node')
                          .data(nodes, (d: d3.HierarchyPointNode<Node>) => d.id)
                          .enter()
                          .append('g')
                          .attr('class', 'node')
                          .attr(
                              'transform',
                              (d) => `translate(${d.y - d.data.width / 2}, ${
                                  d.x - d.data.height / 2})`);
    this.renderer.render(nodeEnter);

    // Render links.
    const links = nodes.slice(1);
    d3.select('svg g')
        .selectAll('path.link')
        .data(links, (d: d3.HierarchyPointNode<Node>) => d.id)
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', (d) => diagonal(d, d.parent));
  }
}
