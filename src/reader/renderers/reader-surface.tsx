/**
 * Which component draws which format — the reading-side twin of
 * `src/formats/registry.ts`, which handles the import side. Adding a format means one
 * more case here and one more renderer file, not changes spread through the reader.
 *
 * A switch returning literal JSX rather than a `Record<BookFormat, Component>` lookup:
 * the React Compiler's lint rules reject binding a component to a local during render,
 * and the exhaustive switch gives the same compile-time guarantee that a new format
 * cannot be forgotten.
 *
 * Imported only by the reader screen. Keeping it out of `formats/` and `import/` is
 * what stops a native renderer from being pulled into the import path or a unit test.
 */

import type { ReactNode } from 'react';

import { PdfRenderer } from '@/reader/renderers/pdf-renderer';
import type { ReaderRendererProps } from '@/reader/renderers/types';

interface ReaderSurfaceProps extends ReaderRendererProps {
  /** Shown for a format whose renderer is not written yet. */
  readonly fallback: ReactNode;
}

export function ReaderSurface({ fallback, ...props }: ReaderSurfaceProps) {
  switch (props.book.format) {
    case 'pdf':
      return <PdfRenderer {...props} />;
    case 'epub':
    case 'mobi':
    case 'article':
      return fallback;
  }
}
