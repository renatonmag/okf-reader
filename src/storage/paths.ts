/**
 * Where app-owned files live on disk.
 *
 * A neutral module on purpose: `import/` already depends on `formats/`, and format
 * adapters need to write covers, so the directories cannot live under either without
 * making the two layers mutually dependent.
 */

import { Directory, File, Paths } from 'expo-file-system';

/**
 * Imported book files. Names are `${randomUUID()}${extension}` — never the original
 * filename. That is not only about collisions: react-native-pdf runs the path through
 * `decodeURIComponent` before handing it to pdfium, so a name containing `%` or other
 * escapes would fail to load. Keep generated names.
 */
export const BOOKS_DIRECTORY = new Directory(Paths.document, 'books');

/** Extracted cover images, named `${bookId}.jpg`. The books row holds the path. */
export const COVERS_DIRECTORY = new Directory(Paths.document, 'covers');

export function ensureDirectory(directory: Directory): void {
  if (!directory.exists) directory.create({ intermediates: true });
}

/**
 * Removes a book's cover, whatever extension it was written with. Best effort: a
 * missing or unreadable cover is not worth failing an import or a delete over.
 */
export function deleteCoverFor(bookId: string): void {
  try {
    if (!COVERS_DIRECTORY.exists) return;
    for (const entry of COVERS_DIRECTORY.list()) {
      if (entry instanceof File && stripExtension(entry.name) === bookId) entry.delete();
    }
  } catch {
    // Ignore — nothing downstream depends on the cover being gone.
  }
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}
