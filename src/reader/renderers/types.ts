import type { ComponentType } from 'react';

import type { AppSettings, Book } from '@/db/types';
import type { Locator } from '@/reader/locator';
import type { ReaderTheme } from '@/theme/reader-themes';

export interface ReaderRendererProps {
  readonly book: Book;
  /** Where to open. Read once at mount; the renderer owns the position after that. */
  readonly initialLocator: Locator;
  /** Global settings with this book's overrides already applied. */
  readonly settings: AppSettings;
  readonly theme: ReaderTheme;
  /**
   * Reports a new reading position and progress (0–1). Takes a typed `Locator`, not a
   * serialized string, so a renderer never needs to know the storage format.
   */
  readonly onPosition: (locator: Locator, progress: number) => void;
}

export type ReaderRenderer = ComponentType<ReaderRendererProps>;
