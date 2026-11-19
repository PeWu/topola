import { select } from 'd3-selection';
import 'd3-transition';
import { getAlongSign, isHorizontalDirection } from './axes.js';
import {
  ANIMATION_FADE_MS as HIDE_TIME_MS,
  ANIMATION_MOVE_MS as MOVE_TIME_MS,
  SLOTS,
} from './types.js';
import type {
  Direction,
  ExpanderClickInfo,
  ExpanderKey,
  ExpanderLabelInfo,
  ExpanderState,
  LayoutNode,
  Point,
  Slot,
} from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const EXPANDER_SIZE = 12;

type ExpanderClickHandler = (info: ExpanderClickInfo) => void;

/**
 * The click handler of the expanders of every container and whether they
 * take key presses, as of the last rendering. An expander gets its listeners
 * once and looks these up.
 */
const containerStates = new WeakMap<
  Element,
  { onClick: ExpanderClickHandler | undefined; keyboard: boolean }
>();

/** Whether the key press is one that presses a button: Enter or Space. */
export function isActivationKey(event: KeyboardEvent): boolean {
  return (
    !event.defaultPrevented &&
    !event.repeat &&
    (event.key === 'Enter' || event.key === ' ')
  );
}

/**
 * Sends the element the click that a key press stands for, with the
 * modifier keys of the press, so that click callbacks get a `MouseEvent`.
 */
export function clickFromKeyboard(
  element: Element,
  event: KeyboardEvent,
): void {
  const Click = element.ownerDocument.defaultView?.MouseEvent ?? MouseEvent;
  element.dispatchEvent(
    new Click('click', {
      bubbles: true,
      cancelable: true,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    }),
  );
}

export interface ExpanderDescriptor {
  key: ExpanderKey;
  nodeId: string;
  slot: Slot;
  state: ExpanderState;
  node: LayoutNode;
  x: number;
  y: number;
}

/**
 * Returns the top left corner of the expander of a slot. The expander touches
 * the anchor (`expanderAnchor`, relative to `nodeOrigin`) with the middle of
 * one side and points away from the node: towards the descendants for
 * `children`, towards the ancestors for the parent slots.
 */
export function computeExpanderPosition(
  nodeOrigin: Point,
  expanderAnchor: Point,
  slot: Slot,
  direction: Direction,
): Point {
  const ax = nodeOrigin.x + expanderAnchor.x;
  const ay = nodeOrigin.y + expanderAnchor.y;
  const alongSign = getAlongSign(direction);
  const outwardSign = slot === 'children' ? alongSign : -alongSign;

  if (isHorizontalDirection(direction)) {
    const x = outwardSign === 1 ? ax : ax - EXPANDER_SIZE;
    const y = ay - EXPANDER_SIZE / 2;
    return { x, y };
  }

  const x = ax - EXPANDER_SIZE / 2;
  const y = outwardSign === 1 ? ay : ay - EXPANDER_SIZE;
  return { x, y };
}

/**
 * Lists the expanders of the nodes: for every slot that has one, its state and
 * the position of its top left corner.
 */
export function collectExpanders(
  nodes: readonly LayoutNode[],
  direction: Direction,
): ExpanderDescriptor[] {
  const list: ExpanderDescriptor[] = [];
  for (const node of nodes) {
    for (const slot of SLOTS) {
      const state = node.expanders[slot];
      if (!state) continue;
      const pos = computeExpanderPosition(
        { x: node.x, y: node.y },
        node.expanderAnchors[slot],
        slot,
        direction,
      );
      list.push({
        key: `${node.id}:${slot}`,
        nodeId: node.id,
        slot,
        state,
        node,
        x: pos.x,
        y: pos.y,
      });
    }
  }
  return list;
}

/**
 * Draws the expanders of the nodes into the container and keeps those that are
 * there from the call before. Without `enabled` it removes them all.
 *
 * Returns a promise for the end of the animation, or nothing if nothing is
 * animated.
 */
