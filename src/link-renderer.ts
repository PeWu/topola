import { BaseType, Selection } from 'd3-selection';
import { HierarchyPointNode } from 'd3-hierarchy';
import 'd3-transition';
import { ChartOptions, Renderer, TreeNode } from './api';
import { V_SPACING } from './chart-layout';
import {
  createTransitionTracker,
  HIDE_TIME_MS,
  MOVE_TIME_MS,
} from './transition-util';

type SVGSelection = Selection<BaseType, {}, BaseType, {}>;

/** Assigns an identifier to a link. */
export function linkId(node: HierarchyPointNode<TreeNode>): string {
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

/** Creates a path from parent to the child node (horizontal layout). */
export function linkHorizontal(
  s: HierarchyPointNode<TreeNode>,
  d: HierarchyPointNode<TreeNode>,
  renderer: Renderer,
): string {
  const sAnchor = renderer.getFamilyAnchor(s.data);
  const dAnchor =
    s.id === d.data.spouseParentNodeId
      ? renderer.getSpouseAnchor(d.data)
      : renderer.getIndiAnchor(d.data);
  const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
  const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
  const midX = (s.x + s.data.width! / 2 + d.x - d.data.width! / 2) / 2;
  return `M ${sx} ${sy}
          L ${midX} ${sy},
            ${midX} ${dy},
            ${dx} ${dy}`;
}

/** Creates a path from parent to the child node (vertical layout). */
export function linkVertical(
  s: HierarchyPointNode<TreeNode>,
  d: HierarchyPointNode<TreeNode>,
  renderer: Renderer,
  vSpacing: number = V_SPACING,
): string {
  const sAnchor = renderer.getFamilyAnchor(s.data);
  const dAnchor =
    s.id === d.data.spouseParentNodeId
      ? renderer.getSpouseAnchor(d.data)
      : renderer.getIndiAnchor(d.data);
  const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
  const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
  const midY = s.y + s.data.height! / 2 + vSpacing / 2;
  return `M ${sx} ${sy}
          L ${sx} ${midY},
            ${dx} ${midY},
            ${dx} ${dy}`;
}

/** Creates a path for an additional marriage. */
export function linkAdditionalMarriage(
  node: HierarchyPointNode<TreeNode>,
  renderer: Renderer,
): string {
  const nodeIndex = node.parent!.children!.findIndex(
    (n) => n.data.id === node.data.id,
  );
  const siblingNode = node.parent!.children![nodeIndex - 1];
  const sAnchor = renderer.getIndiAnchor(node.data);
  const dAnchor = renderer.getIndiAnchor(siblingNode.data);
  const [sx, sy] = [node.x + sAnchor[0], node.y + sAnchor[1]];
  const [dx, dy] = [siblingNode.x + dAnchor[0], siblingNode.y + dAnchor[1]];
  return `M ${sx}, ${sy}
          L ${dx}, ${dy}`;
}

/** Renders connecting link paths between nodes. */
export class LinkRenderer {
  constructor(private readonly options: ChartOptions) {}

  renderLinks(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const link = (
        parent: HierarchyPointNode<TreeNode>,
        child: HierarchyPointNode<TreeNode>,
      ) => {
        if (child.data.additionalMarriage) {
          return linkAdditionalMarriage(child, this.options.renderer);
        }
        const flipVertically = parent.data.generation! > child.data.generation!;
        if (this.options.horizontal) {
          if (flipVertically) {
            return linkHorizontal(child, parent, this.options.renderer);
          }
          return linkHorizontal(parent, child, this.options.renderer);
        }
        if (flipVertically) {
          return linkVertical(child, parent, this.options.renderer);
        }
        return linkVertical(parent, child, this.options.renderer);
      };

      const links = nodes.filter(
        (n) => !!n.parent || n.data.additionalMarriage,
      );
      const boundLinks = svg
        .select('g')
        .selectAll('path.link')
        .data(links, linkId);
      const path = boundLinks
        .enter()
        .insert('path', 'g')
        .attr('class', (node) =>
          node.data.additionalMarriage ? 'link additional-marriage' : 'link',
        )
        .attr('d', (node) => link(node.parent!, node));

      const totalItems =
        boundLinks.exit().size() + boundLinks.size() + path.size();
      const tracker = createTransitionTracker(
        this.options.animate,
        totalItems,
        resolve,
      );

      const linkTransition = this.options.animate
        ? boundLinks
            .transition()
            .delay(HIDE_TIME_MS)
            .duration(MOVE_TIME_MS)
            .on('end', tracker.transitionDone)
        : boundLinks;
      linkTransition.attr('d', (node) => link(node.parent!, node));

      if (this.options.animate) {
        path
          .style('opacity', 0)
          .transition()
          .delay(2 * HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(0)
          .style('opacity', 1)
          .on('end', tracker.transitionDone);

        boundLinks
          .exit()
          .transition()
          .duration(0)
          .style('opacity', 0)
          .remove()
          .on('end', tracker.transitionDone);
      } else {
        boundLinks.exit().remove();
      }
    });
  }
}
