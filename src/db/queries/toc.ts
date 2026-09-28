import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { bookToc } from '@/db/schema';
import type { TocEntry } from '@/formats/types';

/**
 * Bump when `TocEntry`'s shape changes. A row written by an older version is treated
 * as absent, so the reader re-harvests it instead of rendering something it
 * half-understands.
 */
export const TOC_CACHE_VERSION = 1;

/**
 * The cached outline, or null when there is none to read.
 *
 * Null and `[]` mean different things and the contents screen says so: null is "this
 * book has not been opened yet", `[]` is "this document genuinely has no outline".
 * Anything unreadable also reports null, because re-harvesting is always the recovery.
 */
export async function getCachedToc(bookId: string): Promise<readonly TocEntry[] | null> {
  const [row] = await db.select().from(bookToc).where(eq(bookToc.bookId, bookId)).limit(1);
  if (!row || row.version !== TOC_CACHE_VERSION) return null;

  try {
    const parsed: unknown = JSON.parse(row.entries);
    return Array.isArray(parsed) ? (parsed as TocEntry[]) : null;
  } catch {
    return null;
  }
}

/**
 * Caches a harvested outline. Writing the same outline again is a no-op: the reader
 * harvests on every open, `enableChangeListener` is on, and the library list runs off
 * `useLiveQuery` — so an unconditional write would invalidate it once per book open
 * for nothing.
 */
export async function saveToc(bookId: string, entries: readonly TocEntry[]): Promise<void> {
  const serialized = JSON.stringify(entries);

  const [existing] = await db.select().from(bookToc).where(eq(bookToc.bookId, bookId)).limit(1);
  if (existing?.version === TOC_CACHE_VERSION && existing.entries === serialized) return;

  await db
    .insert(bookToc)
    .values({ bookId, entries: serialized, version: TOC_CACHE_VERSION })
    .onConflictDoUpdate({
      target: bookToc.bookId,
      set: { entries: serialized, version: TOC_CACHE_VERSION },
    });
}