export function renderExpanders(options: {
  container: SVGGElement;
  nodes: readonly LayoutNode[];
  direction: Direction;
  enabled: boolean;
  animate: boolean;
  onExpanderClick?: ((info: ExpanderClickInfo) => void) | undefined;
  /**
   * Makes the expanders tab stops with the role of a button that Enter and
   * Space press, see `ChartConfig.keyboard`. Default: no.
   */
  keyboard?: boolean | undefined;
  /** The accessible name of an expander, see `ChartConfig.expanderLabel`. */
  label?: ((info: ExpanderLabelInfo) => string) | undefined;
}): Promise<void> | undefined {
  const { container, nodes, direction, enabled, animate, onExpanderClick } =
    options;
  const keyboard = Boolean(options.keyboard);
  const doc = container.ownerDocument;
  const rootSel = select(container);
  rootSel.selectAll('g.expander').interrupt();
  containerStates.set(container, { onClick: onExpanderClick, keyboard });

  if (!enabled) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    return undefined;
  }

  const descriptors = collectExpanders(nodes, direction);
  const bound = rootSel
    .selectAll<SVGGElement, ExpanderDescriptor>('g.expander')
    .data(descriptors, (d) => d.key);

  const exitSel = bound.exit();

  const enterSel = bound.enter().append('g').attr('class', 'expander');
  enterSel.on('click', function (event: MouseEvent, d: ExpanderDescriptor) {
    if (this.hasAttribute('data-exiting')) return;
    event.stopPropagation();
    containerStates.get(container)?.onClick?.({
      nodeId: d.nodeId,
      slot: d.slot,
      event,
    });
  });
  enterSel.on('keydown', function (event: KeyboardEvent) {
    if (this.hasAttribute('data-exiting')) return;
    if (containerStates.get(container)?.keyboard && isActivationKey(event)) {
      // Space would scroll the page.
      event.preventDefault();
      clickFromKeyboard(this, event);
    }
  });
  enterSel.each(function (d) {
    const g = this;
    g.setAttribute('data-expander-key', d.key);
    g.setAttribute('data-node-id', d.nodeId);
    g.setAttribute('data-slot', d.slot);
    g.setAttribute('transform', `translate(${d.x}, ${d.y})`);

    const rect = doc.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', String(EXPANDER_SIZE));
    rect.setAttribute('height', String(EXPANDER_SIZE));
    g.appendChild(rect);

    const hLine = doc.createElementNS(SVG_NS, 'line');
    hLine.setAttribute('class', 'expander-h');
    hLine.setAttribute('x1', '3');
    hLine.setAttribute('y1', '6');
    hLine.setAttribute('x2', '9');
    hLine.setAttribute('y2', '6');
    g.appendChild(hLine);

    const vLine = doc.createElementNS(SVG_NS, 'line');
    vLine.setAttribute('class', 'expander-v');
    vLine.setAttribute('x1', '6');
    vLine.setAttribute('y1', '3');
    vLine.setAttribute('x2', '6');
    vLine.setAttribute('y2', '9');
    g.appendChild(vLine);
  });

  const merged = enterSel.merge(bound);

  // Update state on both entered and surviving expanders
  merged.each(function (d) {
    const g = this;
    if (g.hasAttribute('data-exiting')) {
      g.removeAttribute('data-exiting');
      g.style.removeProperty('pointer-events');
    }
    g.setAttribute('data-state', d.state);
    const vLine = g.querySelector<SVGLineElement>('line.expander-v');
    if (vLine) {
      vLine.style.display = d.state === 'plus' ? '' : 'none';
    }
    if (keyboard) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-expanded', String(d.state === 'minus'));
      g.setAttribute(
        'aria-label',
        options.label
          ? options.label({
              nodeId: d.nodeId,
              slot: d.slot,
              state: d.state,
              node: d.node,
            })
          : d.slot === 'children'
            ? 'Children'
            : 'Parents',
      );
    } else if (g.hasAttribute('tabindex')) {
      for (const name of ['tabindex', 'role', 'aria-expanded', 'aria-label']) {
        g.removeAttribute(name);
      }
    }
  });

  if (!animate) {
    exitSel.remove();
    bound
      .style('opacity', null)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    enterSel.style('opacity', null);
    return undefined;
  }

  const promises: Promise<unknown>[] = [];

  if (!exitSel.empty()) {
    exitSel.each(function () {
      const g = this;
      g.setAttribute('data-exiting', 'true');
      g.style.pointerEvents = 'none';
      for (const name of ['tabindex', 'role', 'aria-expanded', 'aria-label']) {
        g.removeAttribute(name);
      }
    });
    const exitT = exitSel
      .transition()
      .duration(HIDE_TIME_MS)
      .style('opacity', '0')
      .remove();
    promises.push(exitT.end());
  }

  if (!bound.empty()) {
    // An expander whose fade was interrupted fades back in while it moves.
    const moveT = bound
      .transition()
      .delay(HIDE_TIME_MS)
      .duration(MOVE_TIME_MS)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .style('opacity', '1');
    promises.push(moveT.end());
  }

  if (!enterSel.empty()) {
    const enterT = enterSel
      .style('opacity', '0')
      .transition()
      .delay(HIDE_TIME_MS + MOVE_TIME_MS)
      .duration(HIDE_TIME_MS)
      .style('opacity', '1');
    promises.push(enterT.end());
  }

  if (promises.length === 0) return undefined;
  return Promise.allSettled(promises).then(() => undefined);
}
