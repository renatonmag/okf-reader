/**
 * Turns react-native-pdf's `onLoadComplete` table of contents into `TocEntry[]`.
 *
 * Deliberately takes `unknown`: this data crosses the native bridge, and the library's
 * own type declaration is wrong about it. `pageIdx` is a `number` on Android (a pdfium
 * bookmark index) but a `string` on iOS (formatted from `indexForPage:`), and
 * `mNativePtr` is a real pointer on Android and `""` on iOS. Typing it honestly and
 * narrowing here is what keeps `react-native-pdf` out of this file entirely — including
 * out of its type imports — so it stays unit-testable without a native mock.
 *
 * Nothing in here throws. A malformed outline should cost the contents list, never the
 * reader.
 */

import type { TocEntry } from '@/formats/types';
import { serializeLocator } from '@/reader/locator';

/** Outlines nest a few levels; anything deeper is a cycle or a generator gone wrong. */
const MAX_DEPTH = 8;

/** Caps the cached JSON blob. Real outlines are tens to hundreds of entries. */
const MAX_ENTRIES = 5000;

export function normalizeOutline(raw: unknown, pageCount: number): TocEntry[] {
  if (!Array.isArray(raw)) return [];

  const lastPage = Math.max(Math.trunc(pageCount) || 1, 1);
  let budget = MAX_ENTRIES;

  function walk(nodes: readonly unknown[], depth: number): TocEntry[] {
    if (depth >= MAX_DEPTH) return [];

    const entries: TocEntry[] = [];
    for (const node of nodes) {
      if (budget <= 0) break;
      if (typeof node !== 'object' || node === null) continue;
      budget -= 1;

      const { title, pageIdx, children } = node as Record<string, unknown>;

      // pdfium and PDFKit both index pages from 0; Locator and <Pdf>'s page prop
      // are 1-based. iOS has no nil-destination guard, so clamp rather than trust.
      const parsed = Number(pageIdx);
      const page = Number.isFinite(parsed)
        ? Math.min(Math.max(Math.trunc(parsed) + 1, 1), lastPage)
        : 1;

      // Only a string is a title. This is bridge data typed `unknown`, and passing an
      // object through String() would label the entry '[object Object]'; falling through
      // to the `Page N` default below is the honest rendering of an unusable title.
      const label = typeof title === 'string' ? title.trim() : '';

      entries.push({
        // A blank entry is kept, not dropped: dropping it would take its children's
        // nesting with it. Real outlines do contain untitled structural nodes.
        label: label || `Page ${page}`,
        locator: serializeLocator({ scheme: 'pdf', page, offset: 0 }),
        children: Array.isArray(children) ? walk(children, depth + 1) : [],
      });
    }
    return entries;
  }

  return walk(raw, 0);
}
