import * as d3 from 'd3';
import { DataProvider, Indi, Fam } from '../api';
import { ChildNodes, TreeNode, LinkType, otherSideLinkType } from './api';
import { HierarchyFilter } from './hierarchy-filter';
import { IdGenerator } from '../id-generator';
import { nonEmpty } from '../utils';


export class HierarchyCreator {
  static readonly UP_FILTER   = HierarchyFilter.allRejecting().modify({indiParents: true, spouseParents: true, indiSiblings: true, spouseSiblings: true});
  static readonly DOWN_FILTER = HierarchyFilter.allRejecting().modify({children: true});
  static readonly ALL_ACCEPTING_FILTER = HierarchyFilter.allAccepting();

  static createHierarchy(data: DataProvider<Indi, Fam>, startEntryId: EntryId): Hierarchy {
    return new HierarchyCreator(data, startEntryId).createHierarchy();
  }

  readonly startEntryId: EntryId;  // Id of entry (indi or fam), which is root of the hierarchy
  readonly startFamIndi: string;  // If startEntryId field is a fam id, then startFamIndi field can indicate which spouse in this family is the starting point of the hierarchy
  readonly queuedNodesById = new Map<string, TreeNode>();
  readonly idGenerator = new IdGenerator();

  private constructor(readonly data: DataProvider<Indi, Fam>, startEntryId: EntryId) {
    [this.startEntryId, this.startFamIndi] = this.expandStartId(startEntryId);
  }

  // Convert entry id to values of startEntryId and startFamIndi fields
  private expandStartId(startEntryId: EntryId): [EntryId, string] {
    if (!startEntryId) return [null, null];
    if (startEntryId.isFam) return [startEntryId, null];
    const indi = this.data.getIndi(startEntryId.id);
    if (!indi) return [null, null];
    const famsIds = indi.getFamiliesAsSpouse();
    if (famsIds.length) return [EntryId.fam(famsIds[0]), startEntryId.id];
    return [startEntryId, null];
  }

