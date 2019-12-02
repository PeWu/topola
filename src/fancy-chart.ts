import * as d3 from 'd3';
import { Chart, ChartInfo, ChartOptions, Fam, Indi, TreeNode } from './api';
import { ChartUtil, getChartInfo, linkId } from './chart-util';
import { DUMMY_ROOT_NODE_ID, layOutDescendants } from './descendant-chart';

/** Returns an SVG line definition for a tree branch between two points. */
function branch(x1: number, y1: number, x2: number, y2: number): string {
  const yMid = y2 + 110;
  if (x2 > x1 + 100) {
    return `
      M ${x1 + 10}       ${y1}
      C ${x1 + 10}       ${yMid + 25}
        ${x1 + 45}       ${yMid + 10}
        ${(x1 + x2) / 2} ${yMid + 5}
        ${x2 - 45}       ${yMid}
        ${x2 + 2}        ${yMid - 25}
        ${x2 + 2}        ${y2}
      L ${x2 - 2}        ${y2}
      C ${x2 - 2}        ${yMid - 25}
        ${x2 - 45}       ${yMid - 10}
        ${(x1 + x2) / 2} ${yMid - 5}
        ${x1 + 45}       ${yMid}
        ${x1 - 10}       ${yMid + 25}
        ${x1 - 10}       ${y1}`;
  }
  if (x2 < x1 - 100) {
    return `
      M ${x1 - 10}       ${y1}
      C ${x1 - 10}       ${yMid + 25}
        ${x1 - 45}       ${yMid + 10}
        ${(x1 + x2) / 2} ${yMid + 5}
        ${x2 + 45}       ${yMid}
        ${x2 - 2}        ${yMid - 25}
        ${x2 - 2}        ${y2}
      L ${x2 + 2}        ${y2}
      C ${x2 + 2}        ${yMid - 25}
        ${x2 + 45}       ${yMid - 10}
        ${(x1 + x2) / 2} ${yMid - 5}
        ${x1 - 45}       ${yMid}
        ${x1 + 10}       ${yMid + 25}
        ${x1 + 10}       ${y1}`;
  }
  return `
    M ${x1 + 10}       ${y1}
    C ${x1 + 10}       ${yMid + 25}
      ${x2 + 2}        ${yMid - 25}
      ${x2 + 2}        ${y2}
    L ${x2 - 2}        ${y2}
    C ${x2 - 2}        ${yMid - 25}
      ${x1 - 10}       ${yMid + 25}
      ${x1 - 10}       ${y1}`;
}

