import * as d3 from 'd3';
import { DataProvider, Indi, Fam } from '../api';
import { ChildNodes, TreeNode, LinkType, otherSideLinkType } from './api';
import { IdGenerator } from '../id-generator';
import { nonEmpty, flatten } from '../utils';


const FAM_ID_CHAR = "F";


export class HierarchyFilter {
  indiParents = true;
  indiSiblings = true;
  spouseParents = true;
  spouseSiblings = true;
  children = true;

  static allAccepting(): HierarchyFilter {
    return new HierarchyFilter();
  }

  static allRejecting(): HierarchyFilter {
    return new HierarchyFilter().modify({
      indiParents: false,
      indiSiblings: false,
      spouseParents: false,
      spouseSiblings: false,
      children: false,
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

  readonly startId: string;
  readonly startFamIndi: string;
  readonly queuedNodesById = new Map<string, TreeNode>();
  readonly idGenerator = new IdGenerator();
  private upRoot: d3.HierarchyNode<TreeNode> = undefined;
  private downRoot: d3.HierarchyNode<TreeNode> = undefined;

  constructor(readonly data: DataProvider<Indi, Fam>, startId: string) {
    [this.startId, this.startFamIndi] = this.expandStartId(startId);
  }

  private expandStartId(startId: string): [string, string] {
    if (!startId) return [null, null];
    if (startId[0] === FAM_ID_CHAR) return [startId, null];
    const indi = this.data.getIndi(startId);
    if (!indi) return [null, null];
    const famsIds = indi.getFamiliesAsSpouse();
    if (famsIds.length) return [famsIds[0], startId];
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
           (upSpouse ? upSpouse.getFamiliesAsSpouse().length - 1 : 0);
  }

  private createHierarchy() {
    const upRoot   = this.idToNode(this.startId, null, null, false);
    const downRoot = this.idToNode(this.startId, null, null, false);
    if (this.startFamIndi) {
      upRoot.indi   = {id: this.startFamIndi};
      downRoot.indi = {id: this.startFamIndi};
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
        for (const childNode of node.childNodes.getAll()) {
          queue.push(childNode);
        }
      } else {
        [queue, otherQueue] = otherQueue.length ? [otherQueue, queue] : [queue, otherQueue];
        if (queue.length) queue.push(layerEnd);
      }
    }

    const getChildNodes = (node: TreeNode) => {
      const childNodes = node.childNodes.getAll();
      return childNodes.length ? childNodes : null;
    };
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
      node.childNodes = node.duplicateOf || node.duplicated ? ChildNodes.EMPTY : this.childNodesForFam(fam, node, filter);
    } else {
      const indi = this.data.getIndi(node.id);
      Object.assign(node, {
        id: this.idGenerator.getId(node.id),
        indi: {id: indi.getId()},
      });
      node.childNodes = node.duplicateOf || node.duplicated ? ChildNodes.EMPTY : this.childNodesForIndi(indi, node, filter);
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
      indiParents:    filter.indiParents    ? this.famAsSpouseIdsToNodes(indiParentsFamsIds, parentNode, LinkType.IndiParents)       : [],
      indiSiblings:   filter.indiSiblings   ? this.indiIdsToFamAsSpouseNodes(indiSiblingsIds, parentNode, LinkType.IndiSiblings)     : [],
      spouseParents:  filter.spouseParents  ? this.famAsSpouseIdsToNodes(spouseParentsFamsIds, parentNode, LinkType.SpouseParents)   : [],
      spouseSiblings: filter.spouseSiblings ? this.indiIdsToFamAsSpouseNodes(spouseSiblingsIds, parentNode, LinkType.SpouseSiblings) : [],
      children:       filter.children       ? this.indiIdsToFamAsSpouseNodes(childrenIds, parentNode, LinkType.Children)             : [],
    });
  }

  private childNodesForIndi(indi: Indi, parentNode: TreeNode, filter: HierarchyFilter): ChildNodes {
    const [indiParentsFamsIds, indiSiblingsIds] = this.getParentsAndSiblings(indi);
    return new ChildNodes({
      indiParents:    filter.indiParents  ? this.famAsSpouseIdsToNodes(indiParentsFamsIds, parentNode, LinkType.IndiParents)   : [],
      indiSiblings:   filter.indiSiblings ? this.indiIdsToFamAsSpouseNodes(indiSiblingsIds, parentNode, LinkType.IndiSiblings) : [],
    });
  }

