import { select } from 'd3-selection';
import { interrupt, type Transition } from 'd3-transition';
import { toClassToken } from './class-token.js';
import { generateChartCss } from './css-generator.js';
import { createDefaultLinkLayer } from './default-link-layer.js';
import {
  clickFromKeyboard,
  isActivationKey,
  renderExpanders,
} from './expander-renderer.js';
import {
  checkConfig,
  checkViewState,
  computeLayout,
  resolveChartTheme,
} from './layout.js';
import { createCanvasTextMeasurer } from './text-measurer.js';
import {
  ANIMATION_FADE_MS as HIDE_TIME_MS,
  ANIMATION_MOVE_MS as MOVE_TIME_MS,
  SLOTS,
} from './types.js';
import type {
  AnimationHelpers,
  BoundingBox,
  Chart,
  ChartConfig,
  ChartUpdateOptions,
  ChartUpdateResult,
  CoreTheme,
  CreateChartOptions,
  DrawHelpers,
  Layer,
  LayoutNode,
  LayoutResult,
  Point,
  Region,
  Slot,
  StyleScheme,
  TextMeasurer,
  ViewState,
} from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PROGRESS_ATTRIBUTE = 'data-topola-progress';

let nextInstanceNumber = 1;

interface MarkedElementRecord {
  element: SVGElement;
  kind: 'person' | 'family';
  entityId: string;
  /**
   * The `transform` the plug-in gave the element inside its node, or null if
   * the element is not positioned with a transform.
   */
  restTransform: string | null;
  /**
   * The scheme tokens and the class attribute the chart wrote last, to see
   * without reading them apart that nothing has changed.
   */
  tokens?: string;
  classes?: string;
  /** Whether the chart has made the element a tab stop (`keyboard`). */
  keyboard?: boolean;
}

/** The size and inner layout of a node: what changes when it is resized. */
type NodeGeometry = Pick<
  LayoutNode,
  'bounds' | 'extents' | 'anchors' | 'expanderAnchors' | 'regions'
>;

interface RetainedNodeState {
  group: SVGGElement;
  /** What the node was drawn from, see nodeContentSignature. */
  contentSignature: string;
  /** The geometry the node has, or is moving to. */
  geometry: NodeGeometry;
  /** The geometry the node is moving from, if the last update resized it. */
  geometryFrom: NodeGeometry | null;
  marked: MarkedElementRecord[];
  generation: number;
}

/** Identifies everything but the size that a plug-in may draw a node from. */
function nodeContentSignature(
  node: LayoutNode,
  dataVersion: number,
  configVersion: number,
): string {
  // Hosts that keep generations stable across updates
  // (ViewState.baseGeneration) keep redraws rare.
  return [
    node.indiId ?? '',
    node.spouseId ?? '',
    node.familyId ?? '',
    node.generation,
    node.isRoot,
    dataVersion,
    configVersion,
  ].join('|');
}

const noop = (): void => {};

const regionKey = (region: Region): string => `${region.kind}:${region.id}`;

function geometryOf(node: LayoutNode): NodeGeometry {
  const { bounds, extents, anchors, expanderAnchors, regions } = node;
  return { bounds, extents, anchors, expanderAnchors, regions };
}

/**
 * Compares two geometries number by number. The order of the keys does not
 * matter: `extents` is the object the plug-in returned.
 */
function sameGeometry(a: NodeGeometry, b: NodeGeometry): boolean {
  const same = (p: number, q: number) => p === q || (p !== p && q !== q);
  const sameBox = (p: BoundingBox, q: BoundingBox) =>
    same(p.x, q.x) &&
    same(p.y, q.y) &&
    same(p.width, q.width) &&
    same(p.height, q.height);
  const sameSlots = (p: Record<Slot, Point>, q: Record<Slot, Point>) =>
    SLOTS.every(
      (slot) => same(p[slot].x, q[slot].x) && same(p[slot].y, q[slot].y),
    );
  return (
    sameBox(a.bounds, b.bounds) &&
    same(a.extents.alongBefore, b.extents.alongBefore) &&
    same(a.extents.alongAfter, b.extents.alongAfter) &&
    same(a.extents.acrossBefore, b.extents.acrossBefore) &&
    same(a.extents.acrossAfter, b.extents.acrossAfter) &&
    sameSlots(a.anchors, b.anchors) &&
    sameSlots(a.expanderAnchors, b.expanderAnchors) &&
    a.regions.length === b.regions.length &&
    a.regions.every((region, i) => {
      const other = b.regions[i]!;
      return (
        region.kind === other.kind &&
        region.id === other.id &&
        sameBox(region, other)
      );
    })
  );
}

/**
 * Returns the geometry a node has on its way from one geometry to another,
 * with the boxes of the target. A box the start does not have is where the
 * target has it.
 */
function mixGeometry(
  from: NodeGeometry,
  to: NodeGeometry,
  progress: number,
): NodeGeometry {
  const mix = (a: number, b: number) => a + (b - a) * progress;
  const mixPoint = (a: Point, b: Point): Point => ({
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
  });
  const mixBox = <T extends BoundingBox>(a: BoundingBox, b: T): T => ({
    ...b,
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    width: mix(a.width, b.width),
    height: mix(a.height, b.height),
  });
  const mixSlots = (a: Record<Slot, Point>, b: Record<Slot, Point>) =>
    Object.fromEntries(
      SLOTS.map((slot) => [slot, mixPoint(a[slot], b[slot])]),
    ) as Record<Slot, Point>;
  const fromRegions = new Map(from.regions.map((r) => [regionKey(r), r]));
  return {
    bounds: mixBox(from.bounds, to.bounds),
    extents: {
      alongBefore: mix(from.extents.alongBefore, to.extents.alongBefore),
      alongAfter: mix(from.extents.alongAfter, to.extents.alongAfter),
      acrossBefore: mix(from.extents.acrossBefore, to.extents.acrossBefore),
      acrossAfter: mix(from.extents.acrossAfter, to.extents.acrossAfter),
    },
    anchors: mixSlots(from.anchors, to.anchors),
    expanderAnchors: mixSlots(from.expanderAnchors, to.expanderAnchors),
    regions: to.regions.map((region) => {
      const start = fromRegions.get(regionKey(region));
      return start ? mixBox(start, region) : region;
    }),
  };
}

