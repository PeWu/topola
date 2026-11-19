import { describe, expect, it } from 'vitest';
import {
  getAlongSign,
  isHorizontalDirection,
  projectExtents,
  projectIntervals,
  projectPoint,
  projectRegion,
  screenSizeToAbstract,
} from '../../src/core/axes.js';
import type { BoxExtents, Region } from '../../src/core/index.js';

describe('axes geometry & directional projection', () => {
  const sampleExtents: BoxExtents = {
    alongBefore: 44, // upstream person box height (in 'down')
    alongAfter: 24, // downstream hanging marriage box
    acrossBefore: 70, // indi (left)
    acrossAfter: 80, // spouse (right)
  };

  it('reports alongSign and horizontal flags accurately', () => {
    expect(getAlongSign('down')).toBe(1);
    expect(getAlongSign('up')).toBe(-1);
    expect(getAlongSign('right')).toBe(1);
    expect(getAlongSign('left')).toBe(-1);

    expect(isHorizontalDirection('down')).toBe(false);
    expect(isHorizontalDirection('up')).toBe(false);
    expect(isHorizontalDirection('right')).toBe(true);
    expect(isHorizontalDirection('left')).toBe(true);
  });

  it('converts screen (width, height) to abstract (along, across)', () => {
    expect(screenSizeToAbstract(120, 44, 'down')).toEqual({
      along: 44,
      across: 120,
    });
    expect(screenSizeToAbstract(120, 44, 'up')).toEqual({
      along: 44,
      across: 120,
    });
    expect(screenSizeToAbstract(120, 44, 'right')).toEqual({
      along: 120,
      across: 44,
    });
    expect(screenSizeToAbstract(120, 44, 'left')).toEqual({
      along: 120,
      across: 44,
    });
  });

  it('projects BoxExtents with signed interval reversal ([a,b] -> [-b,-a]) in up/left', () => {
    // 'down': person [-44, 0], marriage [0, +24] -> y in [-44, +24], height 68
    expect(projectExtents(sampleExtents, 'down')).toEqual({
      x: -70,
      y: -44,
      width: 150,
      height: 68,
    });

    // 'up': marriage flips ABOVE seam (y in [-24, 0]), person BELOW seam (y in [0, +44])
    expect(projectExtents(sampleExtents, 'up')).toEqual({
      x: -70,
      y: -24,
      width: 150,
      height: 68,
    });

    // 'right': person [-44, 0] left of seam, marriage [0, +24] right of seam
    expect(projectExtents(sampleExtents, 'right')).toEqual({
      x: -44,
      y: -70,
      width: 68,
      height: 150,
    });

    // 'left': marriage flips LEFT of seam (x in [-24, 0]), person RIGHT of seam (x in [0, +44])
    expect(projectExtents(sampleExtents, 'left')).toEqual({
      x: -24,
      y: -70,
      width: 68,
      height: 150,
    });
  });

  it('flips marriage region onto the downstream side in all four directions', () => {
    const personRegion: Region = {
      kind: 'person',
      id: 'I1',
      x: -70,
      y: -44,
      width: 70,
      height: 44,
    };
    const marriageRegion: Region = {
      kind: 'family',
      id: 'F1',
      x: -30,
      y: 0,
      width: 60,
      height: 24,
    };

    expect(projectRegion(personRegion, 'down')).toEqual({
      kind: 'person',
      id: 'I1',
      x: -70,
      y: -44,
      width: 70,
      height: 44,
    });
    expect(projectRegion(marriageRegion, 'down')).toEqual({
      kind: 'family',
      id: 'F1',
      x: -30,
      y: 0,
      width: 60,
      height: 24,
    });

    // In 'up', person sits at y: [0, 44] and marriage sits above seam at y: [-24, 0]
    expect(projectRegion(personRegion, 'up')).toEqual({
      kind: 'person',
      id: 'I1',
      x: -70,
      y: 0,
      width: 70,
      height: 44,
    });
    expect(projectRegion(marriageRegion, 'up')).toEqual({
      kind: 'family',
      id: 'F1',
      x: -30,
      y: -24,
      width: 60,
      height: 24,
    });

    // In 'left', person sits at x: [0, 44] and marriage sits left of seam at x: [-24, 0]
    expect(projectRegion(personRegion, 'left')).toEqual({
      kind: 'person',
      id: 'I1',
      x: 0,
      y: -70,
      width: 44,
      height: 70,
    });
    expect(projectRegion(marriageRegion, 'left')).toEqual({
      kind: 'family',
      id: 'F1',
      x: -24,
      y: -30,
      width: 24,
      height: 60,
    });
  });

  it('projects points and intervals without negative zero artifacts', () => {
    expect(projectPoint({ along: 0, across: 0 }, 'up')).toEqual({ x: 0, y: 0 });
    expect(projectPoint({ along: 0, across: 0 }, 'left')).toEqual({ x: 0, y: 0 });
    expect(projectIntervals(0, 0, 0, 0, 'up')).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});
