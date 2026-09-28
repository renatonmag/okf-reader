/**
 * Reading-surface themes. Separate from the app chrome colours in
 * `@/constants/theme`: the chrome follows the OS light/dark setting, while the
 * page a book is rendered on is the reader's own choice and includes sepia.
 */

import { Appearance } from 'react-native';

export type ThemeName = 'light' | 'sepia' | 'dark' | 'system';
export type ResolvedThemeName = Exclude<ThemeName, 'system'>;

export interface ReaderTheme {
  /** The page. */
  readonly background: string;
  /** Body text. */
  readonly text: string;
  /** Headings, captions, page numbers. */
  readonly textSecondary: string;
  /** Rules and borders on the page. */
  readonly border: string;
  /** Default highlight colour, and the selection tint. */
  readonly accent: string;
  /** Whether the OS status bar should use light or dark content over this page. */
  readonly statusBarStyle: 'light' | 'dark';
}

export const READER_THEMES: Record<ResolvedThemeName, ReaderTheme> = {
  light: {
    background: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#60646c',
    border: '#e4e4e7',
    accent: '#f4d03f',
    statusBarStyle: 'dark',
  },
  sepia: {
    background: '#f4ecd8',
    text: '#3b2f1e',
    textSecondary: '#7a6a52',
    border: '#e0d4b8',
    accent: '#d9a441',
    statusBarStyle: 'dark',
  },
  dark: {
    background: '#121212',
    text: '#e6e6e6',
    textSecondary: '#9a9a9a',
    border: '#2a2a2a',
    accent: '#8a6d3b',
    statusBarStyle: 'light',
  },
};

/** Resolves `system` against the OS setting; every other value passes through. */
export function resolveThemeName(theme: ThemeName): ResolvedThemeName {
  if (theme !== 'system') return theme;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export function readerTheme(theme: ThemeName): ReaderTheme {
  return READER_THEMES[resolveThemeName(theme)];
}

export const FONT_SIZE_RANGE = { min: 12, max: 32, step: 1 } as const;
export const LINE_SPACING_RANGE = { min: 1.0, max: 2.4, step: 0.1 } as const;
export const MARGIN_RANGE = { min: 0, max: 64, step: 4 } as const;

export const FONT_FAMILIES = [
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans' },
  { id: 'mono', label: 'Mono' },
] as const;
