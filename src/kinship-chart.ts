import * as d3 from 'd3';
import { Chart, ChartInfo, ChartOptions, TreeNode as BaseTreeNode, DataProvider, Indi, Fam } from './api';
import { IdGenerator } from './id-generator';
import { ChartUtil }   from './chart-util';
import { Direction, Vec2, nonEmpty, last, flatten, zip, deepFreeze, points2pathd } from './utils';


const MARGIN = 15;

const FAM_ID_CHAR = "F";
const LINKS_BASE_OFFSET = 17;
const PARENT_LINK_ANCHOR_X_OFFSET = 15;
const SIBLING_LINK_ANCHOR_Y_OFFSET = 5;
const SIBLING_LINK_STARTER_LENGTH = 7;
const LINKS_SEPARATION = 6;
const LINK_STUB_CIRCLE_R = 3;


export class KinshipChart implements Chart {
  readonly data: DataProvider<Indi, Fam>;
  readonly renderer: KinshipChartRenderer;

  constructor(readonly options: ChartOptions) {
    this.data = options.data;
    this.renderer = new KinshipChartRenderer(this.options);
  }

  render(): ChartInfo {
    const hierarchyCreator = new HierarchyCreator(this.data, this.options.startIndi || this.options.startFam);
    const [upNodes, downNodes] = this.renderer.layOut(hierarchyCreator.getUpRoot(), hierarchyCreator.getDownRoot());

    upNodes.concat(downNodes).forEach(node => {
      this.setChildNodesGenerationNumber(node);
    });

    return this.renderer.render(upNodes, downNodes, hierarchyCreator.getRootsCount());
  }

  private setChildNodesGenerationNumber(node: d3.HierarchyNode<TreeNode>) {
    const [indiParentsNodes, indiSiblingsNodes, spouseParentsNodes,
      spouseSiblingsNodes, childrenNodes] = this.getChildNodesByType(node);
    const setGenerationNumber = (childNode: d3.HierarchyNode<TreeNode>, value: number) =>
      childNode.data.generation = node.data.generation + value;

    indiParentsNodes.forEach(n =>    setGenerationNumber(n, -1));
    indiSiblingsNodes.forEach(n =>   setGenerationNumber(n,  0));
    spouseParentsNodes.forEach(n =>  setGenerationNumber(n, -1));
    spouseSiblingsNodes.forEach(n => setGenerationNumber(n,  0));
    childrenNodes.forEach(n =>       setGenerationNumber(n,  1));
  }

  private getChildNodesByType<N extends d3.HierarchyNode<TreeNode>>(node: N): [N[], N[], N[], N[], N[]] {
    if (!node || !node.children) return [[], [], [], [], []];
    const childNodesById = new Map(node.children.map(n => [n.data.id, n] as [string, N]));
    const node2hnode = (n: TreeNode) => n ? childNodesById.get(n.id) : null;
    const childNodes = node.data.childNodes;
    return [
      childNodes.indiParents.map(node2hnode),
      childNodes.indiSiblings.map(node2hnode),
      childNodes.spouseParents.map(node2hnode),
      childNodes.spouseSiblings.map(node2hnode),
      childNodes.children.map(node2hnode)
    ]
  }
}


export class KinshipChartRenderer {
  readonly util: ChartUtil;

  constructor(readonly options: ChartOptions) {
    this.util = new ChartUtil(this.options);
  }

  layOut(upRoot: d3.HierarchyNode<TreeNode>, downRoot: d3.HierarchyNode<TreeNode>): [d3.HierarchyPointNode<TreeNode>[], d3.HierarchyPointNode<TreeNode>[]] {
    const svg = this.getSvgForRendering();
    // Add styles so that calculating text size is correct.
    if (svg.select('style').empty())
      svg.append('style').text(this.options.renderer.getCss());

    return [
      this.util.layOutChart(upRoot, true),
      this.util.layOutChart(downRoot)
    ];
  }

