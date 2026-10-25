import { BaseType, Selection } from 'd3-selection';
import { HierarchyPointNode } from 'd3-hierarchy';
import 'd3-transition';
import { ChartOptions, TreeNode } from './api';
import {
  createTransitionTracker,
  HIDE_TIME_MS,
  MOVE_TIME_MS,
} from './transition-util';

type SVGSelection = Selection<BaseType, {}, BaseType, {}>;

/** Number of colors in the color-by-generation palette. */
export const GENERATION_COLOR_COUNT = 12;

/**
 * Returns the color-by-generation palette index for a generation. The palette
 * repeats, so distant generations keep cycling through the colors.
 */
export function generationColorIndex(generation: number): number {
  return (
    ((generation % GENERATION_COLOR_COUNT) + GENERATION_COLOR_COUNT) %
    GENERATION_COLOR_COUNT
  );
}

/** Renders individual and family node boxes using the configured Renderer. */
export class NodeRenderer {
  constructor(private readonly options: ChartOptions) {}

  renderNodes(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const boundNodes = svg
        .select('g')
        .selectAll('g.node')
        .data(nodes, (d: HierarchyPointNode<TreeNode>) => d.id!);

      const nodeEnter = boundNodes.enter().append('g' as string);

      const totalItems =
        boundNodes.exit().size() + boundNodes.size() + nodeEnter.size();
      const tracker = createTransitionTracker(
        this.options.animate,
        totalItems,
        resolve,
      );

      nodeEnter
        .merge(boundNodes)
        .attr(
          'class',
          (node) =>
            `node generation${node.data.generation} generation-color${generationColorIndex(
              node.data.generation ?? 0,
            )}`,
        );
      nodeEnter.attr(
        'transform',
        (node: HierarchyPointNode<TreeNode>) =>
          `translate(${node.x - node.data.width! / 2}, ${
            node.y - node.data.height! / 2
          })`,
      );
      if (this.options.animate) {
        nodeEnter
          .style('opacity', 0)
          .transition()
          .delay(HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(HIDE_TIME_MS)
          .style('opacity', 1)
          .on('end', tracker.transitionDone);
      }
      const updateTransition = this.options.animate
        ? boundNodes
            .transition()
            .delay(HIDE_TIME_MS)
            .duration(MOVE_TIME_MS)
            .on('end', tracker.transitionDone)
        : boundNodes;
      updateTransition.attr(
        'transform',
        (node: HierarchyPointNode<TreeNode>) =>
          `translate(${node.x - node.data.width! / 2}, ${
            node.y - node.data.height! / 2
          })`,
      );
      this.options.renderer.render(nodeEnter, boundNodes);
      if (this.options.animate) {
        boundNodes
          .exit()
          .transition()
          .duration(HIDE_TIME_MS)
          .style('opacity', 0)
          .remove()
          .on('end', tracker.transitionDone);
      } else {
        boundNodes.exit().remove();
      }
    });
  }
}