/** Returns the names in a CSS font-family list, unquoted and lower-cased. */
function fontFamilyNames(fontFamily: string): string[] {
  return fontFamily
    .split(',')
    .map((name) =>
      name
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .toLowerCase(),
    )
    .filter((name) => name.length > 0);
}

function resolveTargetContainer(
  svg: SVGSVGElement | SVGGElement | string,
): SVGSVGElement | SVGGElement {
  let el: Element | null;
  let what: string;
  if (typeof svg !== 'string') {
    if (!svg) {
      // What a failed `getElementById` hands on.
      throw new Error(
        'The chart container is missing: pass an <svg> or <g> element, or a selector for one.',
      );
    }
    el = svg;
    what = 'The chart container';
  } else {
    if (typeof document === 'undefined') {
      throw new Error(
        `Cannot resolve selector "${svg}" without a DOM document.`,
      );
    }
    el = document.querySelector(svg);
    if (!el) {
      throw new Error(`No SVG container matched selector "${svg}".`);
    }
    what = `Selector "${svg}"`;
  }
  // Nothing drawn into another element (a <div>, say) would show. The local
  // name is the same in HTML and in XML documents, where the tag name of an
  // element with a prefix is `svg:g`.
  const tag = el.localName;
  if (el.namespaceURI !== SVG_NS || (tag !== 'svg' && tag !== 'g')) {
    throw new Error(
      `${what} is <${el.tagName.toLowerCase()}>, expected an SVG <svg> or <g> element.`,
    );
  }
  return el as SVGSVGElement | SVGGElement;
}

/**
 * Creates a chart in an `<svg>` or `<g>` element, given as the element or as a
 * selector. Throws if there is no such element.
 *
 * Nothing is drawn until the first `update()`. Several charts can share a
 * document: the CSS of each one applies to itself only.
 */
