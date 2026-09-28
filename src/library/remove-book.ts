/**
 * Removing a book from the library: the row, then the bytes.
 *
 * The mirror of `import/import-book.ts`, and it lives outside `app/` for the same
 * reason — routes call this, they do not orchestrate it themselves.
 */

import { File } from 'expo-file-system';

import { deleteBook, getBook } from '@/db/queries/books';
import { deleteCoverFor } from '@/storage/paths';

/**
 * Deletes a book and everything derived from it. The row goes first: the foreign keys
 * cascade, so one delete clears the reading state, annotations, per-book settings and
 * the TOC cache. The files are cleaned up afterwards from the path captured before the
 * row went away, best effort — an orphan file on disk is a far better failure than a
 * book the user deleted still sitting in the library.
 */
export async function removeBook(bookId: string): Promise<void> {
  const book = await getBook(bookId);
  if (!book) return;

  await deleteBook(bookId);

  try {
    const file = new File(book.filePath);
    if (file.exists) file.delete();
  } catch {
    // Ignore — the library no longer references this file either way.
  }
  deleteCoverFor(bookId);
}
