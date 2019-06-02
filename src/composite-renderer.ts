import * as d3 from 'd3';
import { TreeEntry, TreeNode } from './api';

/**
 * Common code for tree nodes that are composed of individual and family boxes.
 */
export abstract class CompositeRenderer {
  constructor(readonly options: { horizontal?: boolean }) {}

  abstract getPreferredIndiSize(id: string): [number, number];

  getPreferredFamSize(id: string): [number, number] {
    // No family box in the simple renderer.
    return [0, 0];
  }

  private setPreferredIndiSize(indi: TreeEntry | undefined): void {
    if (!indi) {
      return;
    }
    [indi.width, indi.height] = this.getPreferredIndiSize(indi.id);
  }

  updateNodes(nodes: Array<d3.HierarchyNode<TreeNode>>) {
    // Calculate individual vertical size per depth.
    const indiVSizePerDepth = new Map<number, number>();
    nodes.forEach(node => {
      this.setPreferredIndiSize(node.data.indi);
      this.setPreferredIndiSize(node.data.spouse);
      const family = node.data.family;
      if (family) {
        [family.width, family.height] = this.getPreferredFamSize(family.id);
      }

      const depth = node.depth;
      const maxIndiVSize = d3.max([
        getIndiVSize(node.data, this.options.horizontal),
        indiVSizePerDepth.get(depth),
      ]);
      indiVSizePerDepth.set(depth, maxIndiVSize);
    });

    // Set same width for each depth.
    nodes.forEach(node => {
      if (this.options.horizontal) {
        if (node.data.indi) {
          node.data.indi.width = indiVSizePerDepth.get(node.depth);
        }
        if (node.data.spouse) {
          node.data.spouse.width = indiVSizePerDepth.get(node.depth);
        }
      } else {
        if (node.data.indi) {
          node.data.indi.height = indiVSizePerDepth.get(node.depth);
        }
        if (node.data.spouse) {
          node.data.spouse.height = indiVSizePerDepth.get(node.depth);
        }
      }
      const vSize = getVSize(node.data, this.options.horizontal);
      const hSize = getHSize(node.data, this.options.horizontal);
      [node.data.width, node.data.height] = this.options.horizontal
        ? [vSize, hSize]
        : [hSize, vSize];
    });
  }

  getFamilyAnchor(node: TreeNode): [number, number] {
    if (this.options.horizontal) {
      const x =
        -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
      const famYOffset = node.family
        ? d3.max([-getFamPositionHorizontal(node), 0])
        : 0;
      const y =
        -(node.indi && node.spouse ? node.height / 2 - node.indi.height : 0) +
        famYOffset;
      return [x, y];
    }
    const famXOffset = node.family
      ? d3.max([-getFamPositionVertical(node), 0])
      : 0;
    const x =
      -(node.indi && node.spouse ? node.width / 2 - node.indi.width : 0) +
      famXOffset;
    const y =
      -node.height / 2 + getIndiVSize(node, this.options.horizontal) / 2;
    return [x, y];
  }

  getSpouseAnchor(node: TreeNode): [number, number] {
    if (this.options.horizontal) {
      const x =
        -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
      const y = node.indi ? node.indi.height / 2 : 0;
      return [x, y];
    }
    const x = node.indi ? node.indi.width / 2 : 0;
    const y =
      -node.height / 2 + getIndiVSize(node, this.options.horizontal) / 2;
    return [x, y];
  }

  getIndiAnchor(node: TreeNode): [number, number] {
    if (this.options.horizontal) {
      const x =
        -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
      const y = node.spouse ? -node.spouse.height / 2 : 0;
      return [x, y];
    }
    const x = node.spouse ? -node.spouse.width / 2 : 0;
    const y =
      -node.height / 2 + getIndiVSize(node, this.options.horizontal) / 2;
    return [x, y];
  }
}

/**
 * Returns the relative position of the family box for the vertical layout.
 */
export function getFamPositionVertical(node: TreeNode): number {
  const indiWidth = node.indi ? node.indi.width : 0;
  const spouseWidth = node.spouse ? node.spouse.width : 0;
  const familyWidth = node.family.width;
  if (!node.indi || !node.spouse || indiWidth + spouseWidth <= familyWidth) {
    return (indiWidth + spouseWidth - familyWidth) / 2;
  }
  if (familyWidth / 2 >= spouseWidth) {
    return indiWidth + spouseWidth - familyWidth;
  }
  if (familyWidth / 2 >= indiWidth) {
    return 0;
  }
  return indiWidth - familyWidth / 2;
}

/**
 * Returns the relative position of the family box for the horizontal layout.
 */
export function getFamPositionHorizontal(node: TreeNode): number {
  const indiHeight = node.indi ? node.indi.height : 0;
  const spouseHeight = node.spouse ? node.spouse.height : 0;
  const familyHeight = node.family.height;
  if (!node.indi || !node.spouse) {
    return (indiHeight + spouseHeight - familyHeight) / 2;
  }
  return indiHeight - familyHeight / 2;
}

/** Returns the horizontal size. */
function getHSize(node: TreeNode, horizontal: boolean): number {
  if (horizontal) {
    return (
      (node.indi ? node.indi.height : 0) +
      (node.spouse ? node.spouse.height : 0)
    );
  }
  const indiHSize =
    (node.indi ? node.indi.width : 0) + (node.spouse ? node.spouse.width : 0);
  return d3.max([indiHSize, node.family && node.family.width]);
}

function getFamVSize(node: TreeNode, horizontal: boolean): number {
  if (horizontal) {
    return node.family ? node.family.width : 0;
  }
  return node.family ? node.family.height : 0;
}

/** Returns the vertical size of individual boxes. */
function getIndiVSize(node: TreeNode, horizontal: boolean): number {
  if (horizontal) {
    return d3.max([
      node.indi && node.indi.width,
      node.spouse && node.spouse.width,
      0,
    ]);
  }
  return d3.max([
    node.indi && node.indi.height,
    node.spouse && node.spouse.height,
    0,
  ]);
}

/** Returns the vertical size. */
function getVSize(node: TreeNode, horizontal: boolean): number {
  return getIndiVSize(node, horizontal) + getFamVSize(node, horizontal);
}