  createHierarchy(): Hierarchy {
    const upRoot   = this.idToNode(this.startEntryId, null, null, false);
    const downRoot = this.idToNode(this.startEntryId, null, null, false);
    if (this.startFamIndi) {
      upRoot.indi   = {id: this.startFamIndi};
      downRoot.indi = {id: this.startFamIndi};
    }
    const layerEnd = {id: "LAYER END MARKER"} as TreeNode;
    let queue      = [ upRoot, layerEnd ];
    let otherQueue = [ downRoot ];

    while (queue.length) {
      const node = queue.shift();
      if (node !== layerEnd) {
        const filter =
          node === upRoot   ? HierarchyCreator.UP_FILTER :
          node === downRoot ? HierarchyCreator.DOWN_FILTER :
          HierarchyCreator.ALL_ACCEPTING_FILTER;  //TODO: Filter only on root node?
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
    return {
      upRoot: d3.hierarchy(upRoot, getChildNodes),
      downRoot: d3.hierarchy(downRoot, getChildNodes),
    };
  }

  private fillNodeData(node: TreeNode, filter: HierarchyFilter) {
    if (this.isFamNode(node)) {
      const fam  = this.data.getFam(node.id);
      const [indiId, spouseId] = (node.indi && node.indi.id === fam.getMother()) ?
        [fam.getMother(), fam.getFather()] :
        [fam.getFather(), fam.getMother()];
      Object.assign(node, {
        id: this.idGenerator.getId(node.id),
        indi:   indiId   && {id: indiId},
        spouse: spouseId && {id: spouseId},
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
    const indi   = parentNode.indi   && this.data.getIndi(parentNode.indi.id);
    const spouse = parentNode.spouse && this.data.getIndi(parentNode.spouse.id);
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
    const famc = this.data.getFam(indi && indi.getFamilyAsChild());
    if (!famc) return [false, false];
    return [
      !!(famc.getFather() || famc.getMother()),
      famc.getChildren().length > 1,
    ];
  }

  private getParentsAndSiblings(indi: Indi): [string[], string[]] {
    const indiFamcId = indi && indi.getFamilyAsChild();
    const indiFamc = this.data.getFam(indiFamcId);
    if (!indiFamc) return [[], []];

    const father = this.data.getIndi(indiFamc.getFather());
    const mother = this.data.getIndi(indiFamc.getMother());
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
    return indiIds.flatMap(id => this.indiIdToFamAsSpouseNodes(id, parentNode, childNodeType));
  }

  private indiIdToFamAsSpouseNodes(indiId: string, parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
    if (this.isChildNodeTypeForbidden(childNodeType, parentNode)) return [];
    const famsIds = this.data.getIndi(indiId).getFamiliesAsSpouse();
    if (!famsIds.length) {
      const node = this.idToNode(EntryId.indi(indiId), parentNode, childNodeType);
      return node ? [node] : [];
    }

    const famsNodes: TreeNode[] = famsIds.map(id => {
      return {
        id,
        indi: {id: indiId},
        family: {id},
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

  private famAsSpouseIdsToNodes(famsIds: string[], parentNode: TreeNode, childNodeType: LinkType): TreeNode[] {
    const nodes = this.idsToNodes(famsIds.map(EntryId.fam), parentNode, childNodeType);
    nodes.slice(1).forEach(node => node.primaryMarriage = nodes[0]);
    return nodes;
  }

  private idsToNodes(entryIds: EntryId[], parentNode: TreeNode, childNodeType: LinkType, duplicateCheck = true): TreeNode[] {
    return entryIds.map(entryId => this.idToNode(entryId, parentNode, childNodeType, duplicateCheck))
      .filter(node => node != null);
  }

  private idToNode(entryId: EntryId, parentNode: TreeNode, childNodeType: LinkType, duplicateCheck = true): TreeNode {
    if (this.isChildNodeTypeForbidden(childNodeType, parentNode)) return null;
    const { id, isFam } = entryId;
    if (isFam) {
      const fam = this.data.getFam(id);
      if (!fam || (!fam.getFather() && !fam.getMother())) return null;  // Don't create fam nodes that are missing both husband and wife
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
    if (isFam) node.family = {id};
    if (duplicateOf && duplicateCheck) duplicateOf.duplicated = true;
    if (!duplicateOf) this.queuedNodesById.set(id, node);
    return node;
  }

  private createLinkStubs(node: TreeNode): LinkType[] {
    if (!this.isFamNode(node) || (!node.duplicateOf && !node.duplicated && !node.primaryMarriage)) return [];
    const fam = this.data.getFam(node.family.id);
    const [indiParentsPresent, indiSiblingsPresent] = this.areParentsAndSiblingsPresent(node.indi && node.indi.id);
    const [spouseParentsPresent, spouseSiblingsPresent] = this.areParentsAndSiblingsPresent(node.spouse && node.spouse.id);
    const childrenPresent = nonEmpty(fam.getChildren());

    return [
      indiParentsPresent ? [LinkType.IndiParents] : [],
      indiSiblingsPresent ? [LinkType.IndiSiblings] : [],
      spouseParentsPresent ? [LinkType.SpouseParents] : [],
      spouseSiblingsPresent ? [LinkType.SpouseSiblings] : [],
      childrenPresent ? [LinkType.Children] : [],
    ].flat().filter(linkType =>
      !this.isChildNodeTypeForbidden(linkType, node) &&
      !node.childNodes.get(linkType).length
    );
  }

  private isChildNodeTypeForbidden(childNodeType: LinkType, parentNode: TreeNode): boolean {
    if (childNodeType === null || !parentNode) return false;

    switch (otherSideLinkType(parentNode.linkFromParentType)) {
      case LinkType.IndiParents:
      case LinkType.IndiSiblings:
        if (childNodeType === LinkType.IndiParents ||
            childNodeType === LinkType.IndiSiblings) return true;
        break;
      case LinkType.Children:
        if (!parentNode.primaryMarriage &&
            childNodeType === LinkType.Children) return true;
        break;
    }

    if (parentNode.primaryMarriage) {
      // Forbid indi/spouse from parentNode that is also indi/spouse in primaryMarriage from having parents and siblings, as they are already added to primaryMarriage node. This prevents drawing parents/siblings of a person for each marriage of this person.
      const indiId = parentNode.indi.id;
      const spouseId = parentNode.spouse.id;

      const pmIndiId = parentNode.primaryMarriage.indi.id;
      const pmSpouseId = parentNode.primaryMarriage.spouse.id;

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

  private isFamNode(node: TreeNode): boolean {
    return !!node.family;
  }
}


export interface Hierarchy {
  upRoot: d3.HierarchyNode<TreeNode>;
  downRoot: d3.HierarchyNode<TreeNode>;
}


/* Id of indi or fam */
export class EntryId {
  id: string;
  isFam: boolean;

  static indi(id: string): EntryId {
    return new EntryId(id, null);
  }

  static fam(id: string): EntryId {
    return new EntryId(null, id);
  }

  constructor(indiId: string, famId: string) {
    this.id = indiId || famId;
    this.isFam = !!famId;
  }
}


export function getRootsCount(upRoot: d3.HierarchyNode<TreeNode>, data: DataProvider<Indi, Fam>): number {
  const upIndi = upRoot.data.indi && data.getIndi(upRoot.data.indi.id);
  const upSpouse = upRoot.data.spouse && data.getIndi(upRoot.data.spouse.id);
  return (upIndi ? upIndi.getFamiliesAsSpouse().length : 0) +
         (upSpouse ? upSpouse.getFamiliesAsSpouse().length - 1 : 0);
}