export function createChart<TTheme extends CoreTheme = CoreTheme>(
  options: CreateChartOptions<TTheme>,
): Chart<TTheme> {
  const target = resolveTargetContainer(options.svg);
  checkConfig(options.config);
  const doc = target.ownerDocument;
  // The id of the host, as far as it can be part of a class name.
  let instanceId = (options.scopeId ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!instanceId) {
    // The number is unique in the document, also when the page has a second
    // copy of this module, which counts on its own.
    while (doc.querySelector(`.topola-${nextInstanceNumber}`)) {
      nextInstanceNumber++;
    }
    instanceId = String(nextInstanceNumber++);
  }
  const scopeClass = `topola-${instanceId}`;
  const sizeTransitionName = `topola-size-${instanceId}`;
  const scopeSelector = `.${scopeClass}`;

  let currentConfig: ChartConfig<TTheme> = { ...options.config };
  let ownedMeasurer: TextMeasurer | null = currentConfig.textMeasurer
    ? null
    : createCanvasTextMeasurer(doc);
  let lastViewState: ViewState | null = null;
  let prevLayout: LayoutResult | null = null;
  let disposed = false;

  let dataVersion = 0;
  let configVersion = 0;

  const retainedNodes = new Map<string, RetainedNodeState>();
  // Elements that have left the chart and are still fading out, mapped to
  // their exit transition.
  const exitingElements = new Map<Element, unknown>();
  // Elements of plug-ins and layers that the animation helpers are animating,
  // mapped to the helper transitions still scheduled or running on them.
  const helperAnimated = new Map<SVGElement, Set<unknown>>();
  let cancelCurrentHelpers: (() => void) | null = null;
  // The sub-group of every layer that has one, by slot and layer id, with
  // the layer that drew into it last.
  const layerGroups: Record<
    Layer['slot'],
    Map<string, { layer: Layer<TTheme>; group: SVGGElement }>
  > = { back: new Map(), links: new Map(), front: new Map() };
  // The default link layer has no sub-group: it draws straight into the
  // links slot. This is the layer that did so last (the one of the chart, or
  // one from the config with the same id).
  let directLinkLayer: Layer<TTheme> | null = null;

  // Create <style class="topola-style-<id>"> IMMEDIATELY BEFORE <g class="topola-<id>">
  const styleEl = doc.createElementNS(SVG_NS, 'style');
  styleEl.setAttribute('class', `topola-style-${instanceId}`);

  const rootG = doc.createElementNS(SVG_NS, 'g');
  rootG.setAttribute('class', scopeClass);

  const svgDefs = doc.createElementNS(SVG_NS, 'defs');
  const layersBackG = doc.createElementNS(SVG_NS, 'g');
  layersBackG.setAttribute('class', 'layers-back');
  const linksG = doc.createElementNS(SVG_NS, 'g');
  linksG.setAttribute('class', 'links');
  const nodesG = doc.createElementNS(SVG_NS, 'g');
  nodesG.setAttribute('class', 'nodes');
  const expandersG = doc.createElementNS(SVG_NS, 'g');
  expandersG.setAttribute('class', 'expanders');
  const layersFrontG = doc.createElementNS(SVG_NS, 'g');
  layersFrontG.setAttribute('class', 'layers-front');

  // Moves from 0 to 1 with the nodes of an animated update. It tells how far
  // an animation had come when the next update cut it short.
  const progressProbe = doc.createElementNS(SVG_NS, 'g');
  progressProbe.setAttribute(PROGRESS_ATTRIBUTE, '1');
  svgDefs.appendChild(progressProbe);

  rootG.appendChild(svgDefs);
  rootG.appendChild(layersBackG);
  rootG.appendChild(linksG);
  rootG.appendChild(nodesG);
  rootG.appendChild(expandersG);
  rootG.appendChild(layersFrontG);

  target.appendChild(styleEl);
  target.appendChild(rootG);

  const defaultLinkLayer = createDefaultLinkLayer<TTheme>();
  // The expanders call this function, whatever handler the config has when
  // the click comes (a handler can change without the chart being drawn).
  const forwardExpanderClick: NonNullable<
    ChartConfig<TTheme>['onExpanderClick']
  > = (info) => currentConfig.onExpanderClick?.(info);

  const getActiveLayers = (): Layer<TTheme>[] => {
    const userLayers = currentConfig.layers ? [...currentConfig.layers] : [];
    const hasCustomLinksLayer = userLayers.some((l) => l.slot === 'links');
    if (!hasCustomLinksLayer) {
      userLayers.push(defaultLinkLayer);
    }
    return userLayers;
  };

  const getMeasurer = (): TextMeasurer => {
    if (currentConfig.textMeasurer) return currentConfig.textMeasurer;
    if (!ownedMeasurer) ownedMeasurer = createCanvasTextMeasurer(doc);
    return ownedMeasurer;
  };

  const refreshStylesheet = (): void => {
    const theme = resolveChartTheme<TTheme>(currentConfig);
    const css = generateChartCss({
      scopeSelector,
      theme,
      nodePlugin: currentConfig.nodePlugin,
      layers: getActiveLayers(),
      schemes: currentConfig.schemes ?? [],
      hasPersonClick: Boolean(currentConfig.onPersonClick),
      hasFamilyClick: Boolean(currentConfig.onFamilyClick),
      overrideCss: currentConfig.overrideCss,
    });
    // Setting the text makes the browser parse the whole sheet again.
    if (styleEl.textContent !== css) {
      styleEl.textContent = css;
    }
  };

  refreshStylesheet();

  // Auto-remeasure when async web fonts finish loading. A host page loads
  // fonts of its own all the time; only the fonts of the chart's theme change
  // its measurements, and remeasuring redraws every node.
  const fontLoadHandler = (event?: Event) => {
    if (disposed || !lastViewState) {
      return;
    }
    const loaded = (event as Partial<FontFaceSetLoadEvent> | undefined)
      ?.fontfaces;
    if (loaded && loaded.length === 0) {
      // No font has loaded (the loads failed): nothing changed.
      return;
    }
    if (loaded) {
      const used = fontFamilyNames(
        resolveChartTheme<TTheme>(currentConfig).fontFamily,
      );
      const relevant = loaded.some((face) =>
        fontFamilyNames(face.family).some((name) => used.includes(name)),
      );
      if (!relevant) {
        return;
      }
    }
    remeasure();
  };
  const fontsObj = doc.fonts;
  if (fontsObj?.addEventListener) {
    fontsObj.addEventListener('loadingdone', fontLoadHandler);
  }

  /**
   * With `ChartConfig.keyboard`, makes a marked element that reports clicks
   * a tab stop with the role of a button, and takes that away again
   * otherwise.
   */
  const refreshKeyboardAccess = (item: MarkedElementRecord): void => {
    const onClick =
      item.kind === 'person'
        ? currentConfig.onPersonClick
        : currentConfig.onFamilyClick;
    const wanted = Boolean(currentConfig.keyboard && onClick);
    if (wanted === Boolean(item.keyboard)) return;
    item.keyboard = wanted;
    if (wanted) {
      item.element.setAttribute('tabindex', '0');
      item.element.setAttribute('role', 'button');
    } else {
      item.element.removeAttribute('tabindex');
      item.element.removeAttribute('role');
    }
  };

  const refreshMarkedElements = (
    nodeId: string,
    state: RetainedNodeState,
    schemes: readonly StyleScheme[],
    viewState: ViewState,
  ): void => {
    for (const item of state.marked) {
      refreshKeyboardAccess(item);
      const baseClass =
        item.kind === 'person' ? 'person-region' : 'family-region';

      const newTokens: string[] = [];
      for (const scheme of schemes) {
        const raw =
          item.kind === 'person'
            ? scheme.classifyPerson?.({
                personId: item.entityId,
                nodeId,
                generation: state.generation,
                viewState,
              })
            : scheme.classifyFamily?.({
                familyId: item.entityId,
                nodeId,
                generation: state.generation,
                viewState,
              });
        if (raw) {
          const clean = toClassToken(raw);
          if (clean) newTokens.push(clean);
        }
      }
      const tokens = newTokens.join(' ');
      if (
        item.tokens === tokens &&
        item.element.getAttribute('class') === item.classes
      ) {
        // The same tokens as last time, and the classes are as written then.
        continue;
      }

      // Preserve any static classes set by the plugin other than previous scheme tokens
      const prevTokens = (item.element.getAttribute('data-topola-tokens') ?? '')
        .split(' ')
        .filter(Boolean);
      const prevTokenSet = new Set(prevTokens);

      const existingClasses = (item.element.getAttribute('class') ?? '')
        .split(/\s+/)
        .filter((c) => c.length > 0 && !prevTokenSet.has(c) && c !== baseClass);

      if (item.element.getAttribute('data-topola-tokens') !== tokens) {
        item.element.setAttribute('data-topola-tokens', tokens);
      }
      const classes = [baseClass, ...existingClasses, ...newTokens].join(' ');
      if (item.element.getAttribute('class') !== classes) {
        item.element.setAttribute('class', classes);
      }
      item.tokens = tokens;
      item.classes = classes;
    }
  };

  /**
   * Stops everything that is moving, where it is. Returns the elements of
   * plug-ins and layers whose helper animation was cut short.
   */
  const interruptAllTransitions = (): SVGElement[] => {
    select(rootG).interrupt();
    interrupt(target, sizeTransitionName);
    interrupt(progressProbe);
    // Elements that are fading out are left alone: interrupting them would
    // cancel their removal and leave them in the chart for good.
    const notExiting = function (this: Element): boolean {
      return !exitingElements.has(this);
    };
    const cutShort = [...helperAnimated.keys()];
    helperAnimated.clear();
    for (const element of cutShort) {
      interrupt(element);
    }
    for (const state of retainedNodes.values()) {
      interrupt(state.group);
      for (const item of state.marked) {
        interrupt(item.element);
      }
    }
    select(linksG)
      .selectAll<Element, unknown>('*')
      .filter(notExiting)
      .interrupt();
    // Nothing in the expander group is ever kept in `exitingElements`: the
    // expanders that leave are found again by the data join of the renderer.
    select(expandersG).selectAll<Element, unknown>('*').interrupt();
    return cutShort;
  };

  const watchHelperTransition = (
    element: SVGElement,
    transition: Transition<SVGElement, unknown, null, undefined>,
  ): void => {
    let activeSet = helperAnimated.get(element);
    if (!activeSet) {
      activeSet = new Set();
      helperAnimated.set(element, activeSet);
    }
    activeSet.add(transition);
    transition.on('end.helper interrupt.helper cancel.helper', () => {
      const current = helperAnimated.get(element);
      if (current) {
        current.delete(transition);
        if (current.size === 0) {
          helperAnimated.delete(element);
        }
      }
    });
  };

  /**
   * Animation helpers for one update. Their transitions end with it.
   * `track` makes the update wait for a transition, and `touched` receives
   * every element a helper is called for.
   */
  const createAnimationHelpers = (
    animate: boolean,
    track: (transition: { end(): Promise<void> }) => void,
    touched: Set<SVGElement>,
    onCancel: () => void,
  ): AnimationHelpers => {
    let active = true;
    // The transition of every element moved during this update that has not
    // started yet. A second `move` of the element joins it: a transition of
    // its own would cancel the first one.
    const pendingMoves = new Map<
      SVGElement,
      {
        transition: Transition<SVGElement, unknown, null, undefined>;
        attributes: Record<string, string | number>;
      }
    >();
    // Where this update has moved every element to so far. A `move` that
    // comes when the transition of the element is under way (from a layer
    // that draws after waiting) starts a new one, which cuts the first one
    // short: it takes the targets of the first one along.
    const moveTargets = new Map<SVGElement, Record<string, string | number>>();
    cancelCurrentHelpers = () => {
      active = false;
      pendingMoves.clear();
      moveTargets.clear();
      onCancel();
    };
    return {
      move(element, attributes) {
        if (!active || disposed) return;
        touched.add(element);
        if (exitingElements.has(element)) {
          exitingElements.delete(element);
          interrupt(element);
        }
        if (!animate) {
          for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, String(value));
          }
          element.style.removeProperty('opacity');
          return;
        }
        const pending = pendingMoves.get(element);
        if (pending) {
          for (const [name, value] of Object.entries(attributes)) {
            pending.attributes[name] = value;
            pending.transition.attr(name, value);
          }
          return;
        }
        const target: Record<string, string | number> = {
          ...moveTargets.get(element),
          ...attributes,
        };
        moveTargets.set(element, target);
        const moveT = select(element)
          .transition()
          .delay(HIDE_TIME_MS)
          .duration(MOVE_TIME_MS)
          .style('opacity', '1');
        // Nothing can join the transition once it has started, or once
        // something has cut it short before it did (the next update, or a
        // `disappear` of the element).
        moveT.on('start.pending interrupt.pending cancel.pending', () => {
          if (pendingMoves.get(element)?.transition === moveT) {
            pendingMoves.delete(element);
          }
        });
        moveT
          // Interpolation may format values differently; end on the exact ones.
          .on('end.exact', () => {
            for (const [name, value] of Object.entries(target)) {
              element.setAttribute(name, String(value));
            }
          });
        for (const [name, value] of Object.entries(target)) {
          moveT.attr(name, value);
        }
        pendingMoves.set(element, { transition: moveT, attributes: target });
        watchHelperTransition(element, moveT);
        track(moveT);
      },
      appear(element) {
        if (!active || disposed) return;
        touched.add(element);
        exitingElements.delete(element);
        helperAnimated.delete(element);
        pendingMoves.delete(element);
        moveTargets.delete(element);
        interrupt(element);
        if (!animate) {
          element.style.removeProperty('opacity');
          return;
        }
        const enterT = select(element)
          .style('opacity', '0')
          .transition()
          .delay(HIDE_TIME_MS + MOVE_TIME_MS)
          .duration(HIDE_TIME_MS)
          .style('opacity', '1');
        watchHelperTransition(element, enterT);
        track(enterT);
      },
      disappear(element) {
        if (!active || disposed) return;
        touched.add(element);
        helperAnimated.delete(element);
        pendingMoves.delete(element);
        moveTargets.delete(element);
        interrupt(element);
        if (!animate) {
          exitingElements.delete(element);
          element.remove();
          return;
        }
        const exitT = select(element)
          .transition()
          .duration(HIDE_TIME_MS)
          .style('opacity', '0')
          .remove();
        exitingElements.set(element, exitT);
        exitT.on('end.exiting interrupt.exiting cancel.exiting', () => {
          if (exitingElements.get(element) === exitT) {
            exitingElements.delete(element);
          }
        });
        track(exitT);
      },
    };
  };

  const emptyResult = (): ChartUpdateResult => ({
    layout: {
      direction: currentConfig.direction ?? 'down',
      size: [0, 0],
      origin: [0, 0],
      nodes: [],
      links: [],
      problems: [],
    },
    finished: Promise.resolve(),
  });

  function update(
    viewState: ViewState,
    options?: ChartUpdateOptions,
  ): ChartUpdateResult {
    return disposed ? emptyResult() : draw(viewState, false, options);
  }

  /**
   * Lays the chart out and draws it. `forceStatic` draws at once, also in an
   * animated chart; otherwise `options.animate` goes before the config.
   */
  function draw(
    viewState: ViewState,
    forceStatic: boolean,
    options?: ChartUpdateOptions,
  ): ChartUpdateResult {
    checkViewState(viewState);
    const measurer = getMeasurer();
    const layout = computeLayout(viewState, {
      ...currentConfig,
      textMeasurer: measurer,
    });
    lastViewState = viewState;

    const theme = resolveChartTheme<TTheme>(currentConfig);
    const schemes = currentConfig.schemes ?? [];
    const activeLayers = getActiveLayers();
    const shouldAnimate =
      !forceStatic &&
      (options?.animate ?? Boolean(currentConfig.animate)) &&
      prevLayout !== null;

    cancelCurrentHelpers?.();
    cancelCurrentHelpers = null;
    // Interrupt any in-flight transitions in place so elements glide from live transforms
    const cutShort = interruptAllTransitions();

    const transitionPromises: Promise<unknown>[] = [];
    const layerPromises: Promise<unknown>[] = [];
    /** Waits for a transition; one that is cut short counts as ended. */
    const track = (transition: { end(): Promise<void> }): void => {
      transitionPromises.push(transition.end().then(noop, noop));
    };
    const touchedByHelpers = new Set<SVGElement>();
    let resolveCancelled!: () => void;
    const cancelledPromise = new Promise<void>((resolve) => {
      resolveCancelled = resolve;
    });
    const animation = createAnimationHelpers(
      shouldAnimate,
      track,
      touchedByHelpers,
      resolveCancelled,
    );

    const shouldUpdateSvgSize =
      currentConfig.updateSvgSize ?? target.localName === 'svg';
    if (shouldUpdateSvgSize) {
      const [width, height] = layout.size;
      // Only what has changed is written: a browser lays the page out and
      // paints the whole chart again when the size of an <svg> is set, also
      // to the size it has (measured in Chromium: about 85 ms for a chart
      // of 1,100 nodes, for a redraw that changes nothing else).
      const setSize = (w: number, h: number): void => {
        if (target.getAttribute('width') !== String(w)) {
          target.setAttribute('width', String(w));
        }
        if (target.getAttribute('height') !== String(h)) {
          target.setAttribute('height', String(h));
        }
      };
      // The size the <svg> has now, if it has one.
      const rawWidth = parseFloat(target.getAttribute('width') ?? '');
      const rawHeight = parseFloat(target.getAttribute('height') ?? '');
      const shownWidth = Number.isFinite(rawWidth) ? rawWidth : width;
      const shownHeight = Number.isFinite(rawHeight) ? rawHeight : height;
      if (shouldAnimate && (width < shownWidth || height < shownHeight)) {
        // A chart that shrinks at once is cut off while its nodes are still
        // at their old places: it keeps room for both layouts until the
        // nodes have moved. (The size is not interpolated; resizing the
        // <svg> on every frame makes the page lay out on every frame.)
        setSize(Math.max(width, shownWidth), Math.max(height, shownHeight));
        track(
          select<Element, unknown>(target)
            .transition(sizeTransitionName)
            .delay(HIDE_TIME_MS)
            .duration(MOVE_TIME_MS)
            .on('end', () => setSize(width, height)),
        );
      } else {
        setSize(width, height);
      }
    }

    // How far the previous update had moved things when this one began.
    const prevProgress = Number(progressProbe.getAttribute(PROGRESS_ATTRIBUTE));
    if (shouldAnimate) {
      progressProbe.setAttribute(PROGRESS_ATTRIBUTE, '0');
      select(progressProbe)
        .transition()
        .delay(HIDE_TIME_MS)
        .duration(MOVE_TIME_MS)
        .attr(PROGRESS_ATTRIBUTE, 1);
    } else {
      progressProbe.setAttribute(PROGRESS_ATTRIBUTE, '1');
    }

    // Root origin transform on g.topola-<id>
    const rootSel = select(rootG);
    const originTransform = `translate(${layout.origin[0]}, ${layout.origin[1]})`;
    if (shouldAnimate) {
      const t = rootSel
        .transition()
        .delay(HIDE_TIME_MS)
        .duration(MOVE_TIME_MS)
        .attr('transform', originTransform);
      track(t);
    } else {
      rootSel.attr('transform', originTransform);
    }

    // Diff and draw nodes
    const nextNodeIds = new Set(layout.nodes.map((n) => n.id));

    // Exit nodes
    for (const [oldId, oldState] of retainedNodes.entries()) {
      if (!nextNodeIds.has(oldId)) {
        retainedNodes.delete(oldId);
        if (shouldAnimate) {
          for (const item of oldState.marked) {
            if (item.keyboard) {
              item.keyboard = false;
              item.element.removeAttribute('tabindex');
              item.element.removeAttribute('role');
            }
          }
          oldState.group.style.pointerEvents = 'none';
          animation.disappear(oldState.group);
        } else {
          oldState.group.remove();
        }
      }
    }
    if (!shouldAnimate) {
      // Without animation the chart shows its new state at once.
      for (const element of [...exitingElements.keys()]) {
        interrupt(element);
        element.remove();
      }
      exitingElements.clear();
    }

    // Enter & update nodes
    for (const node of layout.nodes) {
      const contentSig = nodeContentSignature(node, dataVersion, configVersion);
      const geometry = geometryOf(node);
      let state = retainedNodes.get(node.id);
      const isEnter = !state;

      if (!state) {
        const g = doc.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'node');
        g.setAttribute('data-node-id', node.id);
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        nodesG.appendChild(g);
        state = {
          group: g,
          contentSignature: '',
          geometry,
          geometryFrom: null,
          marked: [],
          generation: node.generation,
        };
        retainedNodes.set(node.id, state);
      } else {
        state.generation = node.generation;
      }

      const { nodePlugin } = currentConfig;
      const sameContent = !isEnter && state.contentSignature === contentSig;

      // The geometry the node shows right now: the one it has, or, if the
      // previous update was resizing it, the one it had reached.
      // A resize that has come to its end shows its target exactly; mixing
      // would be off by rounding.
      const shown =
        state.geometryFrom && prevProgress < 1
          ? mixGeometry(state.geometryFrom, state.geometry, prevProgress)
          : state.geometry;
      // The same for the boxes the node is going to have. A node that shows
      // the new geometry already (most nodes of most updates) starts there.
      const settled = isEnter || sameGeometry(shown, geometry);
      const start = settled ? geometry : mixGeometry(shown, geometry, 0);
      const geometryChanged = !settled && !sameGeometry(start, geometry);
      const resizes = nodePlugin.resizeNode !== undefined;

      // A resize that was interrupted may have left the drawing anywhere
      // between two geometries; the plug-in brings it to the new one.
      const unsettled = state.geometryFrom !== null && prevProgress < 1;

      /** Lets the plug-in bring what it has drawn to the new geometry. */
      const resize = () => {
        nodePlugin.resizeNode?.(state.group, node, {
          direction: layout.direction,
          theme,
          animation,
        });
      };
      // Whether the node changes its geometry in step with the rest of the
      // chart, starting from the geometry it shows.
      const resizesSmoothly = resizes && geometryChanged && shouldAnimate;

      if (sameContent && resizes) {
        if (geometryChanged || unsettled) {
          // Only the size changed: the plug-in adapts what it has drawn.
          resize();
        }
      } else if (!sameContent || geometryChanged) {
        // Draw the node again. A plug-in that cannot resize may still place
        // boxes with a transform. Remember where each person / family box
        // sits inside the node, so that boxes surviving the redraw (e.g.
        // swapped spouses) glide to their new place instead of jumping.
        const prevTransforms = new Map<string, string>();
        if (shouldAnimate && !isEnter && !resizes) {
          for (const item of state.marked) {
            const transform = item.element.getAttribute('transform');
            if (transform !== null) {
              prevTransforms.set(`${item.kind}:${item.entityId}`, transform);
            }
          }
        }

        while (state.group.firstChild) {
          state.group.removeChild(state.group.firstChild);
        }
        state.marked = [];
        const capturedState = state;
        const mark = (
          kind: 'person' | 'family',
          element: SVGElement,
          entityId: string,
        ): void => {
          capturedState.marked.push({
            element,
            kind,
            entityId,
            restTransform: null,
          });
          element.addEventListener('click', (event: MouseEvent) => {
            if (retainedNodes.get(node.id) !== capturedState) return;
            const onClick =
              kind === 'person'
                ? currentConfig.onPersonClick
                : currentConfig.onFamilyClick;
            if (!onClick) return;
            event.stopPropagation();
            onClick({
              id: entityId,
              nodeId: node.id,
              generation: capturedState.generation,
              modifiers: {
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                metaKey: event.metaKey,
              },
              event,
            });
          });
          element.addEventListener('keydown', (event: KeyboardEvent) => {
            if (retainedNodes.get(node.id) !== capturedState) return;
            const onClick =
              kind === 'person'
                ? currentConfig.onPersonClick
                : currentConfig.onFamilyClick;
            // Only for the element itself: a key pressed in something
            // focusable inside it is not meant for it.
            if (
              currentConfig.keyboard &&
              onClick &&
              event.target === element &&
              isActivationKey(event)
            ) {
              event.preventDefault();
              clickFromKeyboard(element, event);
            }
          });
        };
        const helpers: DrawHelpers = {
          ...animation,
          markPerson: (element, personId) => mark('person', element, personId),
          markFamily: (element, familyId) => mark('family', element, familyId),
        };

        // New content that changes size smoothly is drawn at the geometry the
        // old drawing showed, and resized from there.
        currentConfig.nodePlugin.drawNode(
          state.group,
          resizesSmoothly ? { ...node, ...start } : node,
          { direction: layout.direction, theme, helpers },
        );
        state.contentSignature = contentSig;

        for (const item of state.marked) {
          item.restTransform = item.element.getAttribute('transform');
          const prev = prevTransforms.get(`${item.kind}:${item.entityId}`);
          if (item.restTransform !== null && prev !== undefined) {
            item.element.setAttribute('transform', prev);
          }
        }

        if (resizesSmoothly) {
          resize();
        }
      }
      state.geometryFrom = resizesSmoothly ? start : null;
      state.geometry = geometry;

      // Move person / family boxes that are away from their resting place
      // (after a redraw or an interrupted glide) back to it. A plug-in that
      // resizes its nodes places its boxes itself.
      if (!resizes) {
        for (const item of state.marked) {
          const rest = item.restTransform;
          if (
            rest !== null &&
            item.element.getAttribute('transform') !== rest
          ) {
            animation.move(item.element, { transform: rest });
          }
        }
      }

      // Refresh StyleScheme classes across all surviving & entered marked elements
      refreshMarkedElements(node.id, state, schemes, viewState);

      const targetTransform = `translate(${node.x}, ${node.y})`;
      const nodeSel = select(state.group);
      if (shouldAnimate) {
        if (isEnter) {
          nodeSel.attr('transform', targetTransform).style('opacity', '0');
          const enterT = nodeSel
            .transition()
            .delay(HIDE_TIME_MS + MOVE_TIME_MS)
            .duration(HIDE_TIME_MS)
            .style('opacity', '1');
          track(enterT);
        } else {
          // A node whose fade-in was interrupted is not fully opaque yet; it
          // finishes fading in while it moves instead of popping in.
          const moveT = nodeSel
            .transition()
            .delay(HIDE_TIME_MS)
            .duration(MOVE_TIME_MS)
            .attr('transform', targetTransform)
            .style('opacity', '1');
          track(moveT);
        }
      } else {
        nodeSel.style('opacity', null).attr('transform', targetTransform);
      }
    }

    // Render layers (back, links, front)
    const slotContainers = {
      back: layersBackG,
      links: linksG,
      front: layersFrontG,
    } as const;
    const isDefaultLinks = (layer: Layer<TTheme>): boolean =>
      layer.slot === 'links' && layer.id === 'default-links';

    // Remove the sub-groups of layers that have left the config
    const disposeErrors: unknown[] = [];
    for (const slot of ['back', 'links', 'front'] as const) {
      const keep = new Set(
        activeLayers.filter((l) => l.slot === slot).map((l) => l.id),
      );
      for (const [layerId, entry] of layerGroups[slot]) {
        if (!keep.has(layerId)) {
          layerGroups[slot].delete(layerId);
          try {
            entry.layer.dispose?.({ group: entry.group, svgDefs, instanceId });
          } catch (error) {
            disposeErrors.push(error);
          } finally {
            interrupt(entry.group);
            select(entry.group).selectAll('*').interrupt();
            entry.group.remove();
          }
        }
      }
      if (slot === 'links' && !keep.has('default-links')) {
        // The default link layer draws straight into the slot.
        const left = directLinkLayer;
        directLinkLayer = null;
        try {
          left?.dispose?.({ group: linksG, svgDefs, instanceId });
        } catch (error) {
          disposeErrors.push(error);
        } finally {
          const subGroups = new Set<Element>(
            [...layerGroups.links.values()].map((entry) => entry.group),
          );
          for (const child of Array.from(linksG.children)) {
            if (!subGroups.has(child)) {
              interrupt(child);
              select(child).selectAll('*').interrupt();
              child.remove();
            }
          }
        }
      }
    }

    // Every other layer has a sub-group of its own, keyed by layer.id.
    const subGroupOf = (layer: Layer<TTheme>): SVGGElement => {
      const groups = layerGroups[layer.slot];
      let entry = groups.get(layer.id);
      if (!entry) {
        const group = doc.createElementNS(SVG_NS, 'g');
        group.setAttribute('data-layer-id', layer.id);
        slotContainers[layer.slot].appendChild(group);
        entry = { layer, group };
        groups.set(layer.id, entry);
      }
      entry.layer = layer;
      return entry.group;
    };
    const layerTargets = activeLayers.map((layer) => {
      if (isDefaultLinks(layer)) {
        directLinkLayer = layer;
        return { layer, group: linksG };
      }
      return { layer, group: subGroupOf(layer) };
    });

    // The sub-groups of a slot are in the order of the config, so that a
    // later layer paints over an earlier one. A group that something has
    // taken out of the chart is put back.
    for (const slot of ['back', 'links', 'front'] as const) {
      const wanted = layerTargets
        .filter(({ layer }) => layer.slot === slot && !isDefaultLinks(layer))
        .map(({ group }) => group);
      const wantedSet = new Set<Element>(wanted);
      const present = Array.from(slotContainers[slot].children).filter(
        (child) => wantedSet.has(child),
      );
      if (
        present.length !== wanted.length ||
        present.some((child, i) => child !== wanted[i])
      ) {
        for (const group of wanted) {
          slotContainers[slot].appendChild(group);
        }
      }
    }

    for (const { layer, group: layerGroup } of layerTargets) {
      const res = layer.render({
        group: layerGroup,
        svgDefs,
        instanceId,
        scopeSelector,
        layout,
        prevLayout,
        animate: shouldAnimate,
        theme,
        schemes,
        viewState,
        measurer,
        animation,
      });
      if (res) {
        layerPromises.push(Promise.resolve(res).then(noop, noop));
      }
    }

    // The default link layer draws straight into the slot, next to the
    // groups of the other link layers. It is painted in the order of the
    // config as well: the groups of the layers before it come before all of
    // its paths, those of the layers after it come after them (it adds new
    // paths at the end).
    const linkTargets = layerTargets.filter(
      ({ layer }) => layer.slot === 'links',
    );
    const defaultAt = linkTargets.findIndex(({ layer }) =>
      isDefaultLinks(layer),
    );
    if (defaultAt !== -1 && linkTargets.length > 1) {
      const under = linkTargets.slice(0, defaultAt).map(({ group }) => group);
      const over = linkTargets
        .slice(defaultAt + 1)
        .filter(({ layer }) => !isDefaultLinks(layer))
        .map(({ group }) => group);
      let first: Element | null = linksG.firstElementChild;
      for (const group of under) {
        if (first !== group) {
          linksG.insertBefore(group, first);
        } else {
          first = first.nextElementSibling;
        }
      }
      let last: Element | null = linksG.lastElementChild;
      for (const group of [...over].reverse()) {
        if (last !== group) {
          linksG.insertBefore(group, last ? last.nextSibling : null);
        } else {
          last = last.previousElementSibling;
        }
      }
    }

    // Render directional [+] / [-] expanders
    const expPromise = renderExpanders({
      container: expandersG,
      nodes: layout.nodes,
      direction: layout.direction,
      enabled: Boolean(currentConfig.expanders),
      animate: shouldAnimate,
      onExpanderClick: forwardExpanderClick,
      keyboard: Boolean(currentConfig.keyboard),
      label: currentConfig.expanderLabel,
    });
    if (expPromise) {
      transitionPromises.push(expPromise);
    }

    // An element whose helper animation the update cut short, and that
    // nobody has animated again, would stay as invisible as it was: it
    // becomes visible along with the rest. Its attributes are left alone;
    // only its owner knows where they belong now.
    for (const element of cutShort) {
      if (
        !touchedByHelpers.has(element) &&
        !exitingElements.has(element) &&
        element.isConnected
      ) {
        animation.move(element, {});
      }
    }

    prevLayout = layout;
    currentConfig.onLayout?.(layout, { animated: shouldAnimate });

    // Layers first: a layer that draws after waiting for something adds
    // transitions until its promise settles (or the update is superseded).
    const waitForLayers =
      layerPromises.length > 0
        ? Promise.race([Promise.allSettled(layerPromises), cancelledPromise])
        : Promise.resolve();
    const finished = waitForLayers
      .then(() => Promise.allSettled(transitionPromises))
      .then(noop);

    if (disposeErrors.length > 0) {
      throw disposeErrors[0];
    }

    return { layout, finished };
  }

  function patchConfig(
    patch: Partial<ChartConfig<TTheme>>,
    viewState?: ViewState,
    options?: ChartUpdateOptions,
  ): ChartUpdateResult | undefined {
    if (disposed) return undefined;
    checkConfig({ ...currentConfig, ...patch });
    if (viewState !== undefined) checkViewState(viewState);
    if ('graph' in patch && patch.graph !== currentConfig.graph) {
      dataVersion++;
    }
    // A field that is mentioned changes the look, also when it is mentioned
    // as `undefined` to put it back to its default.
    if (
      'nodePlugin' in patch ||
      'layers' in patch ||
      'theme' in patch ||
      'direction' in patch
    ) {
      configVersion++;
    }
    currentConfig = { ...currentConfig, ...patch };
    refreshStylesheet();
    // Callbacks and the animation switch do not change what is drawn.
    const changesDrawing = Object.keys(patch).some(
      (k) =>
        k !== 'animate' &&
        k !== 'onPersonClick' &&
        k !== 'onFamilyClick' &&
        k !== 'onExpanderClick' &&
        k !== 'onLayout',
    );
    const nextViewState = viewState ?? lastViewState;
    if (nextViewState && (viewState || changesDrawing)) {
      return update(nextViewState, options);
    }
    // The chart is not drawn; what tells which regions can be clicked is
    // brought up to date all the same.
    if ('onPersonClick' in patch || 'onFamilyClick' in patch) {
      for (const state of retainedNodes.values()) {
        for (const item of state.marked) {
          refreshKeyboardAccess(item);
        }
      }
    }
    return undefined;
  }

  function setConfig(
    config: ChartConfig<TTheme>,
    viewState?: ViewState,
    options?: ChartUpdateOptions,
  ): ChartUpdateResult | undefined {
    if (disposed) return undefined;
    checkConfig(config);
    if (viewState !== undefined) checkViewState(viewState);
    if (config.graph !== currentConfig.graph) {
      dataVersion++;
    }
    configVersion++;
    currentConfig = { ...config };
    refreshStylesheet();
    const nextViewState = viewState ?? lastViewState;
    return nextViewState ? update(nextViewState, options) : undefined;
  }

  function remeasure(): void {
    if (disposed) return;
    getMeasurer().invalidate?.();
    configVersion++;
    if (lastViewState) {
      // Text changes its size in place (e.g. when a font has loaded), so the
      // chart follows at once instead of gliding to the new sizes.
      draw(lastViewState, true);
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelCurrentHelpers?.();
    cancelCurrentHelpers = null;
    interruptAllTransitions();
    for (const element of [...exitingElements.keys()]) {
      interrupt(element);
    }
    select(rootG).selectAll('*').interrupt();
    if (fontsObj?.removeEventListener) {
      fontsObj.removeEventListener('loadingdone', fontLoadHandler);
    }
    // A layer whose `dispose` throws must not keep the chart in the SVG:
    // everything is taken down first, and the first error is thrown then.
    const errors: unknown[] = [];
    const disposeLayer = (layer: Layer<TTheme>, group: SVGGElement): void => {
      try {
        layer.dispose?.({ group, svgDefs, instanceId });
      } catch (error) {
        errors.push(error);
      }
    };
    for (const groups of Object.values(layerGroups)) {
      for (const { layer, group } of groups.values()) {
        disposeLayer(layer, group);
      }
      groups.clear();
    }
    if (directLinkLayer) {
      disposeLayer(directLinkLayer, linksG);
      directLinkLayer = null;
    }
    retainedNodes.clear();
    exitingElements.clear();
    helperAnimated.clear();
    styleEl.remove();
    rootG.remove();
    if (errors.length > 0) {
      throw errors[0];
    }
  }

  return {
    update,
    patchConfig,
    setConfig,
    remeasure,
    dispose,
  };
}
