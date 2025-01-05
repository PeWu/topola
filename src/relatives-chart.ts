import { getAncestorsTree } from './ancestor-chart';
import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy';
import { IdGenerator } from './id-generator';
import { layOutDescendants } from './descendant-chart';
import { max, min } from 'd3-array';
import {
  Chart,
  ChartInfo,
  ChartOptions,
  DataProvider,
  Fam,
  Indi,
  TreeNode,
} from './api';
import {
  ChartUtil,
  getChartInfo,
  getChartInfoWithoutMargin,
  H_SPACING,
  V_SPACING,
} from './chart-util';

/** A view of a family that hides one child individual. */
class FilterChildFam implements Fam {
  constructor(
    private fam: Fam,
    private childId: string,
  ) {}
  getId(): string {
    return this.fam.getId();
  }
  getFather(): string | null {
    return this.fam.getFather();
  }
  getMother(): string | null {
    return this.fam.getMother();
  }
  getChildren(): string[] {
    const children = [...this.fam.getChildren()];
    const index = children.indexOf(this.childId);
    if (index !== -1) {
      children.splice(index, 1);
    }
    return children;
  }
}

/** Data provider proxy that filters out a specific child individual. */
class FilterChildData implements DataProvider<Indi, Fam> {
  constructor(
    private data: DataProvider<Indi, Fam>,
    private childId: string,
  ) {}
  getIndi(id: string): Indi | null {
    return this.data.getIndi(id);
  }
  getFam(id: string): Fam | null {
    return new FilterChildFam(this.data.getFam(id)!, this.childId);
  }
}

/** Information about the subtree of descendants of an ancestor. */
interface AncestorData {
  // Descendants.
  descendantNodes: Array<HierarchyPointNode<TreeNode>>;
  // Dimensions of the subtree bounding box.
  width: number;
  height: number;
  // Position of the ancestors relative to the top-left corner of the subtree
  // bounding box.
  x: number;
  y: number;
  // Whether the chart is expanded leftwards. Rightwards otherwise.
  left?: boolean;
  // Set to true when the ancstor should be drawn horizontally in the middle
  // of the chart.
  middle?: boolean;
}

