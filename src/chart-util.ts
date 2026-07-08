/// <reference path='d3-flextree.d.ts' />

import { BaseType, select, Selection } from 'd3-selection';
import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';
import {
  ChartOptions,
  ExpanderState,
  TreeNode,
  TreeNodeSelection,
} from './api';
import {
  ChartLayout,
  ChartSizeInfo,
  LayoutOptions,
  getChartInfo,
  getChartInfoWithoutMargin,
  H_SPACING,
  V_SPACING,
} from './chart-layout';
import { NodeRenderer } from './node-renderer';
import {
  LinkRenderer,
  linkId,
  linkHorizontal,
  linkVertical,
  linkAdditionalMarriage,
} from './link-renderer';
import { ControlRenderer, getExpanderCss } from './control-renderer';
import { HIDE_TIME_MS, MOVE_TIME_MS } from './transition-util';

export {
  H_SPACING,
  V_SPACING,
  LayoutOptions,
  ChartSizeInfo,
  getChartInfo,
  getChartInfoWithoutMargin,
  linkId,
  linkHorizontal,
  linkVertical,
  linkAdditionalMarriage,
  getExpanderCss,
  HIDE_TIME_MS,
  MOVE_TIME_MS,
  ChartLayout,
  NodeRenderer,
  LinkRenderer,
  ControlRenderer,
};

type SVGSelection = Selection<BaseType, {}, BaseType, {}>;

/** Utility class with common code for all chart types. Refactored into specialized sub-renderers. */
export class ChartUtil {
  private readonly layout: ChartLayout;
  private readonly nodeRenderer: NodeRenderer;
  private readonly linkRenderer: LinkRenderer;
  private readonly controlRenderer: ControlRenderer;

  constructor(readonly options: ChartOptions) {
    this.layout = new ChartLayout(options);
    this.nodeRenderer = new NodeRenderer(options);
    this.linkRenderer = new LinkRenderer(options);
    this.controlRenderer = new ControlRenderer(options);
  }

  updateSvgDimensions(chartInfo: ChartSizeInfo) {
    const svg = select(this.options.svgSelector);
    const group = svg.select('g');
    const transition = this.options.animate
      ? group.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS)
      : group;
    transition.attr(
      'transform',
      `translate(${chartInfo.origin[0]}, ${chartInfo.origin[1]})`,
    );
  }

  layOutChart<N extends TreeNode>(
    root: HierarchyNode<N>,
    layoutOptions: LayoutOptions = {},
  ): Array<HierarchyPointNode<N>> {
    return this.layout.layOutChart(root, layoutOptions);
  }

  renderChart(nodes: Array<HierarchyPointNode<TreeNode>>): Promise<void> {
    const svg = this.getSvgForRendering();
    const nodeAnimation = this.renderNodes(nodes, svg);
    const linkAnimation = this.renderLinks(nodes, svg);
    const expanderAnimation = this.renderControls(nodes, svg);
    return Promise.all([
      nodeAnimation,
      linkAnimation,
      expanderAnimation,
    ]) as unknown as Promise<void>;
  }

  renderNodes(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection,
  ): Promise<void> {
    return this.nodeRenderer.renderNodes(nodes, svg);
  }

  renderLinks(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection,
  ): Promise<void> {
    return this.linkRenderer.renderLinks(nodes, svg);
  }

  renderExpander(
    nodes: TreeNodeSelection,
    stateGetter: (
      node: HierarchyPointNode<TreeNode>,
    ) => ExpanderState | undefined,
    clickCallback?: (id: string) => void,
  ) {
    return this.controlRenderer.renderExpander(
      nodes,
      stateGetter,
      clickCallback,
    );
  }

  renderFamilyControls(nodes: TreeNodeSelection) {
    return this.controlRenderer.renderFamilyControls(nodes);
  }

  renderIndiControls(nodes: TreeNodeSelection) {
    return this.controlRenderer.renderIndiControls(nodes);
  }

  renderSpouseControls(nodes: TreeNodeSelection) {
    return this.controlRenderer.renderSpouseControls(nodes);
  }

  renderControls(
    nodes: Array<HierarchyPointNode<TreeNode>>,
    svg: SVGSelection,
  ): Promise<void> {
    return this.controlRenderer.renderControls(nodes, svg);
  }

  getSvgForRendering(): SVGSelection {
    const svg = select(this.options.svgSelector) as SVGSelection;
    if (svg.select('g').empty()) {
      svg.append('g');
    }
    return svg;
  }
}
