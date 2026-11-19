/**
 * The timing of the animation, for hosts that animate along with the chart
 * (e.g. scrolling). Elements that leave fade out during the first
 * `ANIMATION_FADE_MS`, the rest moves during the next `ANIMATION_MOVE_MS`, and
 * new elements fade in during a final `ANIMATION_FADE_MS`.
 */
export const ANIMATION_FADE_MS = 200;
export const ANIMATION_MOVE_MS = 500;

export type Direction = 'down' | 'up' | 'right' | 'left';
export type Slot = 'indiParents' | 'spouseParents' | 'children';
/** The three slots, for code that loops over them. */
export const SLOTS: readonly Slot[] = [
  'indiParents',
  'spouseParents',
  'children',
];
export type ExpanderState = 'plus' | 'minus';
/**
 * Names the expander of a node in a slot: the id of the node, a colon and
 * the slot. `ViewState.collapsed` holds these keys; build them with
 * `expanderKey`.
 */
export type ExpanderKey = `${string}:${Slot}`;

/** Returns the key of the expander of a node in a slot. */
export function expanderKey(nodeId: string, slot: Slot): ExpanderKey {
  return `${nodeId}:${slot}`;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Extents around the node's local (0, 0) seam origin in abstract (along, across) space. */
export interface BoxExtents {
  alongBefore: number; // [-alongBefore, 0] (upstream / person boxes)
  alongAfter: number; // [0, +alongAfter]  (downstream / hanging marriage box)
  acrossBefore: number; // [-acrossBefore, 0] (indi / first partner side)
  acrossAfter: number; // [0, +acrossAfter]  (spouse / second partner side)
}

export interface Region extends BoundingBox {
  kind: 'person' | 'family';
  id: string;
}

/**
 * Something wrong with the data or the config that the library has worked
 * around instead of throwing. The layout reports its problems in
 * `LayoutResult.problems`, `createModelGraph` those of the data in
 * `ModelGraph.problems`. Nothing is logged: the host decides what to show.
 */
export interface Problem {
  /**
   * What kind of problem it is, e.g. `MISSING_START_PERSON`,
   * `MISSING_PERSON`, `MISSING_FAMILY`, `CYCLE_DETECTED`,
   * `ASYMMETRIC_SPOUSE_LINK`. The README lists the codes.
   */
  code: string;
  /** A sentence for a developer, in English. */
  message: string;
  /** The id of the person, family or other thing the problem is about. */
  entityId?: string | undefined;
}

export interface FamilyGraph {
  /** Whether the graph has a person with this id. */
  hasPerson(id: string): boolean;
  /** Whether the graph has a family with this id. */
  hasFamily(id: string): boolean;
  /** The family in which the person is a child, or `null`. */
  getPersonParentFamily(personId: string): string | null;
  /** The families in which the person is a partner. */
  getPersonSpouseFamilies(personId: string): readonly string[];
  /** The two partners of the family; `null` stands for a missing one. */
  getFamilyPartners(familyId: string): readonly [string | null, string | null];
  /** The children of the family. */
  getFamilyChildren(familyId: string): readonly string[];
}

/** What a chart shows of the data: changes with every `Chart.update`. */
export interface ViewState {
  /**
   * The id of the person the chart starts from. An id that the graph does
   * not have gives an empty layout with the problem `MISSING_START_PERSON`.
   */
  startIndi: string;
  /**
   * The generation number of the start person; default 0. Ancestors count
   * down from it and descendants up. A host that keeps the numbers of the
   * people stable when the start person changes (by passing the generation
   * of the clicked person) keeps their colours and avoids redrawing them.
   */
  baseGeneration?: number | undefined;
  /**
   * The expanders that are folded, see `expanderKey`. Default: none. The ids
   * of nodes are those of the last layout (`LayoutNode.id`).
   */
  collapsed?: ReadonlySet<ExpanderKey> | undefined;
}

export interface SizeNodeInput {
  nodeId: string;
  /**
   * Nodes with the same `rowId` are drawn in one row. Give them the same
   * `alongBefore`: the layout places the row above (the ancestors) against
   * the extents of one node of the row, so a node that reaches further up
   * than its neighbours can overlap that row.
   */
  rowId: string;
  generation: number;
  isRoot: boolean;
  indiId?: string | undefined;
  spouseId?: string | undefined;
  familyId?: string | undefined;
}

export interface MeasuredNode {
  extents: BoxExtents;
  /** Link attachment points in abstract (along, across) relative to (0, 0). */
  anchors: Record<Slot, { along: number; across: number }>;
  /** Optional perimeter attachment points for [+] / [-] expanders (defaults to anchors). */
  expanderAnchors?:
    | Partial<Record<Slot, { along: number; across: number }>>
    | undefined;
  /** Clickable / stylable sub-regions in abstract (along, across) relative to (0, 0). */
  regions: Region[];
}

/**
 * Animates elements in step with the rest of the chart. When the chart does
 * not animate, everything happens at once.
 *
 * The helpers own the inline `opacity` style of the elements passed to them.
 *
 * Call the helpers while the chart draws (in `drawNode`, `resizeNode` or
 * `Layer.render`). An update that comes before the animation has ended cuts
 * it short: an attribute that was moving stays where it had come to, so on
 * every update `move` each element you keep to where it belongs, also when
 * its target is the one of the update before. The chart itself only makes an
 * element that was fading in fully visible.
 */
export interface AnimationHelpers {
  /**
   * Sets attributes of an element. When the chart animates, they change while
   * the nodes move. An element whose fade-in was cut short becomes fully
   * visible along the way. Several calls for one element during one update
   * add up, also when a layer makes them after waiting for something.
   */
  move(
    element: SVGElement,
    attributes: Readonly<Record<string, string | number>>,
  ): void;
  /**
   * Shows a new element. When the chart animates, it stays invisible until the
   * nodes have moved and then fades in.
   */
  appear(element: SVGElement): void;
  /**
   * Removes an element. When the chart animates, it fades out first, before
   * the nodes start moving.
   */
  disappear(element: SVGElement): void;
}

export interface DrawHelpers extends AnimationHelpers {
  /**
   * Marks an element as showing the person. The chart gives it the class
   * `person-region` and the classes of the style schemes, which it brings up to
   * date on every update, and reports clicks on it to
   * `ChartConfig.onPersonClick`.
   */
  markPerson(element: SVGElement, personId: string): void;
  /**
   * Marks an element as showing the family, like `markPerson`: the class is
   * `family-region`, and clicks go to `ChartConfig.onFamilyClick`.
   */
  markFamily(element: SVGElement, familyId: string): void;
}

export interface NodePlugin<TTheme extends CoreTheme = CoreTheme> {
  /**
   * Defaults for the theme fields this plug-in adds. The theme of the chart
   * config overrides them.
   */
  readonly defaultTheme?: Partial<TTheme> | undefined;
  /**
   * Returns the CSS rules of the nodes. Start every selector with
   * `scopeSelector`, so that the rules stay inside this chart. `schemes` are
   * the style schemes of the chart, e.g. to write rules for their palettes.
   */
  getCss?(
    scopeSelector: string,
    theme: TTheme,
    schemes: readonly StyleScheme[],
  ): string;
  /**
   * Measures the nodes before they are placed. Returns, by `nodeId`, the
   * extents of every node around its (0, 0), the points where its links attach,
   * and its regions. A node that is left out takes no room.
   *
   * `computeLayout` calls this method without a DOM, so measure text with
   * `ctx.measurer`. What is added to `ctx.problems` is reported in
   * `LayoutResult.problems`.
   */
  sizeNodes(
    nodes: readonly SizeNodeInput[],
    ctx: {
      direction: Direction;
      theme: TTheme;
      measurer: TextMeasurer;
      problems: Problem[];
    },
  ): Map<string, MeasuredNode>;
  /**
   * Draws the node into its empty group, at the geometry of `node`. That is
   * the geometry of the layout, except when the plug-in has `resizeNode` and
   * the node is about to change size during an animation.
   */
  drawNode(
    group: SVGGElement,
    node: LayoutNode,
    ctx: { direction: Direction; theme: TTheme; helpers: DrawHelpers },
  ): void;
  /**
   * Brings a drawn node to the geometry of `node`: its extents, anchors and
   * regions. Change the geometry through `ctx.animation`, so that it changes
   * in step with the rest of the chart. Elements stay marked; do not mark them
   * again.
   *
   * The chart calls it in two situations:
   * - Only the size of the node changed (the same people, generation, data
   *   and config). It is called instead of `drawNode`.
   * - The content of the node changed and its size as well. `drawNode` draws
   *   the new content at the geometry the node showed before, and this method
   *   brings it to the new one. This way a redrawn node changes size smoothly
   *   too, and boxes that survive the redraw (swapped spouses) glide to their
   *   new places.
   *
   * An interrupted animation leaves the node between two geometries, so move
   * to the given geometry from whatever is drawn.
   *
   * Without this method a node that changes size is drawn again at once.
   */
  resizeNode?(
    group: SVGGElement,
    node: LayoutNode,
    ctx: { direction: Direction; theme: TTheme; animation: AnimationHelpers },
  ): void;
}

export interface LayerRenderContext<TTheme extends CoreTheme = CoreTheme> {
  group: SVGGElement;
  svgDefs: SVGDefsElement;
  instanceId: string;
  scopeSelector: string;
  layout: LayoutResult;
  prevLayout: LayoutResult | null;
  animate: boolean;
  theme: TTheme;
  /** The style schemes of the chart, e.g. to classify links. */
  schemes: readonly StyleScheme[];
  viewState: ViewState;
  measurer: TextMeasurer;
  animation: AnimationHelpers;
}

export interface Layer<TTheme extends CoreTheme = CoreTheme> {
  /**
   * Identifies the layer and its group across updates. Unique among the
   * layers of its slot: two layers with one id draw into the same group.
   * A layer object that takes the place of another one with the same id and
   * slot (a config built anew) takes over its group with what is drawn in
   * it; the other one is not told (see `dispose`).
   */
  id: string;
  /**
   * Where the layer is painted: behind everything, with the links, or in
   * front of everything. Layers of one slot are painted in the order of
   * `ChartConfig.layers`.
   *
   * A layer in the `links` slot replaces the default link layer; add
   * `createDefaultLinkLayer()` to `layers` to keep it, before the layers
   * that are to be painted over its links and after those under them.
   */
  slot: 'back' | 'links' | 'front';
  /**
   * Defaults for the theme fields this layer adds. The theme of the chart
   * config overrides them.
   */
  readonly defaultTheme?: Partial<TTheme> | undefined;
  /**
   * Returns the CSS rules of the layer. Start every selector with
   * `scopeSelector`, so that the rules stay inside this chart.
   */
  getCss?(scopeSelector: string, theme: TTheme): string;
  /**
   * Returns the area the layer draws on, in the coordinates of the nodes
   * (`LayoutNode.x` and `y`), or `null` if it needs no room of its own. The
   * chart grows to hold the area, e.g. to make room for a legend.
   */
  getBounds?(
    layout: Pick<LayoutResult, 'nodes' | 'links' | 'direction'>,
    ctx: { theme: TTheme; measurer: TextMeasurer },
  ): BoundingBox | null;
  /**
   * Draws the layer into `ctx.group`. Elements moved through `ctx.animation`
   * are waited for by the chart; return a promise for transitions of your
   * own, so that `finished` of the update waits for them as well.
   */
  render(ctx: LayerRenderContext<TTheme>): Promise<void> | void;
  /**
   * Called when the layer has left the config, before its group is removed,
   * and when the chart is disposed. Remove here what the layer has added
   * outside its group, e.g. to `svgDefs`.
   *
   * A layer has left the config when no layer of its slot has its id any
   * more. The call goes to the object that drew last: an object that was
   * replaced by another one with the same id is not called, so keep what
   * `dispose` needs findable by the id (as an element id, say), not in the
   * object. An error thrown here does not keep the chart from being removed.
   */
  dispose?(ctx: {
    group: SVGGElement;
    svgDefs: SVGDefsElement;
    instanceId: string;
  }): void;
}

export interface TwoToneColor {
  fill: string;
  accent: string;
}

export interface StyleScheme {
  id: string;
  /**
   * The colours of the tokens the scheme gives out, by token. Boxes write
   * them into the stylesheet of the chart as they are: do not pass text from
   * an untrusted source as a colour.
   */
  palette?: Readonly<Record<string, TwoToneColor>> | undefined;
  /**
   * Returns a token for the person, or nothing. The chart turns it into a class
   * name (`toClassToken`) and sets it on every element that is marked for the
   * person, anew on every update.
   */
  classifyPerson?(ctx: {
    personId: string;
    nodeId: string;
    generation: number;
    viewState: ViewState;
  }): string | undefined;
  /**
   * Returns a token for the family, or nothing. It becomes a class of every
   * element that is marked for the family, like the token of `classifyPerson`.
   */
  classifyFamily?(ctx: {
    familyId: string;
    nodeId: string;
    generation: number;
    viewState: ViewState;
  }): string | undefined;
  /**
   * Returns a token for the link, or nothing. The default link layer turns it
   * into a class name (`toClassToken`) and sets it on the link. Other link
   * layers get the schemes in their render context.
   */
  classifyLink?(ctx: {
    link: LayoutLink;
    viewState: ViewState;
  }): string | undefined;
  /**
   * Returns the CSS rules of the scheme. Start every selector with
   * `scopeSelector`, so that the rules stay inside this chart.
   */
  getCss?(scopeSelector: string): string;
}

export interface FontSpec {
  fontFamily: string;
  fontSize: number;
  fontWeight?: string | number | undefined;
  fontStyle?: string | undefined;
}

export interface TextMeasurer {
  /** Returns the width in pixels of the text, on one line, in the font. */
  measureWidth(text: string, font: FontSpec): number;
  /**
   * Forgets the widths the measurer remembers. `Chart.remeasure()` calls it,
   * e.g. when a font has loaded and text is no longer as wide as before.
   */
  invalidate?(): void;
}

/**
 * The theme fields of the core; node plug-ins and layers add their own.
 * Lengths are in pixels (user units of the SVG). The defaults are in
 * `DEFAULT_CORE_THEME`.
 *
 * Colours, font names and other texts of a theme are written into the
 * stylesheet of the chart as they are. That stylesheet is part of the page:
 * do not pass text from an untrusted source (a URL parameter, a shared
 * setting) as a theme value.
 */
export interface CoreTheme {
  /** The CSS `font-family` of all text, also used to measure it. */
  fontFamily: string;
  /** The gap between neighbouring nodes of one generation. */
  siblingSpacing: number;
  /** The gap between the rows (columns, in a sideways chart) of generations. */
  generationSpacing: number;
  /** The room around the chart: one number for all sides, or one per side. */
  margin: number | { top: number; right: number; bottom: number; left: number };
  /** The CSS colour of the links. */
  linkColor: string;
  /** The width of the links. */
  linkStrokeWidth: number;
  /**
   * The CSS `stroke-dasharray` of the line between two marriages of one
   * person.
   */
  additionalMarriageDash: string;
}

export interface ClickInfo {
  id: string;
  nodeId: string;
  generation: number;
  modifiers: {
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
  };
  event: MouseEvent;
}

/** What `ChartConfig.onExpanderClick` receives. */
export interface ExpanderClickInfo {
  /** The id of the node the expander belongs to (`LayoutNode.id`). */
  nodeId: string;
  slot: Slot;
  event: MouseEvent;
}

/** What `ChartConfig.expanderLabel` receives. */
export interface ExpanderLabelInfo {
  /** The id of the node the expander belongs to (`LayoutNode.id`). */
  nodeId: string;
  slot: Slot;
  /** Whether the branch is folded (`plus`) or shown (`minus`). */
  state: ExpanderState;
  /** The node of the current layout that the expander belongs to. */
  node: LayoutNode;
}

export interface ChartConfig<TTheme extends CoreTheme = CoreTheme> {
  /**
   * The people and families and how they are related, e.g. from
   * `createModelGraph(data)`. (Plain `{ indis, fams }` data is no graph.)
   */
  graph: FamilyGraph;
  /**
   * The kind of chart: `hourglass` shows the ancestors and the descendants
   * of the start person, `relatives` also the descendants of every ancestor
   * (siblings, cousins).
   *
   * A `relatives` chart has no limit on these descendants
   * (`maxDescendantGenerations` is for those of the start person), and it
   * draws a relative once for every ancestor couple they descend from. In
   * data where the same ancestors are reached along many lines it can grow
   * to hundreds of thousands of nodes; limit `maxAncestorGenerations` for
   * such data.
   */
  chart: 'hourglass' | 'relatives';
  /** Where the descendants are, seen from the start person. Default `down`. */
  direction?: Direction | undefined;
  /**
   * How many generations of ancestors are shown; 0 for none. Default: all.
   * No expander is drawn where the limit cuts the chart off.
   */
  maxAncestorGenerations?: number | undefined;
  /**
   * How many generations of descendants of the start person are shown; 0
   * for none. Default: all.
   */
  maxDescendantGenerations?: number | undefined;
  /**
   * Whether [+] / [-] expanders are drawn where a branch can be folded.
   * Default: no. See `onExpanderClick`.
   */
  expanders?: boolean | undefined;
  /**
   * Whether the chart moves from one drawing to the next (see
   * `ANIMATION_FADE_MS`). Default: no. `ChartUpdateOptions.animate` decides
   * for a single drawing.
   */
  animate?: boolean | undefined;
  /**
   * Whether the chart sets `width` and `height` of its container to the
   * size of the layout. Default: yes for an `<svg>` container, no for a
   * `<g>`. Turn it off when the host sizes the SVG itself, e.g. in
   * `onLayout`.
   */
  updateSvgSize?: boolean | undefined;
  /** Measures and draws the nodes, e.g. `createDetailedNodePlugin(...)`. */
  nodePlugin: NodePlugin<TTheme>;
  /**
   * What is drawn besides the nodes, see `Layer`. Default: the default link
   * layer alone.
   */
  layers?: readonly Layer<TTheme>[] | undefined;
  /** Give classes, and with them colours, to people, families and links. */
  schemes?: readonly StyleScheme[] | undefined;
  /**
   * Overrides the defaults of the core (`DEFAULT_CORE_THEME`), of the node
   * plug-in and of the layers. See `CoreTheme` about untrusted values.
   */
  theme?: Partial<TTheme> | undefined;
  /**
   * Raw CSS appended after the generated rules. `{scope}` in it is replaced
   * with the selector of this chart, e.g. `{scope} .link { stroke: red; }`,
   * which keeps a rule from leaking and lets it win over the generated ones.
   *
   * It becomes part of the stylesheet as it is, and a rule without `{scope}`
   * applies to the whole page: do not pass text from an untrusted source.
   */
  overrideCss?: string | undefined;
  /**
   * Measures text for the layout. Default: a chart measures with a canvas of
   * its document and remembers the widths. `computeLayout` creates a new
   * canvas measurer on every call when none is given: pass one
   * `createCanvasTextMeasurer()` to all calls to keep what it has measured,
   * or `createFixedTextMeasurer()` where there is no canvas.
   */
  textMeasurer?: TextMeasurer | undefined;
  /**
   * Off by default. Makes the expanders, and the person and family regions
   * that have a click callback, usable without a pointer: they become tab
   * stops with the role `button`, and Enter or Space on one acts as a click
   * (the callback gets the `MouseEvent` of a click made for it). Expanders
   * also tell whether they are expanded (`aria-expanded`) and are named by
   * `expanderLabel`. Nothing looks different until an element has the
   * keyboard focus, which browsers show with their focus ring.
   */
  keyboard?: boolean | undefined;
  /**
   * The name assistive technology reads for an expander when `keyboard` is
   * on. Default: `Parents` for the two parent slots, `Children` for
   * `children`.
   */
  expanderLabel?: ((info: ExpanderLabelInfo) => string) | undefined;
  /**
   * Called when an element is clicked that the node plug-in has marked for a
   * person (`DrawHelpers.markPerson`).
   */
  onPersonClick?: ((info: ClickInfo) => void) | undefined;
  /**
   * Called when an element is clicked that the node plug-in has marked for a
   * family (`DrawHelpers.markFamily`).
   */
  onFamilyClick?: ((info: ClickInfo) => void) | undefined;
  /**
   * Called when a [+] / [-] expander is clicked. The chart folds nothing by
   * itself: add `expanderKey(nodeId, slot)` to `ViewState.collapsed` or
   * remove it there, and call `update`.
   */
  onExpanderClick?: ((info: ExpanderClickInfo) => void) | undefined;
  /**
   * Called every time the chart has been laid out and drawn: after `update`,
   * after a config change, and when the chart remeasures itself because its
   * fonts have loaded. `animated` tells whether the chart is moving to the
   * new layout or shows it at once.
   */
  onLayout?:
    | ((layout: LayoutResult, info: { animated: boolean }) => void)
    | undefined;
}

export interface LayoutNode {
  id: string;
  generation: number;
  isRoot: boolean;
  indiId?: string | undefined;
  spouseId?: string | undefined;
  familyId?: string | undefined;
  /** Screen position of the node's (0, 0) seam origin prior to root origin translation. */
  x: number;
  y: number;
  /** Projected screen bounding box relative to (x, y). */
  bounds: BoundingBox;
  extents: BoxExtents;
  anchors: Record<Slot, Point>;
  expanderAnchors: Record<Slot, Point>;
  expanders: Partial<Record<Slot, ExpanderState>>;
  regions: Region[];
}

export interface LayoutLink {
  /**
   * Identifies the link among the links of its layout, and the same link in
   * the next layout. Use it as a key; its text has no meaning.
   */
  id: string;
  kind: 'parentChild' | 'additionalMarriage';
  fromNodeId: string;
  fromSlot: Slot;
  toNodeId: string;
  toSlot: Slot;
  childIndiId?: string | undefined;
  hopOffset?: number | undefined;
}

export interface LayoutResult {
  direction: Direction;
  /** Width and height of the chart with its margin; [0, 0] if it is empty. */
  size: [number, number];
  /**
   * Where the (0, 0) of the node coordinates lies inside `size`: the place
   * of the start node, seen from the top left corner of the chart. Add it to
   * `LayoutNode.x` / `y` to get a position in the chart, e.g. to scroll the
   * start person into view.
   */
  origin: [number, number];
  nodes: LayoutNode[];
  links: LayoutLink[];
  /**
   * What was wrong with the data, each problem once (see `Problem`): a
   * start person that does not exist, references to missing people and
   * families, cycles. The chart is drawn without what could not be used.
   */
  problems: Problem[];
}

/** What a chart returns when it has drawn itself. */
export interface ChartUpdateResult {
  layout: LayoutResult;
  /** Resolves when the animation of this drawing has ended. */
  finished: Promise<void>;
}

/** Options for one drawing of a chart. */
export interface ChartUpdateOptions {
  /**
   * Whether this drawing is animated. Default: `ChartConfig.animate`. Whether
   * a change glides or jumps often depends on the change (a new start
   * person glides, new data jumps), not on the chart. The first drawing of a
   * chart is never animated.
   */
  animate?: boolean | undefined;
}

export interface Chart<TTheme extends CoreTheme = CoreTheme> {
  /**
   * Lays out and draws the chart for the view state. A chart with
   * `ChartConfig.animate` moves there from what it shows; the first drawing is
   * not animated. An update during an animation cuts it short and goes on from
   * where things are.
   *
   * Returns the layout and `finished`, which resolves when the animation has
   * ended. A disposed chart returns an empty layout.
   *
   * The chart draws a node again when its people, its generation, the
   * `graph` object or the look have changed. It does not look into the
   * records: after an edit of the data, pass a new graph with a new node
   * plug-in and new schemes (`setConfig` or `patchConfig`); after an edit
   * that leaves the families as they are (a name, a date), `remeasure()`
   * also draws everything again.
   */
  update(viewState: ViewState, options?: ChartUpdateOptions): ChartUpdateResult;
  /**
   * Changes parts of the config and draws the chart again, with the given
   * view state or else the last one. Fields that are not mentioned keep their
   * value; a field that is mentioned is replaced as a whole (`theme` is not
   * merged with the theme before), and one that is mentioned as `undefined`
   * goes back to its default.
   *
   * Returns what `update` returns, or nothing if the chart was not drawn
   * (no view state yet, or a change that does not show, like `animate`).
   */
  patchConfig(
    patch: Partial<ChartConfig<TTheme>>,
    viewState?: ViewState,
    options?: ChartUpdateOptions,
  ): ChartUpdateResult | undefined;
  /**
   * Replaces the whole config and draws the chart again, with the given view
   * state or else the last one. Fields that are not mentioned go back to
   * their defaults.
   *
   * Returns what `update` returns, or nothing if there is no view state yet.
   */
  setConfig(
    config: ChartConfig<TTheme>,
    viewState?: ViewState,
    options?: ChartUpdateOptions,
  ): ChartUpdateResult | undefined;
  /**
   * Measures all text again and draws every node again, at once, without
   * animation. The chart does this by itself when the fonts of its theme
   * have loaded. It also shows records that were edited in place (see
   * `update`).
   */
  remeasure(): void;
  /**
   * Stops the animations and removes the elements of the chart from the SVG.
   * After that the methods of the chart do nothing.
   */
  dispose(): void;
}

export interface CreateChartOptions<TTheme extends CoreTheme = CoreTheme> {
  /** The `<svg>` or `<g>` element to draw into, or a selector for it. */
  svg: SVGSVGElement | SVGGElement | string;
  config: ChartConfig<TTheme>;
  /**
   * Names the chart in its class (`topola-<scopeId>`), in the class of its
   * stylesheet and in the ids it creates (clip paths, gradients). Default:
   * a number that is unique in the document, starting at 1 on every page.
   *
   * Give charts that are exported an id that is unique beyond the page (a
   * UUID, a hash of the data): two SVGs saved from different page loads are
   * otherwise both `topola-1`, and style each other when a page embeds both
   * inline. Characters other than letters, digits, `_` and `-` are dropped.
   * The host keeps the ids of the charts of one document apart.
   */
  scopeId?: string | undefined;
}