  render(upNodes: d3.HierarchyPointNode<TreeNode>[], downNodes: d3.HierarchyPointNode<TreeNode>[], rootsCount: number): ChartInfo {
    const allNodes = upNodes.concat(downNodes);
    const allNodesDeduped = allNodes.slice(1);  // Remove duplicate start/center node

    // Prepare for rendering
    upNodes.forEach(node => this.setLinkYs(node, true));
    downNodes.forEach(node => this.setLinkYs(node, false));

    // Render chart
    this.util.renderNodes(allNodesDeduped);
    this.renderLinks(allNodes);
    if (rootsCount > 1) this.renderRootDummyAdditionalMarriageLinkStub(allNodes[0]);

    const info = this.getChartInfo(allNodesDeduped);
    this.util.updateSvgDimensions(info);
    return info;
  }

  private getChartInfo(nodes: d3.HierarchyPointNode<TreeNode>[]): ChartInfo {
    const minX = d3.min(nodes, n => n.x - n.data.width  / 2) - MARGIN;
    const minY = d3.min(nodes, n => n.y - n.data.height / 2) - MARGIN;
    const maxX = d3.max(nodes, n => n.x + n.data.width  / 2) + MARGIN;
    const maxY = d3.max(nodes, n => n.y + n.data.height / 2) + MARGIN;
    return {size: [maxX - minX, maxY - minY], origin: [-minX, -minY]};
  }

  private renderLinks(nodes: d3.HierarchyPointNode<TreeNode>[]) {
    const svgg = this.getSvgForRendering().select("g");
    const keyFn = (d: d3.HierarchyPointNode<TreeNode>) => d.data.id;

    // Render links
    const boundLinkNodes = svgg.selectAll("path.internode-link")
      .data(nodes.filter(n => !!n.parent), keyFn);
    boundLinkNodes.enter().insert("path" as string, "g")
        .attr("class", node => node.data.primaryMarriage ? "link internode-link additional-marriage" : "link internode-link")
      .merge(boundLinkNodes)
        .attr("d", node => {
          const linkPoints = node.data.primaryMarriage ? this.additionalMarriageLinkPoints(node) : this.linkPoints(node.parent, node, node.data.linkFromParentType);
          return points2pathd(linkPoints);
        });
    boundLinkNodes.exit().remove();

    // Render link stubs container "g" element
    const boundLinkStubNodes = svgg.selectAll("g.link-stubs")
      .data(nodes.filter(n => n.data.duplicateOf || n.data.primaryMarriage), keyFn);
    const linkStubNodesEnter = boundLinkStubNodes.enter().insert("g" as string, "g")
        .attr("class", "link-stubs");
    boundLinkStubNodes.exit().remove();

    // Render link stubs
    const boundLinkStubs = linkStubNodesEnter.merge(boundLinkStubNodes).selectAll("g")
      .data(node => this.nodeToLinkStubsRenderInfos(node), (d: LinkStubRenderInfo) => d.linkType.toString());
    boundLinkStubs.enter().append("g")
        .call(g => g.append("path")
            .attr("class", "link link-stub")
          .merge(boundLinkStubs.select("path.link-stub"))
            .attr("d", d => points2pathd(d.points))
        )
        .call(g => g.append("circle")
            .attr("r", LINK_STUB_CIRCLE_R)
            .style("stroke", "black")
            .style("fill", "none")
          .merge(boundLinkStubs.select("circle"))
            .attr("transform", d =>
              `translate(${last(d.points).x}, ${last(d.points).y + LINK_STUB_CIRCLE_R * d.treeDir})`
            )
        )
    boundLinkStubs.exit().remove();
  }

  private nodeToLinkStubsRenderInfos(node: d3.HierarchyPointNode<TreeNode>): LinkStubRenderInfo[] {
    return node.data.linkStubs.map(linkType => {
      const isUpTree = node.y < node.parent.y;
      const treeDir = isUpTree ? -1 : 1;
      const anchorPoints = this.linkAnchorPoints(node, linkType, isUpTree);
      const y = node.data.linkYs.children - (2 * LINKS_SEPARATION + 2 * LINK_STUB_CIRCLE_R) * treeDir;
      return {
        treeDir: treeDir,
        linkType: linkType,
        points: [...anchorPoints, {x: last(anchorPoints).x, y: y}]
      } as LinkStubRenderInfo;
    });
  }

