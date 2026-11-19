import type { CoreTheme, Layer, NodePlugin, StyleScheme } from './types.js';

/**
 * Escapes `</style` in CSS, so that the text cannot end the `<style>` element
 * it is put into.
 *
 * That is all it does. It is no protection for CSS from an untrusted source:
 * such CSS can still style the whole page and load URLs, and where markup is
 * put together from text by hand, other tags inside an SVG `<style>` are
 * still read as elements by an HTML parser. Theme values, palettes, box
 * namespaces and `overrideCss` are written into the stylesheet as they are;
 * pass only what the host itself wrote or checked.
 */
export function escapeStyleCloseTag(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}

export interface GenerateCssInput<TTheme extends CoreTheme = CoreTheme> {
  scopeSelector: string;
  theme: TTheme;
  nodePlugin: NodePlugin<TTheme>;
  layers: readonly Layer<TTheme>[];
  schemes: readonly StyleScheme[];
  hasPersonClick: boolean;
  hasFamilyClick: boolean;
  overrideCss?: string | undefined;
}

/**
 * Generates plain, shallow-specificity CSS scoped to `.topola-<instanceId>`
 * (<= 4 classes per selector, no CSS variables or @scope) so serialized SVGs
 * render identically in browsers, standalone exports, and jsPDF/canvg.
 */
export function generateChartCss<TTheme extends CoreTheme = CoreTheme>(
  input: GenerateCssInput<TTheme>,
): string {
  const {
    scopeSelector,
    theme,
    nodePlugin,
    layers,
    schemes,
    hasPersonClick,
    hasFamilyClick,
    overrideCss,
  } = input;

  const chunks: string[] = [
    `${scopeSelector} text { font-family: ${theme.fontFamily}; }`,
    `${scopeSelector} .link { fill: none; stroke: ${theme.linkColor}; stroke-width: ${theme.linkStrokeWidth}px; }`,
    `${scopeSelector} .additional-marriage { stroke-dasharray: ${theme.additionalMarriageDash}; }`,
    `${scopeSelector} .expander { fill: #ffffff; stroke: #000000; stroke-width: 2px; cursor: pointer; }`,
  ];

  if (hasPersonClick) {
    chunks.push(`${scopeSelector} .person-region { cursor: pointer; }`);
  }
  if (hasFamilyClick) {
    chunks.push(`${scopeSelector} .family-region { cursor: pointer; }`);
  }

  const pluginCss = nodePlugin.getCss?.(scopeSelector, theme, schemes);
  if (pluginCss) {
    chunks.push(pluginCss.trim());
  }

  for (const layer of layers) {
    const layerCss = layer.getCss?.(scopeSelector, theme);
    if (layerCss) {
      chunks.push(layerCss.trim());
    }
  }

  for (const scheme of schemes) {
    const schemeCss = scheme.getCss?.(scopeSelector);
    if (schemeCss) {
      chunks.push(schemeCss.trim());
    }
  }

  if (overrideCss && overrideCss.trim().length > 0) {
    chunks.push(overrideCss.trim().replaceAll('{scope}', scopeSelector));
  }

  return escapeStyleCloseTag(chunks.join('\n\n'));
}
