/**
 * Recolouring a fixed-layout page.
 *
 * A PDF cannot be restyled the way reflowable text can, so sepia and dark are a filter
 * over the rendered page rather than a change of text colour. Kept as pure functions
 * so they can be tested without mocking `Platform`.
 */

import type { ViewStyle } from 'react-native';

import type { ResolvedThemeName } from '@/theme/reader-themes';

/**
 * Whether the platform can composite a colour filter over the native PDF view.
 *
 * React Native implements `filter` with Android's `RenderEffect`, which is API 31+.
 * Below that the page renders untinted — the reader still themes its own chrome and
 * the gutters around the page, and the display sheet says so rather than leaving the
 * control looking broken.
 */
export function supportsPageFilter(os: string, version: string | number): boolean {
  if (os === 'ios') return true;
  if (os === 'android') return Number(version) >= 31;
  return false;
}

/**
 * The filter for a theme, or undefined to leave the page alone.
 *
 * Dark inverts and then rotates the hue back, so photographs and coloured diagrams
 * stay recognisable instead of turning into negatives.
 */
export function pageFilter(theme: ResolvedThemeName): ViewStyle['filter'] | undefined {
  switch (theme) {
    case 'light':
      return undefined;
    case 'sepia':
      return [{ sepia: 0.4 }, { brightness: 0.97 }];
    case 'dark':
      return [{ invert: 1 }, { hueRotate: '180deg' }, { brightness: 0.92 }];
  }
}