/** Chart layout showing all relatives of a person. */
export class RelativesChart<IndiT extends Indi, FamT extends Fam>
  implements Chart
{
  readonly util: ChartUtil;
  readonly options: ChartOptions;

  constructor(inputOptions: ChartOptions) {
    this.options = { ...inputOptions };
    this.options.idGenerator = this.options.idGenerator || new IdGenerator();
    this.util = new ChartUtil(this.options);
  }

  layOutAncestorDescendants(
    ancestorsRoot: HierarchyNode<TreeNode>,
    focusedNode: HierarchyPointNode<TreeNode>,
  ) {
    const ancestorData = new Map<string, AncestorData>();

    ancestorsRoot.eachAfter((node) => {
      if (!node.parent) {
        return;
      }
      const descendantOptions = { ...this.options };
      descendantOptions.startFam = node.data.family!.id;
      descendantOptions.startIndi = undefined;
      const child =
        node.id === node.parent.data.spouseParentNodeId
          ? node.parent.data.spouse!.id
          : node.parent.data.indi!.id;
      descendantOptions.data = new FilterChildData(
        descendantOptions.data,
        child,
      );
      descendantOptions.baseGeneration =
        (this.options.baseGeneration || 0) - node.depth;

      const descendantNodes = layOutDescendants(descendantOptions);
      // The id could be modified because of duplicates. This can happen when
      // drawing one family in multiple places of the chart).
      node.data.id = descendantNodes[0].id!;
      if (node.data.indi?.expander !== undefined) {
        descendantNodes[0].data.indi!.expander = node.data.indi.expander;
      }
      if (node.data.spouse?.expander !== undefined) {
        descendantNodes[0].data.spouse!.expander = node.data.spouse.expander;
      }

      const chartInfo = getChartInfoWithoutMargin(descendantNodes);
      const parentData = (node.children || []).map((childNode) =>
        ancestorData.get(childNode.data.id),
      );
      const parentHeight = parentData
        .map((data) => data!.height)
        .reduce((a, b) => a + b + V_SPACING, 0);

      const data: AncestorData = {
        descendantNodes,
        width: chartInfo.size[0],
        height: chartInfo.size[1] + parentHeight,
        x: chartInfo.origin[0],
        y: chartInfo.origin[1] + parentHeight,
      };
      ancestorData.set(node.data.id, data);
    });

    ancestorsRoot.each((node) => {
      if (!node.parent) {
        return;
      }
      const data = ancestorData.get(node.data.id);
      const parentData = ancestorData.get(node.parent.data.id);

      data!.left =
        parentData && !parentData.middle
          ? parentData.left
          : node.parent.data.indiParentNodeId === node.id;
      data!.middle =
        (!parentData || parentData.middle) &&
        node.parent.children!.length === 1;
    });

    ancestorsRoot.each((node) => {
      const data = ancestorData.get(node.data.id);
      const thisNode = data ? data.descendantNodes[0] : focusedNode;
      (node.children || []).forEach((child) => {
        const childNode = ancestorData.get(child.data.id)!.descendantNodes[0];
        childNode.parent = thisNode;
      });

      if (node.data.indiParentNodeId && node.children) {
        thisNode.data.indiParentNodeId = node.children!.find(
          (childNode) => childNode.id === node.data.indiParentNodeId,
        )!.data.id;
      }
      if (node.data.spouseParentNodeId && node.children) {
        thisNode.data.spouseParentNodeId = node.children!.find(
          (childNode) => childNode.id === node.data.spouseParentNodeId,
        )!.data.id;
      }
    });

    ancestorsRoot.each((node) => {
      const nodeData = ancestorData.get(node.data.id);
      // Lay out the nodes produced by laying out descendants of ancestors
      // instead of the ancestor nodes from ancestorsRoot.
      const thisNode = nodeData ? nodeData.descendantNodes[0] : focusedNode;
      const indiParent =
        node.children &&
        node.children.find((child) => child.id === node.data.indiParentNodeId);
      const spouseParent =
        node.children &&
        node.children.find(
          (child) => child.id === node.data.spouseParentNodeId,
        );
      const nodeX = thisNode.x;
      const nodeY = thisNode.y;
      const nodeWidth = thisNode.data.width!;
      const nodeHeight = thisNode.data.height!;
      const indiWidth = thisNode.data.indi ? thisNode.data.indi.width! : 0;
      const spouseWidth = thisNode.data.spouse
        ? thisNode.data.spouse.width!
        : 0;

      // Lay out the individual's ancestors and their descendants.
      if (indiParent) {
        const data = ancestorData.get(indiParent.data.id)!;
        const parentNode = data.descendantNodes[0];
        const parentData = parentNode.data;
        const spouseTreeHeight = spouseParent
          ? ancestorData.get(spouseParent.data.id)!.height + V_SPACING
          : 0;

        const dx =
          nodeX +
          data.x -
          nodeWidth / 2 +
          indiWidth / 2 +
          (data.left ? -data.width - H_SPACING : H_SPACING);
        const dy =
          nodeY +
          data.y -
          nodeHeight / 2 -
          data.height +
          (data.left ? -V_SPACING : -spouseTreeHeight - V_SPACING);

        // Move all nodes by (dx, dy). The ancestor node,
        // ie. data.descendantNodes[0] is now at (0, 0).
        data.descendantNodes.forEach((node) => {
          node.x += dx;
          node.y += dy;
        });

        // Set the ancestor's horizontal position independently.
        const middleX =
          indiWidth / 2 -
          nodeWidth / 2 +
          parentData.width! / 2 -
          (parentData.indi
            ? parentData.indi.width!
            : parentData.spouse!.width!);
        if (data.middle) {
          parentNode.x = 0;
        } else if (!nodeData || nodeData.middle) {
          parentNode.x =
            -nodeWidth / 2 - parentData.width! / 2 + indiWidth - H_SPACING / 2;
        } else if (data.left) {
          parentNode.x =
            nodeX +
            min([
              nodeWidth / 2 -
                parentData.width! / 2 -
                spouseWidth / 2 -
                H_SPACING,
              middleX,
            ])!;
        } else {
          parentNode.x =
            nodeX + max([parentData.width! / 2 - nodeWidth / 2, middleX])!;
        }
      }

      // Lay out the spouse's ancestors and their descendants.
      if (spouseParent) {
        const data = ancestorData.get(spouseParent.data.id)!;
        const parentNode = data.descendantNodes[0];
        const parentData = parentNode.data;
        const indiTreeHeight = indiParent
          ? ancestorData.get(indiParent.data.id)!.height + V_SPACING
          : 0;

        const dx =
          nodeX +
          data.x +
          nodeWidth / 2 -
          spouseWidth / 2 +
          (data.left ? -data.width - H_SPACING : H_SPACING);
        const dy =
          nodeY +
          data.y -
          nodeHeight / 2 -
          data.height +
          (data.left ? -indiTreeHeight - V_SPACING : -V_SPACING);

        // Move all nodes by (dx, dy). The ancestor node,
        // ie. data.descendantNodes[0] is now at (0, 0).
        data.descendantNodes.forEach((node) => {
          node.x += dx;
          node.y += dy;
        });

        // Set the ancestor's horizontal position independently.
        const middleX =
          nodeWidth / 2 -
          spouseWidth / 2 +
          parentData.width! / 2 -
          (parentData.indi
            ? parentData.indi.width!
            : parentData.spouse!.width!);
        if (data.middle) {
          parentNode.x = 0;
        } else if (!nodeData || nodeData.middle) {
          parentNode.x =
            nodeWidth / 2 + parentData.width! / 2 - spouseWidth + H_SPACING / 2;
        } else if (data.left) {
          parentNode.x =
            nodeX + min([nodeWidth / 2 - parentData.width! / 2, middleX])!;
        } else {
          parentNode.x =
            nodeX +
            max([
              parentData.width! / 2 - nodeWidth / 2 + indiWidth / 2 + H_SPACING,
              middleX,
            ])!;
        }
      }
    });
    return Array.from(ancestorData.values())
      .map((data) => data.descendantNodes)
      .reduce((a, b) => a.concat(b), []);
  }

  render(): ChartInfo {
    const descendantNodes = layOutDescendants(this.options);
    // Don't use common id generator because these nodes will not be drawn.
    const ancestorOptions = Object.assign({}, this.options, {
      idGenerator: undefined,
    });
    const ancestorsRoot = getAncestorsTree(ancestorOptions);

    // The ancestor root node and first descendant node is the start node.
    if (ancestorsRoot.data.indi?.expander !== undefined) {
      descendantNodes[0].data.indi!.expander =
        ancestorsRoot.data.indi?.expander;
    }
    if (ancestorsRoot.data.spouse?.expander !== undefined) {
      descendantNodes[0].data.spouse!.expander =
        ancestorsRoot.data.spouse?.expander;
    }

    const ancestorDescentants = this.layOutAncestorDescendants(
      ancestorsRoot,
      descendantNodes[0],
    );

    const nodes = descendantNodes.concat(ancestorDescentants);
    const animationPromise = this.util.renderChart(nodes);

    const info = getChartInfo(nodes);
    this.util.updateSvgDimensions(info);
    return Object.assign(info, { animationPromise });
  }
}