  private getLinkY(node: d3.HierarchyPointNode<TreeNode>, type: LinkType): number {
    switch (type) {
      case LinkType.IndiParents:    return node.data.linkYs.indi;
      case LinkType.IndiSiblings:   return node.data.linkYs.indi;
      case LinkType.SpouseParents:  return node.data.linkYs.spouse;
      case LinkType.SpouseSiblings: return node.data.linkYs.spouse;
      case LinkType.Children:       return node.data.linkYs.children;
    }
  }

  private setLinkYs(node: d3.HierarchyPointNode<TreeNode>, isUpTree: boolean) {
    const treeDir = isUpTree ? -1 : 1;
    const base = node.y + (node.data.height/2 + LINKS_BASE_OFFSET) * treeDir;
    const offset = LINKS_SEPARATION * treeDir
    const [indiOffsetDir, spouseOffsetDir] = this.calcLinksOffsetDirs(node);
    node.data.linkYs = {
      indi:   base + offset * indiOffsetDir,
      spouse: base + offset * spouseOffsetDir,
      children: base
    };
  }

  /***
  * Calculates indi (indiParent and indiSiblings) and spouse (spouseParent and spouseSiblings)
  * links offset directions, so they don't merge/collide with children links and with each other.
  ***/
  private calcLinksOffsetDirs(node: d3.HierarchyPointNode<TreeNode>): [Direction, Direction] {
    const childNodes = node.data.childNodes;
    if (childNodes.children.length) {
      // Check children-indi and children-spouse links collisions
      const indiParentLinkAnchorX = this.linkAnchorPoints(node, LinkType.IndiParents, true)[0].x;
      const spouseParentLinkAnchorX = this.linkAnchorPoints(node, LinkType.SpouseParents, true)[0].x;
      const childrenLinksX = {
        min: this.findMinXOfChildNodesAnchors(node, childNodes.children),
        max: this.findMaxXOfChildNodesAnchors(node, childNodes.children)
      };
      if (childrenLinksX.min < indiParentLinkAnchorX && childrenLinksX.max > spouseParentLinkAnchorX)
        return [-1, -1];  // This shouldn't happen! It can't happen with start node, because start node have children links going down and other links going up. It can't happen with non-start node, as there can't be outgoing indi, spouse and children links at the same time on non-start node. -- But.. It might be useful to not remove it, so that this function might be used when constructing links for other types of charts.
      else if (childrenLinksX.min < indiParentLinkAnchorX)
        return [-1, 1];
      else if (childrenLinksX.max > spouseParentLinkAnchorX)
        return [1, -1];
    } else if ((childNodes.indiParents.length || childNodes.indiSiblings.length) && (childNodes.spouseParents.length || childNodes.spouseSiblings.length)) {
      // Check indi-spouse links collision
      const indiParentLinkAnchorX = this.linkAnchorPoints(node, LinkType.IndiParents, true)[0].x;
      const spouseLinksMinX = this.findMinXOfChildNodesAnchors(node, childNodes.spouseSiblings.concat(childNodes.spouseParents));
      if (spouseLinksMinX < indiParentLinkAnchorX)
        return [-1, 1];
    }
    return [1, -1];
  }