/** Renders a fancy descendants tree chart. */
export class FancyChart<IndiT extends Indi, FamT extends Fam> implements Chart {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(options);
  }

  /** Creates a path from parent to the child node (vertical layout). */
  private linkVertical(
    s: d3.HierarchyPointNode<TreeNode>,
    d: d3.HierarchyPointNode<TreeNode>
  ) {
    const sAnchor = this.options.renderer.getFamilyAnchor(s.data);
    const dAnchor =
      s.id === d.data.spouseParentNodeId
        ? this.options.renderer.getSpouseAnchor(d.data)
        : this.options.renderer.getIndiAnchor(d.data);
    const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
    const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
    return branch(dx, dy, sx, sy);
  }

  private linkAdditionalMarriage(node: d3.HierarchyPointNode<TreeNode>) {
    const nodeIndex = node.parent!.children!.findIndex(n => n.id === node.id);
    // Assert nodeIndex > 0.
    const siblingNode = node.parent!.children![nodeIndex - 1];
    const sAnchor = this.options.renderer.getIndiAnchor(node.data);
    const dAnchor = this.options.renderer.getIndiAnchor(siblingNode.data);
    const [sx, sy] = [node.x + sAnchor[0], node.y + sAnchor[1]];
    const [dx, dy] = [siblingNode.x + dAnchor[0], siblingNode.y + dAnchor[1]];
    return `M ${sx}, ${sy + 2}
              L ${dx}, ${dy + 10}
              ${dx}, ${dy - 10}
              ${sx}, ${sy - 2}`;
  }

  renderBackground(
    chartInfo: ChartInfo,
    svg: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>
  ) {
    svg
      .select('g')
      .append('rect')
      .attr('x', -chartInfo.origin[0])
      .attr('y', -chartInfo.origin[1])
      .attr('width', chartInfo.size[0])
      .attr('height', chartInfo.origin[1])
      .attr('fill', '#cff');
    svg
      .select('g')
      .append('rect')
      .attr('x', -chartInfo.origin[0])
      .attr('y', 0)
      .attr('width', chartInfo.size[0])
      .attr('height', chartInfo.size[1] - chartInfo.origin[1])
      .attr('fill', '#494');
  }

  renderLeaves(
    nodes: Array<d3.HierarchyPointNode<TreeNode>>,
    svg: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>
  ) {
    const gradient = svg
      .select('g')
      .append('radialGradient')
      .attr('id', 'gradient');
    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#8f8');
    gradient
      .append('stop')
      .attr('offset', '80%')
      .attr('stop-color', '#8f8')
      .attr('stop-opacity', 0.5);
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#8f8')
      .attr('stop-opacity', 0);
    const backgroundNodes = nodes.filter(
      n => n.parent && n.parent.id !== DUMMY_ROOT_NODE_ID
    );

    const minGeneration =
      d3.min(backgroundNodes, node => node.data.generation) || 0;
    const sizeFunction = (node: d3.HierarchyPointNode<TreeNode>) =>
      280 - 180 / Math.sqrt(1 + node.data.generation! - minGeneration);
    {
      const boundNodes = svg
        .select('g')
        .selectAll('g.background')
        .data(backgroundNodes, (d: d3.HierarchyPointNode<Node>) => d.id!);
      const enter = boundNodes.enter().append('g' as string);
      enter
        .merge(boundNodes)
        .attr('class', 'background')
        .attr(
          'transform',
          node =>
            `translate(${node.x - node.data.width! / 2}, ${node.y -
              node.data.height! / 2})`
        );

      const background = enter.append('g').attr('class', 'background');
      background
        .append('circle')
        .attr('class', 'background')
        .attr('r', sizeFunction)
        .attr('cx', node => node.data.width! / 2)
        .attr('cy', node => node.data.height! / 2)
        .style('fill', '#493');
    }
    {
      const boundNodes = svg
        .select('g')
        .selectAll('g.background2')
        .data(backgroundNodes, (d: d3.HierarchyPointNode<TreeNode>) => d.id!);
      const enter = boundNodes.enter().append('g' as string);
      enter
        .merge(boundNodes)
        .attr('class', 'background2')
        .attr(
          'transform',
          node =>
            `translate(${node.x - node.data.width! / 2}, ${node.y -
              node.data.height! / 2})`
        );

      const background = enter.append('g').attr('class', 'background2');
      background
        .append('circle')
        .attr('class', 'background')
        .attr('r', sizeFunction)
        .attr('cx', node => node.data.width! / 2)
        .attr('cy', node => node.data.height! / 2)
        .style('fill', 'url(#gradient)');
    }
  }

  renderLinks(
    nodes: Array<d3.HierarchyPointNode<TreeNode>>,
    svg: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>
  ) {
    const link = (
      parent: d3.HierarchyPointNode<TreeNode>,
      child: d3.HierarchyPointNode<TreeNode>
    ) => {
      if (child.data.additionalMarriage) {
        return this.linkAdditionalMarriage(child);
      }
      return this.linkVertical(child, parent);
    };

    const links = nodes.filter(n => !!n.parent);
    svg
      .select('g')
      .selectAll('path.branch')
      .data(links, linkId)
      .enter()
      .append('path')
      .attr('class', node =>
        node.data.additionalMarriage ? 'branch additional-marriage' : 'branch'
      )
      .attr('d', node => link(node.parent!, node));
  }

  renderTreeTrunk(
    nodes: Array<d3.HierarchyPointNode<TreeNode>>,
    svg: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>
  ) {
    const trunkNodes = nodes.filter(
      n => !n.parent || n.parent.id === DUMMY_ROOT_NODE_ID
    );
    svg
      .select('g')
      .selectAll('g.trunk')
      .data(trunkNodes, (d: d3.HierarchyPointNode<TreeNode>) => d.id!)
      .enter()
      .append('g')
      .attr('class', 'trunk')
      .attr('transform', node => `translate(${node.x}, ${node.y})`)
      .append('path')
      .attr(
        'd',
        `
          M 10 20
          L 10 40
          C 10 60 10 90 40 90
          L -40 90
          C -10 90 -10 60 -10 40
          L -10 20`
      );
  }

  render(): ChartInfo {
    const nodes = layOutDescendants(this.options, {
      flipVertically: true,
      vSpacing: 100,
    });
    const info = getChartInfo(nodes);
    info.origin[0] += 150;
    info.origin[1] += 150;
    info.size[0] += 300;
    info.size[1] += 250;

    const svg = this.util.getSvgForRendering();
    svg.append('style').text(`
      .branch, .trunk {
        fill: #632;
        stroke: #632;
      }`);

    this.renderBackground(info, svg);
    this.renderLeaves(nodes, svg);
    this.renderLinks(nodes, svg);
    this.renderTreeTrunk(nodes, svg);
    this.util.renderNodes(nodes, svg);

    this.util.updateSvgDimensions(info);
    return info;
  }
}
