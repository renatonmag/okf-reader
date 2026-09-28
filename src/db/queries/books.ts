import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { books, readingState } from '@/db/schema';
import type { LibraryEntry, NewBook } from '@/db/types';

export type LibrarySort = 'recent' | 'added' | 'title' | 'author';

/**
 * Query for the library list. Returned rather than awaited so screens can pass
 * it to `useLiveQuery` and re-render on import without manual invalidation.
 */
export function libraryQuery(sort: LibrarySort = 'recent') {
  const query = db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      coverPath: books.coverPath,
      filePath: books.filePath,
      format: books.format,
      contentHash: books.contentHash,
      fileSize: books.fileSize,
      addedAt: books.addedAt,
      lastOpenedAt: books.lastOpenedAt,
      progress: sql<number>`coalesce(${readingState.progress}, 0)`.as('progress'),
    })
    .from(books)
    .leftJoin(readingState, eq(readingState.bookId, books.id));

  switch (sort) {
    case 'title':
      return query.orderBy(books.title);
    case 'author':
      return query.orderBy(books.author);
    case 'added':
      return query.orderBy(desc(books.addedAt));
    case 'recent':
      return query.orderBy(desc(books.lastOpenedAt), desc(books.addedAt));
  }
}

export async function listBooks(sort: LibrarySort = 'recent'): Promise<LibraryEntry[]> {
  return libraryQuery(sort);
}

export async function getBook(id: string) {
  const [book] = await db.select().from(books).where(eq(books.id, id)).limit(1);
  return book ?? null;
}

/** Used by the import flow to recognise a book the library already has. */
export async function findBookByHash(contentHash: string) {
  const [book] = await db.select().from(books).where(eq(books.contentHash, contentHash)).limit(1);
  return book ?? null;
}

export async function insertBook(book: NewBook) {
  const [inserted] = await db.insert(books).values(book).returning();
  return inserted;
}

export async function touchBook(id: string) {
  await db
    .update(books)
    .set({ lastOpenedAt: Math.floor(Date.now() / 1000) })
    .where(eq(books.id, id));
}

/** Cascades to reading state, annotations and per-book settings. */
export async function deleteBook(id: string) {
  await db.delete(books).where(eq(books.id, id));
}