  private findMinXOfChildNodesAnchors(parentNode: d3.HierarchyPointNode<TreeNode>, childNodes: TreeNode[]): number {
    return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, true);
  }

  private findMaxXOfChildNodesAnchors(parentNode: d3.HierarchyPointNode<TreeNode>, childNodes: TreeNode[]): number {
    return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, false);
  }

  private findExtremeXOfChildNodesAnchors(parentNode: d3.HierarchyPointNode<TreeNode>, childNodes: TreeNode[], isMin: boolean): number {
    const extremeFindingFunction = isMin ? d3.min : d3.max;
    const dir = isMin ? -1 : 1;
    const childNodesSet = new Set(childNodes);
    return extremeFindingFunction(
      parentNode.children.filter(n => childNodesSet.has(n.data)),
      n => n.x + dir * n.data.width/2
    ) + dir * SIBLING_LINK_STARTER_LENGTH;
  }

  private linkPoints(from: d3.HierarchyPointNode<TreeNode>, to: d3.HierarchyPointNode<TreeNode>, type: LinkType): Vec2[] {
    const isUpTree = from.y > to.y;
    const pointsFrom = this.linkAnchorPoints(from, type, isUpTree);
    const pointsTo = this.linkAnchorPoints(to, otherSideLinkType(type), !isUpTree).reverse();
    const y = this.getLinkY(from, type);
    return [
      ...pointsFrom,
      {x: pointsFrom[pointsFrom.length - 1].x, y: y},
      {x: pointsTo[0].x, y: y},
      ...pointsTo
    ];
  }

  private additionalMarriageLinkPoints(node: d3.HierarchyPointNode<BaseTreeNode>): Vec2[] {
    const nodeIndex = node.parent.children.findIndex(n => n.data.id === node.data.id);
    const prevSiblingNode = node.parent.children[nodeIndex - 1];
    const y = this.nodeIndiMidY(node);
    return [{x: prevSiblingNode.x, y: y},  {x: node.x, y: y}]
  }

  private linkAnchorPoints(node: d3.HierarchyPointNode<BaseTreeNode>, type: LinkType, top: boolean): Vec2[] {
    const [x, y] = [node.x, node.y];
    const [w, h] = [node.data.width, node.data.height];
    const leftEdge  = x - w / 2;
    const rightEdge = x + w / 2;
    const [indiW, spouseW, familyW] = [node.data.indi, node.data.spouse, node.data.family].map(e => e ? e.width : 0);
    const indisW = indiW + spouseW;
    const indisLeftEdge = x - w/2 + (familyW > indisW ? (familyW - indisW) / 2 : 0);
    const indisRightEdge = indisLeftEdge + indisW;
    const siblingAnchorY = this.nodeIndiMidY(node) + SIBLING_LINK_ANCHOR_Y_OFFSET * (top ? -1 : 1);
    switch (type) {
      case LinkType.IndiParents:    return [{x: indisLeftEdge  + PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2}];
      case LinkType.SpouseParents:  return [{x: indisRightEdge - PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2}];
      case LinkType.IndiSiblings:   return [{x: indisLeftEdge,  y: siblingAnchorY}, {x: (familyW > indisW && !top ? leftEdge  : indisLeftEdge)  - SIBLING_LINK_STARTER_LENGTH, y: siblingAnchorY}];
      case LinkType.SpouseSiblings: return [{x: indisRightEdge, y: siblingAnchorY}, {x: (familyW > indisW && !top ? rightEdge : indisRightEdge) + SIBLING_LINK_STARTER_LENGTH, y: siblingAnchorY}];
      case LinkType.Children:       return [{x: indisLeftEdge + indiW, y: y}];
    }
  }

  private nodeIndiMidY(node: d3.HierarchyPointNode<BaseTreeNode>): number {
    return node.y - node.data.height/2 + node.data.indi.height/2;
  }

  private renderRootDummyAdditionalMarriageLinkStub(root: d3.HierarchyPointNode<BaseTreeNode>) {
    const svgg = this.getSvgForRendering().select("g");
    const y = this.nodeIndiMidY(root);
    const x = root.data.width/2 + 20;
    const r = 3;
    svgg.selectAll(".root-dummy-additional-marriage").remove();
    svgg.insert("g", "g")
        .attr("class", "root-dummy-additional-marriage")
        .call(g =>
          g.append("path")
              .attr("d", `M 0 ${y} L ${x} ${y}`)
              .attr("class", "link additional-marriage")
        )
        .call(g =>
          g.append("circle")
              .attr("transform", `translate(${x + r}, ${y})`)
              .attr("r", r)
              .style("stroke", "black")
              .style("fill", "black")
        );
  }

  private getSvgForRendering(): d3.Selection<d3.BaseType, {}, d3.BaseType, {}> {
    const svg = d3.select(this.options.svgSelector);
    if (svg.select("g").empty()) svg.append("g");
    return svg;
  }
}


