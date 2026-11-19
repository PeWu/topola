import type {
  BoundingBox,
  BoxExtents,
  Direction,
  Point,
  Region,
} from './types.js';

export interface AbstractSize {
  along: number;
  across: number;
}

export interface AbstractPoint {
  along: number;
  across: number;
}

function cleanZero(n: number): number {
  return Object.is(n, -0) ? 0 : n;
}

/**
 * Whether the generations follow each other horizontally (`right` or `left`).
 */
export function isHorizontalDirection(direction: Direction): boolean {
  return direction === 'right' || direction === 'left';
}

/**
 * The sign of the screen axis on which the descendants follow: 1 for `down` and
 * `right`, -1 for `up` and `left`.
 */
export function getAlongSign(direction: Direction): 1 | -1 {
  return direction === 'up' || direction === 'left' ? -1 : 1;
}

/**
 * Converts positive screen dimensions (width, height) into abstract
 * (along, across) spans for the given growth direction.
 */
export function screenSizeToAbstract(
  width: number,
  height: number,
  direction: Direction,
): AbstractSize {
  if (isHorizontalDirection(direction)) {
    return { along: width, across: height };
  }
  return { along: height, across: width };
}

/**
 * Projects an abstract (along, across) point into screen (x, y) coordinates.
 */
export function projectPoint(pt: AbstractPoint, direction: Direction): Point {
  const sign = getAlongSign(direction);
  if (isHorizontalDirection(direction)) {
    return {
      x: cleanZero(pt.along * sign),
      y: cleanZero(pt.across),
    };
  }
  return {
    x: cleanZero(pt.across),
    y: cleanZero(pt.along * sign),
  };
}

/**
 * Projects an abstract signed interval [alongMin, alongMax] x [acrossMin, acrossMax]
 * into a positive-width, positive-height screen BoundingBox.
 * When alongSign === -1 ('up' or 'left'), [a, b] maps to [-b, -a].
 */
export function projectIntervals(
  alongMin: number,
  alongMax: number,
  acrossMin: number,
  acrossMax: number,
  direction: Direction,
): BoundingBox {
  const sign = getAlongSign(direction);
  const projAlongMin = sign === 1 ? alongMin : -alongMax;
  const projAlongMax = sign === 1 ? alongMax : -alongMin;
  const alongSpan = Math.max(0, projAlongMax - projAlongMin);
  const acrossSpan = Math.max(0, acrossMax - acrossMin);

  if (isHorizontalDirection(direction)) {
    return {
      x: cleanZero(projAlongMin),
      y: cleanZero(acrossMin),
      width: cleanZero(alongSpan),
      height: cleanZero(acrossSpan),
    };
  }
  return {
    x: cleanZero(acrossMin),
    y: cleanZero(projAlongMin),
    width: cleanZero(acrossSpan),
    height: cleanZero(alongSpan),
  };
}

/**
 * Projects BoxExtents around seam (0, 0) into a screen BoundingBox.
 */
export function projectExtents(
  extents: BoxExtents,
  direction: Direction,
): BoundingBox {
  return projectIntervals(
    -extents.alongBefore,
    extents.alongAfter,
    -extents.acrossBefore,
    extents.acrossAfter,
    direction,
  );
}

/**
 * Projects a Region defined in abstract space (x = acrossMin, y = alongMin,
 * width = acrossSpan, height = alongSpan) into positive screen coordinates.
 */
export function projectRegion(region: Region, direction: Direction): Region {
  const box = projectIntervals(
    region.y,
    region.y + region.height,
    region.x,
    region.x + region.width,
    direction,
  );
  return {
    kind: region.kind,
    id: region.id,
    ...box,
  };
}
