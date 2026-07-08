import { BaseType, Selection } from 'd3-selection';
import { HierarchyPointNode } from 'd3-hierarchy';
import 'd3-transition';
import {
  ChartOptions,
  ExpanderDirection,
  ExpanderState,
  TreeNode,
  TreeNodeSelection,
} from './api';
import { getVSize } from './composite-renderer';
import {
  createTransitionTracker,
  HIDE_TIME_MS,
  MOVE_TIME_MS,
} from './transition-util';

type SVGSelection = Selection<BaseType, {}, BaseType, {}>;

export function getExpanderCss(): string {
  return `
.expander {
  fill: white;
  stroke: black;
  stroke-width: 2px;
  cursor: pointer;
}`;
}

/** Renders expander (+/-) controls on nodes. */
export class ControlRenderer {
  constructor(private readonly options: ChartOptions) {}

  renderExpander(
    nodes: TreeNodeSelection,
    stateGetter: (
      node: HierarchyPointNode<TreeNode>,
    ) => ExpanderState | undefined,
    clickCallback?: (id: string) => void,
  ) {
    nodes = nodes.filter((node) => stateGetter(node) !== undefined);

    nodes.on('click', (_event, data) => {
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

  private renderExpanderGroup(
    nodes: TreeNodeSelection,
    className: string,
    stateGetter: (
      node: HierarchyPointNode<TreeNode>,
    ) => ExpanderState | undefined,
    anchorGetter: (node: TreeNode) => [number, number],
    yOffsetGetter: (node: TreeNode) => number,
    direction: ExpanderDirection,
  ) {
    const boundNodes = nodes
      .selectAll(`g.${className}`)
      .data((node) => (stateGetter(node) !== undefined ? [node] : []));

    const nodeEnter: TreeNodeSelection = boundNodes
      .enter()
      .append('g')
      .attr('class', `${className} expander`);

    const merged = nodeEnter.merge(boundNodes);

    const updateTransition = this.options.animate
      ? merged.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS)
      : merged;

    updateTransition.attr('transform', (node: HierarchyPointNode<TreeNode>) => {
      const anchor = anchorGetter(node.data);
      return `translate(${anchor[0] - 6}, ${yOffsetGetter(node.data)})`;
    });
    this.renderExpander(merged, stateGetter, (id) =>
      this.options.expanderCallback?.(id, direction),
    );
    boundNodes.exit().remove();
  }

  renderFamilyControls(nodes: TreeNodeSelection) {
    this.renderExpanderGroup(
      nodes,
      'familyExpander',
      (node) => node.data.family?.expander,
      (node) => this.options.renderer.getFamilyAnchor(node),
      (node) => -node.height! / 2 + getVSize(node, !!this.options.horizontal),
      ExpanderDirection.FAMILY,
    );
  }

  renderIndiControls(nodes: TreeNodeSelection) {
    this.renderExpanderGroup(
      nodes,
      'indiExpander',
      (node) => node.data.indi?.expander,
      (node) => this.options.renderer.getIndiAnchor(node),
      (node) => -node.height! / 2 - 12,
      ExpanderDirection.INDI,
    );
  }

  renderSpouseControls(nodes: TreeNodeSelection) {
    this.renderExpanderGroup(
      nodes,
      'spouseExpander',
      (node) => node.data.spouse?.expander,
      (node) => this.options.renderer.getSpouseAnchor(node),
      (node) => -node.height! / 2 - 12,
      ExpanderDirection.SPOUSE,
    );
  }

  renderControls(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection,
  ): Promise<void> {
    if (!this.options.expanders) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
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
          `translate(${node.x}, ${node.y})`,
      );

      const totalItems =
        boundNodes.exit().size() + boundNodes.size() + nodeEnter.size();
      const tracker = createTransitionTracker(
        this.options.animate,
        totalItems,
        resolve,
      );

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
          `translate(${node.x}, ${node.y})`,
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
          .on('end', tracker.transitionDone);
      } else {
        boundNodes.exit().remove();
      }
    });
  }
}