export class HierarchyFilter {
  indiParents: boolean = true;
  indiSiblings: boolean = true;
  spouseParents: boolean = true;
  spouseSiblings: boolean = true;
  children: boolean = true;

  static allAccepting(): HierarchyFilter {
    return new HierarchyFilter();
  }

  static allRejecting(): HierarchyFilter {
    return new HierarchyFilter().modify({
      indiParents: false,
      indiSiblings: false,
      spouseParents: false,
      spouseSiblings: false,
      children: false
    });
  }

  constructor(overrides: any = {}) {
    this.modify(overrides);
  }

  modify(overrides: any): HierarchyFilter {
    Object.assign(this, overrides);
    return this;
  }
}


export class HierarchyCreator {
  static readonly UP_FILTER   = HierarchyFilter.allRejecting().modify({indiParents: true, spouseParents: true, indiSiblings: true, spouseSiblings: true});
  static readonly DOWN_FILTER = HierarchyFilter.allRejecting().modify({children: true});
  static readonly ALL_ACCEPTING_FILTER = HierarchyFilter.allAccepting();

  readonly data: DataProvider<Indi, Fam>;
  readonly startId: string;
  readonly startFamIndi: string;
  readonly queuedNodesById = new Map<string, TreeNode>();
  readonly idGenerator = new IdGenerator();
  private upRoot: d3.HierarchyNode<TreeNode> = undefined;
  private downRoot: d3.HierarchyNode<TreeNode> = undefined;

  constructor(data: DataProvider<Indi, Fam>, startId: string) {
    this.data = data;
    [this.startId, this.startFamIndi] = this.expandStartId(startId);
  }

  private expandStartId(startId: string): [string, string] {
    if (!startId) return [null, null];
    if (startId[0] === FAM_ID_CHAR) return [startId, null];
    const indi = this.data.getIndi(startId);
    if (!indi) return [null, null];
    const famss = indi.getFamiliesAsSpouse();
    if (famss.length) return [famss[0], startId];
    return [startId, null];
  }

  getUpRoot(): d3.HierarchyNode<TreeNode> {
    if (this.upRoot === undefined) this.createHierarchy();
    return this.upRoot;
  }

  getDownRoot(): d3.HierarchyNode<TreeNode> {
    if (this.downRoot === undefined) this.createHierarchy();
    return this.downRoot;
  }

  getRootsCount(): number {
    const upRoot = this.getUpRoot();
    const upIndi = upRoot.data.indi ? this.data.getIndi(upRoot.data.indi.id) : null;
    const upSpouse = upRoot.data.spouse ? this.data.getIndi(upRoot.data.spouse.id) : null;
    return (upIndi ? upIndi.getFamiliesAsSpouse().length : 0) +
           (upSpouse ? upSpouse.getFamiliesAsSpouse().length - 1 : 0)
  }

  private createHierarchy() {
    const upRoot   = this.idToNode(this.startId, null, null, false);
    const downRoot = this.idToNode(this.startId, null, null, false);
    if (this.startFamIndi) {
      upRoot.indi   = {id: this.startFamIndi}
      downRoot.indi = {id: this.startFamIndi}
    }
    const layerEnd = {id: "LAYER END MARKER"} as TreeNode;
    let [queue, otherQueue] = [[ upRoot, layerEnd ], [ downRoot ]];

    while (queue.length) {
      const node = queue.shift();
      if (node !== layerEnd) {
        const filter = node === upRoot || node === downRoot ?  //TODO: Filter only on root node?
          node === upRoot ? HierarchyCreator.UP_FILTER : HierarchyCreator.DOWN_FILTER :
          HierarchyCreator.ALL_ACCEPTING_FILTER;
        this.fillNodeData(node, filter);
        for (const childNode of node.childNodes.getAll())
          queue.push(childNode);
      } else {
        [queue, otherQueue] = otherQueue.length ? [otherQueue, queue] : [queue, otherQueue];
        if (queue.length) queue.push(layerEnd);
      }
    }

    const getChildNodes = (node: TreeNode) => {
      const childNodes = node.childNodes.getAll();
      return childNodes.length ? childNodes : null;
    }
    this.upRoot   = d3.hierarchy(upRoot, getChildNodes);
    this.downRoot = d3.hierarchy(downRoot, getChildNodes);
  }

