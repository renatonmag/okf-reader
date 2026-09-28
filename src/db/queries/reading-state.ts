import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { readingState } from '@/db/schema';

export async function getReadingState(bookId: string) {
  const [state] = await db
    .select()
    .from(readingState)
    .where(eq(readingState.bookId, bookId))
    .limit(1);
  return state ?? null;
}

/**
 * Save the reading position. Called on a debounce while reading and flushed when
 * the app backgrounds, so being killed never costs more than the last few seconds.
 *
 * `locator` is always the format-stable form (EPUB CFI, PDF `page#offset`), never
 * a scroll offset — a position has to survive a font-size change.
 */
export async function saveReadingState(bookId: string, locator: string, progress: number) {
  const updatedAt = Math.floor(Date.now() / 1000);
  await db
    .insert(readingState)
    .values({ bookId, locator, progress, updatedAt })
    .onConflictDoUpdate({
      target: readingState.bookId,
      set: { locator, progress, updatedAt },
    });
}
