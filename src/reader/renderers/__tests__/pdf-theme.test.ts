import { pageFilter, supportsPageFilter } from '@/reader/renderers/pdf-theme';

describe('supportsPageFilter', () => {
  it('is true on iOS, where CALayer filters are always available', () => {
    expect(supportsPageFilter('ios', '18.0')).toBe(true);
  });

  it('needs Android 12, where RenderEffect was introduced', () => {
    expect(supportsPageFilter('android', 30)).toBe(false);
    expect(supportsPageFilter('android', 31)).toBe(true);
    expect(supportsPageFilter('android', 35)).toBe(true);
  });

  it('accepts the API level as a string', () => {
    expect(supportsPageFilter('android', '30')).toBe(false);
    expect(supportsPageFilter('android', '34')).toBe(true);
  });

  it('assumes no filter on a platform it does not know', () => {
    expect(supportsPageFilter('web', 1)).toBe(false);
    expect(supportsPageFilter('windows', 10)).toBe(false);
  });
});

describe('pageFilter', () => {
  it('leaves a light page alone', () => {
    expect(pageFilter('light')).toBeUndefined();
  });

  it('inverts for dark, and rotates the hue back so images stay recognisable', () => {
    expect(pageFilter('dark')).toEqual([
      { invert: 1 },
      { hueRotate: '180deg' },
      { brightness: 0.92 },
    ]);
  });

  it('warms the page for sepia without inverting it', () => {
    expect(pageFilter('sepia')).toEqual([{ sepia: 0.4 }, { brightness: 0.97 }]);
  });
});