  private fillNodeData(node: TreeNode, filter: HierarchyFilter) {
    if (node.id[0] === FAM_ID_CHAR) {
      const fam  = this.data.getFam(node.id);
      const [indiId, spouseId] = (node.indi && node.indi.id === fam.getMother()) ?
        [fam.getMother(), fam.getFather()] :
        [fam.getFather(), fam.getMother()];
      Object.assign(node, {
        id: this.idGenerator.getId(node.id),
        indi:   indiId   ? {id: indiId}   : null,
        spouse: spouseId ? {id: spouseId} : null,
        family: {id: fam.getId()},
      });
      node.childNodes = node.duplicateOf ? ChildNodes.EMPTY : this.childNodesForFam(fam, node, filter);
    } else {
      const indi = this.data.getIndi(node.id);
      Object.assign(node, {
        id: this.idGenerator.getId(node.id),
        indi: {id: indi.getId()},
      });
      node.childNodes = node.duplicateOf ? ChildNodes.EMPTY : this.childNodesForIndi(indi, node, filter);
    }
    node.linkStubs = this.createLinkStubs(node);
  }

  private childNodesForFam(fam: Fam, parentNode: TreeNode, filter: HierarchyFilter): ChildNodes {
    const indi   = parentNode.indi   ? this.data.getIndi(parentNode.indi.id)   : null;
    const spouse = parentNode.spouse ? this.data.getIndi(parentNode.spouse.id) : null;
    const [indiParentsFamsIds, indiSiblingsIds]     = this.getParentsAndSiblings(indi);
    const [spouseParentsFamsIds, spouseSiblingsIds] = this.getParentsAndSiblings(spouse);
    const childrenIds = fam.getChildren();
    return new ChildNodes({
      indiParents:    filter.indiParents    ? this.famsAsSpouseIdsToNodes(indiParentsFamsIds, parentNode, LinkType.IndiParents)       : [],
      indiSiblings:   filter.indiSiblings   ? this.indiIdsToFamsAsSpouseNodes(indiSiblingsIds, parentNode, LinkType.IndiSiblings)     : [],
      spouseParents:  filter.spouseParents  ? this.famsAsSpouseIdsToNodes(spouseParentsFamsIds, parentNode, LinkType.SpouseParents)   : [],
      spouseSiblings: filter.spouseSiblings ? this.indiIdsToFamsAsSpouseNodes(spouseSiblingsIds, parentNode, LinkType.SpouseSiblings) : [],
      children:       filter.children       ? this.indiIdsToFamsAsSpouseNodes(childrenIds, parentNode, LinkType.Children)             : []
    });
  }

  private childNodesForIndi(indi: Indi, parentNode: TreeNode, filter: HierarchyFilter): ChildNodes {
    const [indiParentsFamsIds, indiSiblingsIds] = this.getParentsAndSiblings(indi);
    return new ChildNodes({
      indiParents:    filter.indiParents  ? this.famsAsSpouseIdsToNodes(indiParentsFamsIds, parentNode, LinkType.IndiParents)   : [],
      indiSiblings:   filter.indiSiblings ? this.indiIdsToFamsAsSpouseNodes(indiSiblingsIds, parentNode, LinkType.IndiSiblings) : []
    });
  }

  private areParentsAndSiblingsPresent(indiId: string): [boolean, boolean] {
    const indi = this.data.getIndi(indiId);
    const famc = this.data.getFam(indi ? indi.getFamilyAsChild() : null);
    if (!famc) return [false, false];
    return [true, nonEmpty(famc.getChildren())];
  }

