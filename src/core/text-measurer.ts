import type { FontSpec, TextMeasurer } from './types.js';

/**
 * How many widths a canvas measurer remembers. More than one layout of a
 * very large chart needs (30,000 nodes of the Detailed preset have about
 * 42,000 different strings): a cache that is smaller than one layout loses
 * its entries during every layout and saves nothing.
 */
const MAX_CACHE_ENTRIES = 200_000;

function toCssFontString(font: FontSpec): string {
  const style = font.fontStyle ?? 'normal';
  const weight = font.fontWeight ?? 'normal';
  return `${style} ${weight} ${font.fontSize}px ${font.fontFamily}`;
}

/**
 * Deterministic browser-free text measurer for unit tests and SSR environments.
 */
export function createFixedTextMeasurer(charWidthFactor = 0.6): TextMeasurer {
  return {
    measureWidth(text: string, font: FontSpec): number {
      if (!text) return 0;
      const weightMultiplier =
        font.fontWeight === 'bold' ||
        (typeof font.fontWeight === 'number' && font.fontWeight >= 600)
          ? 1.05
          : 1;
      return Math.ceil(
        Array.from(text).length *
          font.fontSize *
          charWidthFactor *
          weightMultiplier,
      );
    },
  };
}

/** What a measurer without a canvas answers. */
const fallbackMeasurer = createFixedTextMeasurer();

/**
 * Measures text widths via an offscreen 2D Canvas without touching or reflowing
 * the live SVG DOM. Falls back deterministically when Canvas 2D is unavailable
 * (e.g. jsdom), and avoids caching pre-load fallback font metrics while
 * `document.fonts.check(...) === false`.
 *
 * `doc` is the document whose fonts the text is drawn with: the global one
 * by default, the document of the chart for a chart in an iframe or pop-up.
 */
export function createCanvasTextMeasurer(
  doc: Document | undefined = typeof document === 'undefined'
    ? undefined
    : document,
): TextMeasurer {
  const cache = new Map<string, number>();
  let ctx2d: CanvasRenderingContext2D | null | undefined;

  const getContext = (): CanvasRenderingContext2D | null => {
    if (ctx2d !== undefined) return ctx2d;
    if (!doc) {
      ctx2d = null;
      return null;
    }
    try {
      const canvas = doc.createElement('canvas');
      ctx2d = canvas.getContext('2d');
    } catch {
      ctx2d = null;
    }
    return ctx2d;
  };

  return {
    measureWidth(text: string, font: FontSpec): number {
      if (!text) return 0;
      const cssFont = toCssFontString(font);
      const cacheKey = `${cssFont}\0${text}`;
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      const ctx = getContext();
      if (!ctx) {
        return fallbackMeasurer.measureWidth(text, font);
      }

      ctx.font = cssFont;
      const metrics = ctx.measureText(text);
      const bboxSpan =
        typeof metrics.actualBoundingBoxLeft === 'number' &&
        typeof metrics.actualBoundingBoxRight === 'number'
          ? metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
          : 0;
      const width = Math.ceil(Math.max(metrics.width, bboxSpan));

      // Only cache when web fonts are confirmed ready (or FontLoading API absent)
      let fontReady = true;
      if (doc?.fonts?.check) {
        try {
          fontReady = doc.fonts.check(cssFont, text);
        } catch {
          fontReady = true;
        }
      }

      if (fontReady) {
        if (cache.size >= MAX_CACHE_ENTRIES) {
          // Forget the oldest width (a Map keeps the order of insertion).
          const oldest = cache.keys().next();
          if (!oldest.done) cache.delete(oldest.value);
        }
        cache.set(cacheKey, width);
      }

      return width;
    },
    invalidate(): void {
      cache.clear();
    },
  };
}
