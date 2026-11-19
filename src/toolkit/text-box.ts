import type {
  AnimationHelpers,
  CoreTheme,
  FontSpec,
  Problem,
  StyleScheme,
  TextMeasurer,
} from '../core/index.js';
import { DEFAULT_CORE_THEME, toClassToken } from '../core/internal.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let nextClipCounter = 1;

export type ColorTarget = 'background' | 'frame' | 'name';

/**
 * Class names of the parts of a box: an opaque `underlay` that hides what is
 * behind the box, the `background` that carries the fill, the `frame` that
 * carries the border, and the `name` text.
 *
 * Style schemes address boxes through these names (e.g. `quayScheme` dashes
 * `.frame` and fades `.background`), so a custom box that uses them is styled
 * like the built-in ones.
 */
export const BOX_PART_CLASSES = {
  underlay: 'underlay',
  background: 'background',
  frame: 'frame',
  name: 'name',
} as const;

/**
 * Returns the CSS rules that apply the palettes of style schemes to a box,
 * according to the colour target: the soft `fill` tone for backgrounds, the
 * strong `accent` tone for frames and names.
 */
export function paletteCss(options: {
  /** What every rule starts with, e.g. `${scopeSelector} .my-box`. */
  prefix: string;
  schemes: readonly StyleScheme[];
  colorTarget: ColorTarget | undefined;
  /** Selectors of the parts to colour. Default to `BOX_PART_CLASSES`. */
  parts?: { background?: string; frame?: string; name?: string } | undefined;
}): string[] {
  const { prefix, schemes, parts } = options;
  const colorTarget = options.colorTarget ?? 'background';
  const part = parts?.[colorTarget] ?? `.${BOX_PART_CLASSES[colorTarget]}`;
  const rules: string[] = [];
  // <= 4 classes per selector for canvg compatibility
  for (const scheme of schemes) {
    if (!scheme.palette) continue;
    for (const [rawToken, twoTone] of Object.entries(scheme.palette)) {
      const token = toClassToken(rawToken);
      if (!token) continue;
      if (colorTarget === 'background') {
        rules.push(`${prefix} .${token} ${part} { fill: ${twoTone.fill}; }`);
      } else if (colorTarget === 'frame') {
        rules.push(
          `${prefix} .${token} ${part} { stroke: ${twoTone.accent}; }`,
        );
      } else {
        rules.push(`${prefix} .${token} ${part} { fill: ${twoTone.accent}; }`);
      }
    }
  }
  return rules;
}

export interface LineRoleSpec {
  fontSize: number;
  fontWeight?: string | number | undefined;
  fontStyle?: string | undefined;
  lineHeight: number;
  align?: 'start' | 'center' | 'end' | undefined;
  color?: string | undefined;
}

export interface TextBoxSpecificTheme {
  colorTarget?: ColorTarget | undefined;
  boxFill: string;
  boxStroke: string;
  boxStrokeWidth: number;
  underlayFill?: string | undefined;
  textColor: string;
  cornerRadius: number;
  minWidth: number;
  minHeight: number;
  padding: { top: number; right: number; bottom: number; left: number };
  symbolColumnWidth: number;
  badgeGap: number;
  imageWidth: number;
  imageMinHeight: number;
  roles: Readonly<Record<string, LineRoleSpec>>;
}

export type TextBoxTheme = CoreTheme & TextBoxSpecificTheme;

export interface TextLine {
  role: string;
  text: string;
}

export interface SymbolLine {
  role: string;
  symbol: string;
  text: string;
}

/**
 * A short text in a bottom corner of the box. A box has room for one badge
 * on each side: badges of the same side are drawn at the same place.
 */
export interface BadgeLine {
  role: string;
  position: 'left' | 'right';
  text: string;
}

export interface BoxContent {
  lines?: readonly TextLine[] | undefined;
  symbolLines?: readonly SymbolLine[] | undefined;
  badges?: readonly BadgeLine[] | undefined;
  imageUrl?: string | undefined;
}