  private getParentsAndSiblings(indi: Indi): [string[], string[]] {
    const indiFamcId = indi ? indi.getFamilyAsChild() : null;
    const indiFamc = this.data.getFam(indiFamcId);
    if (!indiFamc) return [[], []];

    const [father, mother] = [indiFamc.getFather(), indiFamc.getMother()].map(id => this.data.getIndi(id));
    const parentFamsIds = [].concat(
      father ? father.getFamiliesAsSpouse() : [],
      mother ? mother.getFamiliesAsSpouse() : []
    ).filter(id => id !== indiFamcId);
    parentFamsIds.unshift(indiFamcId);

    const siblingsIds = Array.from(indiFamc.getChildren());
    siblingsIds.splice(siblingsIds.indexOf(indi.getId()), 1);  // Remove indi from indi's siblings

    return [parentFamsIds, siblingsIds]
  }

  private indiIdsToFamsAsSpouseNodes(indiIds: string[], parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
    return flatten(indiIds.map(id => this.indiIdToFamsAsSpouseNodes(id, parentNode, childNodeType)));
  }

  private indiIdToFamsAsSpouseNodes(indiId: string, parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
    if (this.isChildNodeTypeForbidden(childNodeType, parentNode)) return [];
    const famss = this.data.getIndi(indiId).getFamiliesAsSpouse();
    if (!famss.length) {
      const node = this.idToNode(indiId, parentNode, childNodeType);
      return node ? [node] : [];
    }

    const famssNodes: TreeNode[] = famss.map(id => {
      return {
        id: id,
        indi: {id: indiId},
        parentNode: parentNode,
        linkFromParentType: childNodeType,
        childNodes: null,
        linkStubs: null,
        duplicateOf: this.queuedNodesById.get(id)
      };
    });
    famssNodes.forEach((node, i) => {
      if (i != 0) node.primaryMarriage = famssNodes[0];
      if (!node.duplicateOf) this.queuedNodesById.set(node.id, node);
    });
    return famssNodes;
  }

  private famsAsSpouseIdsToNodes(ids: string[], parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
    const nodes = this.idsToNodes(ids, parentNode, childNodeType);
    nodes.slice(1).forEach(node => node.primaryMarriage = nodes[0]);
    return nodes;
  }

  private idsToNodes(ids: string[], parentNode: TreeNode, childNodeType: LinkType, duplicateCheck = true): TreeNode[] {
    return ids.map(id => this.idToNode(id, parentNode, childNodeType, duplicateCheck))
      .filter(node => node != null);
  }

  private idToNode(id: string, parentNode: TreeNode, childNodeType: LinkType, duplicateCheck = true): TreeNode {
    if (this.isChildNodeTypeForbidden(childNodeType, parentNode)) return null;
    if (id[0] === FAM_ID_CHAR) {
      const fam = this.data.getFam(id);
      if (!fam || !fam.getFather() && !fam.getMother()) return null;  // Don't create fam nodes that are missing both husband and wife
    }
    const duplicateOf = this.queuedNodesById.get(id);
    const node: TreeNode = {
      id: id,
      parentNode: parentNode,
      linkFromParentType: childNodeType,
      childNodes: null,
      linkStubs: null,
      duplicateOf: duplicateCheck ? duplicateOf : null
    };
    if (!duplicateOf) this.queuedNodesById.set(id, node);
    return node;
  }

  private createLinkStubs(node: TreeNode): LinkType[] {
    if (!node.duplicateOf && !node.primaryMarriage) return [];
    const linkTypes = [LinkType.IndiParents, LinkType.IndiSiblings, LinkType.SpouseParents, LinkType.SpouseSiblings, LinkType.Children];
    let arePresent = new Array(linkTypes.length).fill(false);

    if (node.id[0] === FAM_ID_CHAR) {
      const fam = this.data.getFam(node.family.id);
      if (fam)
        arePresent = [
          ...this.areParentsAndSiblingsPresent(node.indi ? node.indi.id : null),
          ...this.areParentsAndSiblingsPresent(node.spouse ? node.spouse.id : null),
          nonEmpty(fam.getChildren())
        ]
    } else
      arePresent.splice(0, 2, ...this.areParentsAndSiblingsPresent(node.indi.id));

    arePresent = arePresent.map((isPresent, i) =>
      isPresent &&
      !this.isChildNodeTypeForbidden(linkTypes[i], node) &&
      !node.childNodes.get(linkTypes[i]).length
    );

    return arePresent.map((isPresent, i) =>
      isPresent ? linkTypes[i] : null
    ).filter(x => x != null);
  }

