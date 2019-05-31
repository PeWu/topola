import { TreeNode as BaseTreeNode } from '../api';
import { deepFreeze } from '../utils';


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
  /** If true, then there exist one or more nodes, that are duplicates of this node **/
  duplicated?: boolean;

  /** Y coordinates for different types of outgoing links **/
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