export type ContentFunction<TContext> = (
  ctx: TContext,
) => BoxContent | null | undefined;

export interface BoxMeasureContext<TTheme extends CoreTheme = TextBoxTheme> {
  theme: TTheme;
  measurer: TextMeasurer;
  problems: Problem[];
}

export interface BoxDrawContext<TTheme extends CoreTheme = TextBoxTheme> {
  theme: TTheme;
  instanceScopeId?: string | undefined;
}

/** What `BoxPlugin.resizeBox` works with. */
export interface BoxResizeContext<TTheme extends CoreTheme = TextBoxTheme> {
  theme: TTheme;
  animation: AnimationHelpers;
}

/**
 * One SVG element of a box, described as a function of the size of the box.
 * A box drawn from such parts (`drawBoxParts`) can be resized without drawing
 * it again (`resizeBoxParts`), because it is known what depends on its size.
 */
export interface BoxPart {
  tag: string;
  /** Attributes that are the same at any size of the box. */
  fixed?: Readonly<Record<string, string | number>> | undefined;
  /** Attributes that depend on the size of the box. */
  sized?: Readonly<Record<string, string | number>> | undefined;
  text?: string | undefined;
  children?: readonly BoxPart[] | undefined;
}

/** Creates the SVG elements of the parts inside the group, in order. */
export function drawBoxParts(
  group: SVGElement,
  parts: readonly BoxPart[],
): void {
  for (const part of parts) {
    const element = group.ownerDocument.createElementNS(SVG_NS, part.tag);
    for (const attributes of [part.fixed, part.sized]) {
      for (const [name, value] of Object.entries(attributes ?? {})) {
        element.setAttribute(name, String(value));
      }
    }
    if (part.text !== undefined) {
      element.textContent = part.text;
    }
    drawBoxParts(element, part.children ?? []);
    group.appendChild(element);
  }
}

/**
 * Brings a group drawn by `drawBoxParts` to the size the given parts were
 * computed for, by moving the size-dependent attributes that differ. Returns
 * false, changing nothing, if the group does not consist of these parts.
 */
export function resizeBoxParts(
  group: SVGElement,
  parts: readonly BoxPart[],
  animation: AnimationHelpers,
): boolean {
  const matches = (element: Element, expected: readonly BoxPart[]): boolean =>
    element.children.length === expected.length &&
    expected.every((part, i) => {
      const child = element.children[i]!;
      return child.tagName === part.tag && matches(child, part.children ?? []);
    });
  if (!matches(group, parts)) {
    return false;
  }
  const resize = (element: Element, expected: readonly BoxPart[]): void => {
    expected.forEach((part, i) => {
      const child = element.children[i] as SVGElement;
      const changed = Object.entries(part.sized ?? {}).filter(
        ([name, value]) => child.getAttribute(name) !== String(value),
      );
      if (changed.length > 0) {
        animation.move(child, Object.fromEntries(changed));
      }
      resize(child, part.children ?? []);
    });
  };
  resize(group, parts);
  return true;
}