  private isChildNodeTypeForbidden(childNodeType: LinkType, parentNode: TreeNode): boolean {
    if (childNodeType === null || !parentNode) return false;
    const type = otherSideLinkType(parentNode.linkFromParentType);

    if (parentNode.primaryMarriage) {
      // Forbid indi/spouse from parentNode that is also indi/spouse in primaryMarriage from having parents and siblings, as they are already added to primaryMarriage node. This prevents drawing parents/siblings of a person for each marriage of this person.
      const [indiId, spouseId] = [parentNode.indi.id, parentNode.spouse.id];
      const [pmIndiId, pmSpouseId] = [parentNode.primaryMarriage.indi.id, parentNode.primaryMarriage.spouse.id];
      if (indiId === pmIndiId || indiId == pmSpouseId) {
        if (childNodeType == LinkType.IndiParents ||
            childNodeType == LinkType.IndiSiblings) return true;
      } else if (spouseId === pmIndiId || spouseId == pmSpouseId) {
        if (childNodeType == LinkType.SpouseParents ||
            childNodeType == LinkType.SpouseSiblings) return true;
      }
    }

    if (type === LinkType.IndiParents)
      if (childNodeType === LinkType.IndiParents ||
          childNodeType === LinkType.IndiSiblings) return true;
    if (type === LinkType.IndiSiblings)
      if (childNodeType === LinkType.IndiSiblings ||
          childNodeType === LinkType.IndiParents) return true;
    if (type === LinkType.Children)
      if (!parentNode.primaryMarriage &&
          childNodeType === LinkType.Children) return true;
    return false;
  }
}


export class ChildNodes {
  static readonly EMPTY = deepFreeze(new ChildNodes());

  indiParents: TreeNode[] = [];
  indiSiblings: TreeNode[] = [];
  spouseParents: TreeNode[] = [];
  spouseSiblings: TreeNode[] = [];
  children: TreeNode[] = [];

  constructor(overrides: any = {}) {
    Object.assign(this, overrides);
  }

  get(type: LinkType): TreeNode[] {
    switch (type) {
      case LinkType.IndiParents: return this.indiParents;
      case LinkType.IndiSiblings: return this.indiSiblings;
      case LinkType.SpouseParents: return this.spouseParents;
      case LinkType.SpouseSiblings: return this.spouseSiblings;
      case LinkType.Children: return this.children;
    }
  }

  getAll(): TreeNode[] {
    return [].concat(
      this.indiSiblings,
      this.indiParents,
      this.children,
      this.spouseParents,
      this.spouseSiblings
    );
  }
}


export interface TreeNode extends BaseTreeNode {
  parentNode: TreeNode;
  childNodes: ChildNodes;

  /** List of link types for which link stub should be rendered **/
  linkStubs: LinkType[];

  /** Type of link from parent node to this node, from the perspective of a parent node **/
  linkFromParentType?: LinkType;

  /** Primary marriage fam node, for fam nodes that are additional marriages **/
  primaryMarriage?: TreeNode;

  /** Node, that this node is duplicate of **/
  duplicateOf?: TreeNode;

  /** Y coordinate for different types of outgoing links **/
  linkYs?: {indi: number, spouse: number, children: number};
}


export enum LinkType { IndiParents, IndiSiblings, SpouseParents, SpouseSiblings, Children }

export function otherSideLinkType(type: LinkType): LinkType {
  switch (type) {
    case LinkType.IndiParents:    return LinkType.Children;
    case LinkType.IndiSiblings:   return LinkType.IndiSiblings;
    case LinkType.SpouseParents:  return LinkType.Children;
    case LinkType.SpouseSiblings: return LinkType.IndiSiblings;
    case LinkType.Children:       return LinkType.IndiParents;
  }
}

interface LinkStubRenderInfo {
  treeDir: Direction;
  linkType: LinkType;
  points: Vec2[];
}