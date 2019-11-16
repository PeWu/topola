import * as d3 from 'd3';
import { ChartInfo, ChartOptions, TreeNode as BaseTreeNode } from '../api';
import { TreeNode, LinkType, otherSideLinkType } from './api';
import { ChartUtil, getChartInfo } from '../chart-util';
import { Direction, Vec2, last, points2pathd } from '../utils';

const LINKS_BASE_OFFSET = 17;
const PARENT_LINK_ANCHOR_X_OFFSET = 15;
const SIBLING_LINK_ANCHOR_Y_OFFSET = 5;
const SIBLING_LINK_STARTER_LENGTH = 7;
const LINKS_SEPARATION = 6;
const LINK_STUB_CIRCLE_R = 3;

export class KinshipChartRenderer {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(this.options);
  }

  layOut(
    upRoot: d3.HierarchyNode<TreeNode>,
    downRoot: d3.HierarchyNode<TreeNode>
  ): [
    Array<d3.HierarchyPointNode<TreeNode>>,
    Array<d3.HierarchyPointNode<TreeNode>>
  ] {
    const svg = this.util.getSvgForRendering();
    // Add styles so that calculating text size is correct.
    if (svg.select('style').empty()) {
      svg.append('style').text(this.options.renderer.getCss());
    }

    return [
      this.util.layOutChart(upRoot, { flipVertically: true }),
      this.util.layOutChart(downRoot),
    ];
  }

  render(
    upNodes: Array<d3.HierarchyPointNode<TreeNode>>,
    downNodes: Array<d3.HierarchyPointNode<TreeNode>>,
    rootsCount: number
  ): ChartInfo {
    const allNodes = upNodes.concat(downNodes);
    const allNodesDeduped = allNodes.slice(1); // Remove duplicate start/center node

    // Prepare for rendering
    upNodes.forEach(node => this.setLinkYs(node, true));
    downNodes.forEach(node => this.setLinkYs(node, false));

    // Render chart
    this.util.renderNodes(allNodesDeduped, this.util.getSvgForRendering());
    this.renderLinks(allNodes);
    if (rootsCount > 1) {
      this.renderRootDummyAdditionalMarriageLinkStub(allNodes[0]);
    }

    const info = getChartInfo(allNodesDeduped);
    this.util.updateSvgDimensions(info);
    return info;
  }

  private renderLinks(nodes: Array<d3.HierarchyPointNode<TreeNode>>) {
    const svgg = this.util.getSvgForRendering().select('g');
    const keyFn = (d: d3.HierarchyPointNode<TreeNode>) => d.data.id;

    // Render links
    const boundLinkNodes = svgg
      .selectAll('path.internode-link')
      .data(nodes.filter(n => !!n.parent), keyFn);
    boundLinkNodes
      .enter()
      .insert('path' as string, 'g')
      .attr('class', node => this.cssClassForLink(node))
      .merge(boundLinkNodes)
      .attr('d', node => {
        const linkPoints = node.data.primaryMarriage
          ? this.additionalMarriageLinkPoints(node)
          : this.linkPoints(node.parent!, node, node.data.linkFromParentType!);
        return points2pathd(linkPoints);
      });
    boundLinkNodes.exit().remove();

    // Render link stubs container "g" element
    const boundLinkStubNodes = svgg
      .selectAll('g.link-stubs')
      .data(
        nodes.filter(
          n => n.data.duplicateOf || n.data.duplicated || n.data.primaryMarriage
        ),
        keyFn
      );
    const linkStubNodesEnter = boundLinkStubNodes
      .enter()
      .insert('g' as string, 'g')
      .attr('class', 'link-stubs');
    boundLinkStubNodes.exit().remove();

    // Render link stubs
    const boundLinkStubs = linkStubNodesEnter
      .merge(boundLinkStubNodes)
      .selectAll('g')
      .data(
        node => this.nodeToLinkStubRenderInfos(node),
        (d: LinkStubRenderInfo) => d.linkType.toString()
      );
    boundLinkStubs
      .enter()
      .append('g')
      .call(g =>
        g
          .append('path')
          .attr('class', d => this.cssClassForLinkStub(d.linkType))
          .merge(boundLinkStubs.select('path.link-stub'))
          .attr('d', d => points2pathd(d.points))
      )
      .call(g =>
        g
          .append('circle')
          .attr('r', LINK_STUB_CIRCLE_R)
          .style('stroke', 'black')
          .style('fill', 'none')
          .merge(boundLinkStubs.select('circle'))
          .attr(
            'transform',
            d =>
              `translate(${last(d.points).x}, ${last(d.points).y +
                LINK_STUB_CIRCLE_R * d.treeDir})`
          )
      );
    boundLinkStubs.exit().remove();
  }

  private cssClassForLink(fromNode: d3.HierarchyPointNode<TreeNode>): string {
    if (fromNode.data.primaryMarriage) {
      return 'link internode-link additional-marriage';
    }
    return (
      'link internode-link ' +
      this.cssClassForLinkType(fromNode.data.linkFromParentType!)
    );
  }

  private cssClassForLinkStub(linkType: LinkType): string {
    return 'link link-stub ' + this.cssClassForLinkType(linkType);
  }

  private cssClassForLinkType(linkType: LinkType): string {
    switch (linkType) {
      case LinkType.IndiParents:
      case LinkType.SpouseParents:
        return 'parents-link';
      case LinkType.IndiSiblings:
      case LinkType.SpouseSiblings:
        return 'siblings-link';
      case LinkType.Children:
        return 'children-link';
    }
  }

  private nodeToLinkStubRenderInfos(
    node: d3.HierarchyPointNode<TreeNode>
  ): LinkStubRenderInfo[] {
    return node.data.linkStubs.map(linkType => {
      const isUpTree = node.y < node.parent!.y;
      const treeDir = isUpTree ? -1 : 1;
      const anchorPoints = this.linkAnchorPoints(node, linkType, isUpTree);
      const y =
        node.data.linkYs!.children -
        (2 * LINKS_SEPARATION + 2 * LINK_STUB_CIRCLE_R) * treeDir;
      return {
        treeDir,
        linkType,
        points: [...anchorPoints, { x: last(anchorPoints).x, y }],
      } as LinkStubRenderInfo;
    });
  }

  private getLinkY(
    node: d3.HierarchyPointNode<TreeNode>,
    type: LinkType
  ): number {
    switch (type) {
      case LinkType.IndiParents:
        return node.data.linkYs!.indi;
      case LinkType.IndiSiblings:
        return node.data.linkYs!.indi;
      case LinkType.SpouseParents:
        return node.data.linkYs!.spouse;
      case LinkType.SpouseSiblings:
        return node.data.linkYs!.spouse;
      case LinkType.Children:
        return node.data.linkYs!.children;
    }
  }

  private setLinkYs(node: d3.HierarchyPointNode<TreeNode>, isUpTree: boolean) {
    const treeDir = isUpTree ? -1 : 1;
    const base = node.y + (node.data.height! / 2 + LINKS_BASE_OFFSET) * treeDir;
    const offset = LINKS_SEPARATION * treeDir;
    const [indiOffsetDir, spouseOffsetDir] = this.calcLinkOffsetDirs(node);
    node.data.linkYs = {
      indi: base + offset * indiOffsetDir,
      spouse: base + offset * spouseOffsetDir,
      children: base,
    };
  }

  /***
   * Calculates indi (indiParent and indiSiblings) and spouse (spouseParent and spouseSiblings)
   * links offset directions, so they don't merge/collide with children links and with each other.
   ***/
  private calcLinkOffsetDirs(
    node: d3.HierarchyPointNode<TreeNode>
  ): [Direction, Direction] {
    const childNodes = node.data.childNodes;
    if (childNodes.children.length) {
      // Check children-indi and children-spouse links collisions
      const indiParentLinkAnchorX = this.linkAnchorPoints(
        node,
        LinkType.IndiParents,
        true
      )[0].x;
      const spouseParentLinkAnchorX = this.linkAnchorPoints(
        node,
        LinkType.SpouseParents,
        true
      )[0].x;
      const childrenLinksX = {
        min: this.findMinXOfChildNodesAnchors(node, childNodes.children),
        max: this.findMaxXOfChildNodesAnchors(node, childNodes.children),
      };
      if (
        childrenLinksX.min < indiParentLinkAnchorX &&
        childrenLinksX.max > spouseParentLinkAnchorX
      ) {
        return [-1, -1]; // This shouldn't happen! It can't happen with start node, because start node have children links going down and other links going up. It can't happen with non-start node, as there can't be outgoing indi, spouse and children links at the same time on non-start node. -- But.. It might be useful to not remove it, so that this function might be used when constructing links for other types of charts.
      } else if (childrenLinksX.min < indiParentLinkAnchorX) {
        return [-1, 1];
      } else if (childrenLinksX.max > spouseParentLinkAnchorX) {
        return [1, -1];
      }
    } else if (
      (childNodes.indiParents.length || childNodes.indiSiblings.length) &&
      (childNodes.spouseParents.length || childNodes.spouseSiblings.length)
    ) {
      // Check indi-spouse links collision
      const indiParentLinkAnchorX = this.linkAnchorPoints(
        node,
        LinkType.IndiParents,
        true
      )[0].x;
      const spouseLinksMinX = this.findMinXOfChildNodesAnchors(
        node,
        childNodes.spouseSiblings.concat(childNodes.spouseParents)
      );
      if (spouseLinksMinX < indiParentLinkAnchorX) {
        return [-1, 1];
      }
    }
    return [1, -1];
  }

  private findMinXOfChildNodesAnchors(
    parentNode: d3.HierarchyPointNode<TreeNode>,
    childNodes: TreeNode[]
  ): number {
    return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, true);
  }

  private findMaxXOfChildNodesAnchors(
    parentNode: d3.HierarchyPointNode<TreeNode>,
    childNodes: TreeNode[]
  ): number {
    return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, false);
  }

  private findExtremeXOfChildNodesAnchors(
    parentNode: d3.HierarchyPointNode<TreeNode>,
    childNodes: TreeNode[],
    isMin: boolean
  ): number {
    const extremeFindingFunction = isMin ? d3.min : d3.max;
    const dir = isMin ? -1 : 1;
    const childNodesSet = new Set(childNodes);
    return (
      extremeFindingFunction(
        parentNode.children!.filter(n => childNodesSet.has(n.data)),
        n => n.x + (dir * n.data.width!) / 2
      )! +
      dir * SIBLING_LINK_STARTER_LENGTH
    );
  }

  private linkPoints(
    from: d3.HierarchyPointNode<TreeNode>,
    to: d3.HierarchyPointNode<TreeNode>,
    type: LinkType
  ): Vec2[] {
    const isUpTree = from.y > to.y;
    const pointsFrom = this.linkAnchorPoints(from, type, isUpTree);
    const pointsTo = this.linkAnchorPoints(
      to,
      otherSideLinkType(type),
      !isUpTree
    ).reverse();
    const y = this.getLinkY(from, type);
    return [
      ...pointsFrom,
      { x: pointsFrom[pointsFrom.length - 1].x, y },
      { x: pointsTo[0].x, y },
      ...pointsTo,
    ];
  }

  private additionalMarriageLinkPoints(
    node: d3.HierarchyPointNode<BaseTreeNode>
  ): Vec2[] {
    const nodeIndex = node.parent!.children!.findIndex(
      n => n.data.id === node.data.id
    );
    const prevSiblingNode = node.parent!.children![nodeIndex - 1];
    const y = this.indiMidY(node);
    return [{ x: prevSiblingNode.x, y }, { x: node.x, y }];
  }

  private linkAnchorPoints(
    node: d3.HierarchyPointNode<BaseTreeNode>,
    type: LinkType,
    top: boolean
  ): Vec2[] {
    const [x, y] = [node.x, node.y];
    const [w, h] = [node.data.width!, node.data.height!];
    const leftEdge = x - w / 2;
    const rightEdge = x + w / 2;
    const [indiW, spouseW, familyW] = [
      node.data.indi,
      node.data.spouse,
      node.data.family,
    ].map(e => (e ? e.width! : 0));
    const indisW = indiW + spouseW;
    const indisLeftEdge =
      x - w / 2 + (familyW > indisW ? (familyW - indisW) / 2 : 0);
    const indisRightEdge = indisLeftEdge + indisW;
    const siblingAnchorY =
      this.indiMidY(node) + SIBLING_LINK_ANCHOR_Y_OFFSET * (top ? -1 : 1);
    switch (type) {
      case LinkType.IndiParents:
        return [
          { x: indisLeftEdge + PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2 },
        ];
      case LinkType.SpouseParents:
        return [
          { x: indisRightEdge - PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2 },
        ];
      case LinkType.IndiSiblings:
        return [
          { x: indisLeftEdge, y: siblingAnchorY },
          {
            x:
              (familyW > indisW && !top ? leftEdge : indisLeftEdge) -
              SIBLING_LINK_STARTER_LENGTH,
            y: siblingAnchorY,
          },
        ];
      case LinkType.SpouseSiblings:
        return [
          { x: indisRightEdge, y: siblingAnchorY },
          {
            x:
              (familyW > indisW && !top ? rightEdge : indisRightEdge) +
              SIBLING_LINK_STARTER_LENGTH,
            y: siblingAnchorY,
          },
        ];
      case LinkType.Children:
        return [
          { x: indisLeftEdge + (node.data.spouse ? indiW : indiW / 2), y },
        ];
    }
  }

  private indiMidY(node: d3.HierarchyPointNode<BaseTreeNode>): number {
    return node.y - node.data.height! / 2 + node.data.indi!.height! / 2;
  }

  private renderRootDummyAdditionalMarriageLinkStub(
    root: d3.HierarchyPointNode<BaseTreeNode>
  ) {
    const svgg = this.util.getSvgForRendering().select('g');
    const y = this.indiMidY(root);
    const x = root.data.width! / 2 + 20;
    const r = 3;
    svgg.selectAll('.root-dummy-additional-marriage').remove();
    svgg
      .insert('g', 'g')
      .attr('class', 'root-dummy-additional-marriage')
      .call(g =>
        g
          .append('path')
          .attr('d', `M 0 ${y} L ${x} ${y}`)
          .attr('class', 'link additional-marriage')
      )
      .call(g =>
        g
          .append('circle')
          .attr('transform', `translate(${x + r}, ${y})`)
          .attr('r', r)
          .style('stroke', 'black')
          .style('fill', 'black')
      );
  }
}

interface LinkStubRenderInfo {
  treeDir: Direction;
  linkType: LinkType;
  points: Vec2[];
}