export interface BoxPlugin<TContext, TTheme extends CoreTheme = TextBoxTheme> {
  /**
   * The class of the element the boxes are drawn into, and the start of the
   * selectors of their CSS rules. A class name written by the host: it is
   * used as it is, in the class attribute and in the stylesheet.
   */
  readonly namespace: string;
  readonly defaultTheme: Partial<TTheme>;
  /**
   * Returns the CSS rules of the box. Boxes are drawn inside an element with
   * the class `namespace`. Start every selector with `scopeSelector`, so that
   * the rules stay inside this chart.
   *
   * A person box and a family box with the same namespace have the same
   * selectors: `createCoupleAssembler` writes a rule that both return once,
   * and a rule of the family box for a selector of the person box applies to
   * the person boxes too.
   */
  getCss(
    scopeSelector: string,
    theme: TTheme,
    schemes: readonly StyleScheme[],
  ): string;
  /**
   * Returns the size the box needs for the item, as on the screen. A family box
   * can return no size (0 x 0) to be left out.
   */
  measureBox(
    item: TContext,
    ctx: BoxMeasureContext<TTheme>,
  ): { width: number; height: number };
  /**
   * Draws the box of the item into the empty group, whose (0, 0) is the top
   * left corner of the box. The size can be larger than what `measureBox`
   * returned, because the boxes of a row are aligned.
   */
  drawBox(
    group: SVGGElement,
    item: TContext,
    width: number,
    height: number,
    ctx: BoxDrawContext<TTheme>,
  ): void;
  /**
   * Adapts a drawn box to a new size; its content is the same. Change the
   * geometry through `ctx.animation`. Without this method the box is drawn
   * again at once when its size changes.
   */
  resizeBox?(
    group: SVGGElement,
    item: TContext,
    width: number,
    height: number,
    ctx: BoxResizeContext<TTheme>,
  ): void;
}

const FALLBACK_ROLE: LineRoleSpec = {
  fontSize: 12,
  lineHeight: 14,
  align: 'start',
};

/**
 * Returns the URL, trimmed, if an image may be loaded from it: an `http(s):`,
 * `blob:` or `data:image/` URL, or one without a scheme. Returns nothing for
 * any other scheme (`javascript:`, `file:`, ...) and for an empty URL.
 */
export function isSafeImageUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  const url = rawUrl.trim();
  if (!url) return undefined;
  if (/^(https?:\/\/|blob:|data:image\/|\/\/)/i.test(url)) {
    return url;
  }
  // Reject any other explicit URI scheme (javascript:, vbscript:, data:text/html, file:, etc.)
  const firstSlashOrQuery = url.search(/[/?#]/);
  const colonIdx = url.indexOf(':');
  if (
    colonIdx !== -1 &&
    (firstSlashOrQuery === -1 || colonIdx < firstSlashOrQuery)
  ) {
    return undefined;
  }
  return url;
}

function resolveRole(
  roles: Readonly<Record<string, LineRoleSpec>>,
  roleName: string,
  problems?: Problem[],
  reportedRoles?: Set<string>,
): LineRoleSpec {
  const spec = Object.hasOwn(roles, roleName) ? roles[roleName] : undefined;
  if (spec) return spec;
  if (problems && reportedRoles && !reportedRoles.has(roleName)) {
    reportedRoles.add(roleName);
    problems.push({
      code: 'UNKNOWN_LINE_ROLE',
      message: `Unknown text box line role "${roleName}"; falling back to default typography.`,
      entityId: roleName,
    });
  }
  return FALLBACK_ROLE;
}

function toFontSpec(fontFamily: string, role: LineRoleSpec): FontSpec {
  return {
    fontFamily,
    fontSize: role.fontSize,
    ...(role.fontWeight != null ? { fontWeight: role.fontWeight } : {}),
    ...(role.fontStyle != null ? { fontStyle: role.fontStyle } : {}),
  };
}

function assignDefined<T extends object>(
  target: T,
  source: Partial<T> | undefined,
): T {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return target;
  }
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && key !== '__proto__') {
      (target as Record<string, unknown>)[key] = value;
    }
  }
  return target;
}