  private areParentsAndSiblingsPresent(indiId: string): [boolean, boolean] {
    const indi = this.data.getIndi(indiId);
    const famc = this.data.getFam(indi ? indi.getFamilyAsChild() : null);
    if (!famc) return [false, false];
    return [
      !!(famc.getFather() || famc.getMother()),
      famc.getChildren().length > 1,
    ];
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

    return [parentFamsIds, siblingsIds];
  }

  private indiIdsToFamAsSpouseNodes(indiIds: string[], parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
    return flatten(indiIds.map(id => this.indiIdToFamAsSpouseNodes(id, parentNode, childNodeType)));
  }

  private indiIdToFamAsSpouseNodes(indiId: string, parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
    if (this.isChildNodeTypeForbidden(childNodeType, parentNode)) return [];
    const famsIds = this.data.getIndi(indiId).getFamiliesAsSpouse();
    if (!famsIds.length) {
      const node = this.idToNode(indiId, parentNode, childNodeType);
      return node ? [node] : [];
    }

    const famsNodes: TreeNode[] = famsIds.map(id => {
      return {
        id,
        indi: {id: indiId},
        parentNode,
        linkFromParentType: childNodeType,
        childNodes: null,
        linkStubs: null,
        duplicateOf: this.queuedNodesById.get(id),
      };
    });
    famsNodes.forEach((node, i) => {
      if (i !== 0) node.primaryMarriage = famsNodes[0];
      if (node.duplicateOf) node.duplicateOf.duplicated = true;
      else this.queuedNodesById.set(node.id, node);
    });
    return famsNodes;
  }

  private famAsSpouseIdsToNodes(ids: string[], parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
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
      id,
      parentNode,
      linkFromParentType: childNodeType,
      childNodes: null,
      linkStubs: null,
      duplicateOf: duplicateCheck ? duplicateOf : null,
    };
    if (duplicateOf && duplicateCheck) duplicateOf.duplicated = true;
    if (!duplicateOf) this.queuedNodesById.set(id, node);
    return node;
  }

  private createLinkStubs(node: TreeNode): LinkType[] {
    if (!node.duplicateOf && !node.duplicated && !node.primaryMarriage) return [];
    const linkTypes = [LinkType.IndiParents, LinkType.IndiSiblings, LinkType.SpouseParents, LinkType.SpouseSiblings, LinkType.Children];
    let arePresent = new Array(linkTypes.length).fill(false);

    if (node.id[0] === FAM_ID_CHAR) {
      const fam = this.data.getFam(node.family.id);
      if (fam) {
        arePresent = [
          ...this.areParentsAndSiblingsPresent(node.indi ? node.indi.id : null),
          ...this.areParentsAndSiblingsPresent(node.spouse ? node.spouse.id : null),
          nonEmpty(fam.getChildren()),
        ];
      }
    } else {
      arePresent.splice(0, 2, ...this.areParentsAndSiblingsPresent(node.indi.id));
    }

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

    switch (otherSideLinkType(parentNode.linkFromParentType)) {
      case LinkType.IndiParents:
        if (childNodeType === LinkType.IndiParents ||
            childNodeType === LinkType.IndiSiblings) return true;
        break;
      case LinkType.IndiSiblings:
        if (childNodeType === LinkType.IndiSiblings ||
            childNodeType === LinkType.IndiParents) return true;
        break;
      case LinkType.Children:
        if (!parentNode.primaryMarriage &&
            childNodeType === LinkType.Children) return true;
        break;
    }

    if (parentNode.primaryMarriage) {
      // Forbid indi/spouse from parentNode that is also indi/spouse in primaryMarriage from having parents and siblings, as they are already added to primaryMarriage node. This prevents drawing parents/siblings of a person for each marriage of this person.
      const [indiId, spouseId] = [parentNode.indi.id, parentNode.spouse.id];
      const [pmIndiId, pmSpouseId] = [parentNode.primaryMarriage.indi.id, parentNode.primaryMarriage.spouse.id];
      if (indiId === pmIndiId || indiId === pmSpouseId) {
        if (childNodeType === LinkType.IndiParents ||
            childNodeType === LinkType.IndiSiblings) return true;
      } else if (spouseId === pmIndiId || spouseId === pmSpouseId) {
        if (childNodeType === LinkType.SpouseParents ||
            childNodeType === LinkType.SpouseSiblings) return true;
      }
    }
    return false;
  }
}