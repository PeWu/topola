import { generationColorIndex } from '../src/node-renderer';

describe('generationColorIndex', () => {
  it('matches the original palette for nearby generations', () => {
    expect(generationColorIndex(0)).toEqual(0);
    expect(generationColorIndex(1)).toEqual(1);
    expect(generationColorIndex(11)).toEqual(11);
    expect(generationColorIndex(-1)).toEqual(11);
    expect(generationColorIndex(-11)).toEqual(1);
  });

  it('keeps cycling for distant generations', () => {
    expect(generationColorIndex(12)).toEqual(0);
    expect(generationColorIndex(13)).toEqual(1);
    expect(generationColorIndex(-12)).toEqual(0);
    expect(generationColorIndex(-13)).toEqual(11);
    expect(generationColorIndex(-25)).toEqual(11);
  });
});