function resolveClipScopePrefix(
  group: Element,
  instanceScopeId: string | undefined,
): string {
  const cleanExplicit = (instanceScopeId ?? '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/^topola-/, '');
  if (cleanExplicit) {
    return `topola-${cleanExplicit}`;
  }
  // Start above the node group when inside a chart, so that a box namespace
  // starting with `topola-` cannot shadow the chart's own `topola-<id>` group.
  const nodeEl = group.closest('g.node');
  let cur: Element | null = nodeEl ? nodeEl.parentElement : group;
  while (cur) {
    const classes = (cur.getAttribute('class') ?? '').split(/\s+/);
    const match = classes.find((cls) => /^topola-[a-zA-Z0-9_-]+$/.test(cls));
    if (match) return match;
    cur = cur.parentElement;
  }
  return 'topola-local';
}

export interface CreateTextBoxOptions<
  TContext,
  TTheme extends TextBoxTheme = TextBoxTheme,
> {
  /** The class of the boxes, see `BoxPlugin.namespace`. */
  namespace: string;
  defaultTheme: TextBoxSpecificTheme;
  content: ContentFunction<TContext>;
  /** Set true if this box plugin draws marriage/family boxes (suppresses empty boxes). */
  suppressWhenEmpty?: boolean | undefined;
}

/**
 * Creates a box of text for `createCoupleAssembler`. The `content` function
 * returns what the box shows for an item: lines of text, lines with a symbol in
 * front (e.g. `*` for a birth), badges in the bottom corners, and a picture.
 *
 * The theme sets the look (`TextBoxSpecificTheme`), with the typography of
 * every line coming from its role. The box is as large as its content needs,
 * and changes size without being drawn again.
 */
export function createTextBox<
  TContext,
  TTheme extends TextBoxTheme = TextBoxTheme,
>(
  options: CreateTextBoxOptions<TContext, TTheme>,
): BoxPlugin<TContext, TTheme> {
  const {
    namespace,
    defaultTheme,
    content: contentFn,
    suppressWhenEmpty = false,
  } = options;

  const mergeBoxTheme = (theme: TTheme): TextBoxTheme => {
    const partial = theme as Partial<TextBoxTheme>;
    const merged = assignDefined(
      assignDefined(
        { ...DEFAULT_CORE_THEME } as TextBoxTheme,
        defaultTheme as Partial<TextBoxTheme>,
      ),
      partial,
    );
    const padding = assignDefined({ ...defaultTheme.padding }, partial.padding);
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      if (!Number.isFinite(padding[side])) {
        padding[side] = defaultTheme.padding[side];
      }
    }
    merged.padding = padding;
    const roles: Record<string, LineRoleSpec> = { ...defaultTheme.roles };
    if (
      partial?.roles &&
      typeof partial.roles === 'object' &&
      !Array.isArray(partial.roles)
    ) {
      for (const [key, rawSpec] of Object.entries(partial.roles)) {
        if (
          key === '__proto__' ||
          !rawSpec ||
          typeof rawSpec !== 'object' ||
          Array.isArray(rawSpec)
        ) {
          continue;
        }
        const base = Object.hasOwn(defaultTheme.roles, key)
          ? defaultTheme.roles[key]!
          : FALLBACK_ROLE;
        const fontSize =
          typeof rawSpec.fontSize === 'number' &&
          Number.isFinite(rawSpec.fontSize) &&
          rawSpec.fontSize > 0
            ? rawSpec.fontSize
            : base.fontSize;
        const lineHeight =
          typeof rawSpec.lineHeight === 'number' &&
          Number.isFinite(rawSpec.lineHeight) &&
          rawSpec.lineHeight >= 0
            ? rawSpec.lineHeight
            : base.lineHeight;
        roles[key] = {
          fontSize,
          lineHeight,
          ...(rawSpec.fontWeight != null
            ? { fontWeight: rawSpec.fontWeight }
            : {}),
          ...(rawSpec.fontStyle != null
            ? { fontStyle: rawSpec.fontStyle }
            : {}),
          ...(rawSpec.align != null ? { align: rawSpec.align } : {}),
          ...(rawSpec.color != null ? { color: rawSpec.color } : {}),
        };
      }
    }
    merged.roles = roles;
    for (const key of [
      'boxStrokeWidth',
      'cornerRadius',
      'minWidth',
      'minHeight',
      'imageWidth',
      'imageMinHeight',
    ] as const) {
      if (!Number.isFinite(merged[key]) || merged[key] < 0) {
        merged[key] = defaultTheme[key];
      }
    }
    for (const key of ['symbolColumnWidth', 'badgeGap'] as const) {
      if (!Number.isFinite(merged[key])) {
        merged[key] = defaultTheme[key];
      }
    }
    return merged;
  };

  /** The elements of the box as a function of its size. */
  const boxParts = (
    item: TContext,
    width: number,
    height: number,
    rawTheme: TTheme,
  ): BoxPart[] => {
    if (width <= 0 || height <= 0) return [];
    const t = mergeBoxTheme(rawTheme);
    const box = contentFn(item) ?? {};
    const lines = box.lines ?? [];
    const symbolLines = box.symbolLines ?? [];
    const activeBadges = (box.badges ?? []).filter((b) => b.text.length > 0);
    const safeImage = isSafeImageUrl(box.imageUrl);
    const hasImage = Boolean(safeImage && t.imageWidth > 0);
    const textAreaWidth = hasImage ? Math.max(0, width - t.imageWidth) : width;
    const corners =
      t.cornerRadius > 0 ? { rx: t.cornerRadius, ry: t.cornerRadius } : {};

    const parts: BoxPart[] = [];
    const rect = (cls: string): BoxPart => ({
      tag: 'rect',
      fixed: { class: cls, ...corners },
      sized: { width, height },
    });

    // 1. Opaque underlay rect (hides links behind faded/translucent boxes)
    parts.push(rect(BOX_PART_CLASSES.underlay));
    // 2. Stylable background rect
    parts.push(rect(BOX_PART_CLASSES.background));

    // 3. Text lines
    let cursorY = t.padding.top;
    for (const line of lines) {
      const spec = resolveRole(t.roles, line.role);
      const baselineY = cursorY + Math.round(spec.lineHeight * 0.78);
      cursorY += spec.lineHeight;
      if (!line.text) continue;

      const align = spec.align ?? 'start';
      const anchor: Record<string, string> = {};
      let tx = t.padding.left;
      if (align === 'center') {
        anchor['text-anchor'] = 'middle';
        tx = textAreaWidth / 2;
      } else if (align === 'end') {
        anchor['text-anchor'] = 'end';
        tx = textAreaWidth - t.padding.right;
      }
      parts.push({
        tag: 'text',
        fixed: { class: toClassToken(line.role) || 'text', ...anchor },
        sized: { transform: `translate(${tx}, ${baselineY})` },
        text: line.text,
      });
    }

    // 4. Symbol + detail lines (e.g. * birth, + death, ⚭ marriage)
    for (const sLine of symbolLines) {
      const spec = resolveRole(t.roles, sLine.role);
      const baselineY = cursorY + Math.round(spec.lineHeight * 0.78);
      cursorY += spec.lineHeight;
      const roleCls = toClassToken(sLine.role) || 'details';

      if (sLine.symbol) {
        const symX = t.padding.left + Math.round(t.symbolColumnWidth * 0.36);
        parts.push({
          tag: 'text',
          fixed: {
            class: roleCls,
            'text-anchor': 'middle',
            transform: `translate(${symX}, ${baselineY})`,
          },
          text: sLine.symbol,
        });
      }

      if (sLine.text) {
        const txtX = t.padding.left + t.symbolColumnWidth - 3;
        parts.push({
          tag: 'text',
          fixed: {
            class: roleCls,
            transform: `translate(${txtX}, ${baselineY})`,
          },
          text: sLine.text,
        });
      }
    }

    // 5. Bottom-corner badges (e.g. id on bottom-left, sex symbol on bottom-right)
    const badgeY = height - Math.max(4, t.padding.bottom - 1);
    for (const badge of activeBadges) {
      const cls = toClassToken(badge.role) || 'badge';
      if (badge.position === 'right') {
        const rx = textAreaWidth - Math.max(5, t.padding.right);
        parts.push({
          tag: 'text',
          fixed: { class: cls, 'text-anchor': 'end' },
          sized: { transform: `translate(${rx}, ${badgeY})` },
          text: badge.text,
        });
      } else {
        const lx = Math.max(8, t.padding.left + 4);
        parts.push({
          tag: 'text',
          fixed: { class: cls },
          sized: { transform: `translate(${lx}, ${badgeY})` },
          text: badge.text,
        });
      }
    }

    // 6. Right-aligned portrait image, clipped to the box
    if (hasImage && safeImage) {
      parts.push({
        tag: 'clipPath',
        children: [
          {
            tag: 'rect',
            fixed: { y: 0, ...corners },
            sized: { x: -textAreaWidth, width, height },
          },
        ],
      });
      parts.push({
        tag: 'image',
        fixed: {
          class: 'image',
          width: t.imageWidth,
          preserveAspectRatio: 'xMidYMin slice',
          href: safeImage,
        },
        sized: { height, transform: `translate(${textAreaWidth}, 0)` },
      });
    }

    // 7. Border frame on top
    parts.push(rect(BOX_PART_CLASSES.frame));
    return parts;
  };

  const drawBox = (
    group: SVGGElement,
    item: TContext,
    width: number,
    height: number,
    ctx: BoxDrawContext<TTheme>,
  ): void => {
    drawBoxParts(group, boxParts(item, width, height, ctx.theme));

    // The portrait is clipped by a <clipPath> with an id of its own.
    const children = Array.from(group.children);
    const clipPath = children.find((child) => child.tagName === 'clipPath');
    const image = children.find((child) => child.tagName === 'image');
    if (clipPath && image) {
      const rootCls = resolveClipScopePrefix(group, ctx.instanceScopeId);
      const clipId = `${rootCls}-clip-${nextClipCounter++}`;
      clipPath.setAttribute('id', clipId);
      image.setAttribute('clip-path', `url(#${clipId})`);
    }
  };

  return {
    namespace,
    defaultTheme: defaultTheme as unknown as Partial<TTheme>,

    getCss(
      scopeSelector: string,
      rawTheme: TTheme,
      schemes: readonly StyleScheme[],
    ): string {
      const t = mergeBoxTheme(rawTheme);
      const ns = `.${namespace}`;
      const underlayFill = t.underlayFill ?? '#ffffff';

      // The font size is that of lines whose role the theme does not have;
      // the rules of the roles override it.
      const rules: string[] = [
        `${scopeSelector} ${ns} text { font-family: ${t.fontFamily}; font-size: ${FALLBACK_ROLE.fontSize}px; fill: ${t.textColor}; }`,
        `${scopeSelector} ${ns} .underlay { fill: ${underlayFill}; stroke: none; }`,
        `${scopeSelector} ${ns} .background { fill: ${t.boxFill}; stroke: none; }`,
        `${scopeSelector} ${ns} .frame { fill: none; stroke: ${t.boxStroke}; stroke-width: ${t.boxStrokeWidth}px; }`,
      ];

      for (const [roleName, roleSpec] of Object.entries(t.roles)) {
        const cleanRole = toClassToken(roleName);
        if (!cleanRole) continue;
        const decls: string[] = [`font-size: ${roleSpec.fontSize}px;`];
        if (roleSpec.fontWeight != null) {
          decls.push(`font-weight: ${roleSpec.fontWeight};`);
        }
        if (roleSpec.fontStyle != null) {
          decls.push(`font-style: ${roleSpec.fontStyle};`);
        }
        if (roleSpec.color != null) {
          decls.push(`fill: ${roleSpec.color};`);
        }
        rules.push(
          `${scopeSelector} ${ns} .${cleanRole} { ${decls.join(' ')} }`,
        );
      }

      rules.push(
        ...paletteCss({
          prefix: `${scopeSelector} ${ns}`,
          schemes,
          colorTarget: t.colorTarget,
        }),
      );

      return rules.join('\n');
    },

    measureBox(
      item: TContext,
      ctx: BoxMeasureContext<TTheme>,
    ): { width: number; height: number } {
      const t = mergeBoxTheme(ctx.theme);
      const box = contentFn(item);
      if (!box) {
        return suppressWhenEmpty
          ? { width: 0, height: 0 }
          : { width: t.minWidth, height: t.minHeight };
      }

      const lines = box.lines ?? [];
      const symbolLines = box.symbolLines ?? [];
      const activeBadges = (box.badges ?? []).filter((b) => b.text.length > 0);
      const safeImage = isSafeImageUrl(box.imageUrl);

      // Lines without text show nothing.
      if (
        suppressWhenEmpty &&
        !lines.some((line) => line.text) &&
        !symbolLines.some((line) => line.symbol || line.text) &&
        activeBadges.length === 0 &&
        !safeImage
      ) {
        return { width: 0, height: 0 };
      }

      const reportedRoles = new Set<string>();
      const hPad = t.padding.left + t.padding.right;

      let maxTextWidth = 0;
      let totalLinesHeight = 0;

      for (const line of lines) {
        const spec = resolveRole(
          t.roles,
          line.role,
          ctx.problems,
          reportedRoles,
        );
        const w =
          (line.text
            ? ctx.measurer.measureWidth(
                line.text,
                toFontSpec(t.fontFamily, spec),
              )
            : 0) + hPad;
        if (w > maxTextWidth) maxTextWidth = w;
        totalLinesHeight += spec.lineHeight;
      }

      for (const sLine of symbolLines) {
        const spec = resolveRole(
          t.roles,
          sLine.role,
          ctx.problems,
          reportedRoles,
        );
        const w =
          (sLine.text
            ? ctx.measurer.measureWidth(
                sLine.text,
                toFontSpec(t.fontFamily, spec),
              )
            : 0) +
          t.padding.left +
          t.symbolColumnWidth +
          t.padding.right;
        if (w > maxTextWidth) maxTextWidth = w;
        totalLinesHeight += spec.lineHeight;
      }

      if (activeBadges.length > 0) {
        let leftW = 0;
        let rightW = 0;
        let badgeRowH = 0;
        for (const badge of activeBadges) {
          const spec = resolveRole(
            t.roles,
            badge.role,
            ctx.problems,
            reportedRoles,
          );
          const bw = ctx.measurer.measureWidth(
            badge.text,
            toFontSpec(t.fontFamily, spec),
          );
          if (badge.position === 'left') {
            leftW += bw;
          } else {
            rightW += bw;
          }
          if (spec.lineHeight > badgeRowH) badgeRowH = spec.lineHeight;
        }
        const badgeOuterPad =
          Math.max(8, t.padding.left + 4) + Math.max(5, t.padding.right);
        // The gap follows a left badge, also when no right badge comes
        // after it.
        const badgeW =
          leftW + rightW + (leftW > 0 ? t.badgeGap : 0) + badgeOuterPad;
        if (badgeW > maxTextWidth) maxTextWidth = badgeW;
        totalLinesHeight += badgeRowH;
      }

      const textColWidth = Math.max(t.minWidth, maxTextWidth);
      const textColHeight = Math.max(
        t.minHeight,
        t.padding.top + totalLinesHeight + t.padding.bottom,
      );

      if (safeImage && t.imageWidth > 0) {
        return {
          width: textColWidth + t.imageWidth,
          height: Math.max(textColHeight, t.imageMinHeight),
        };
      }

      return { width: textColWidth, height: textColHeight };
    },

    drawBox,

    resizeBox(
      group: SVGGElement,
      item: TContext,
      width: number,
      height: number,
      ctx: BoxResizeContext<TTheme>,
    ): void {
      const parts = boxParts(item, width, height, ctx.theme);
      if (!resizeBoxParts(group, parts, ctx.animation)) {
        // Not what this box has drawn (e.g. drawn at no size): start over.
        while (group.firstChild) {
          group.removeChild(group.firstChild);
        }
        drawBox(group, item, width, height, { theme: ctx.theme });
      }
    },
  };
}
