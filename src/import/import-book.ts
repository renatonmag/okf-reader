/**
 * The import pipeline, shared by the picker, the Android share sheet and the iOS
 * "Open in…" handler: copy → hash → detect → extract → insert.
 */

import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';

import { findBookByHash, insertBook } from '@/db/queries/books';
import type { Book } from '@/db/types';
import { DETECT_HEADER_BYTES, detectFormat } from '@/formats/detect';
import { adapterFor } from '@/formats/registry';
import type { BookFormat, ExtractContext } from '@/formats/types';
import {
  BOOKS_DIRECTORY,
  COVERS_DIRECTORY,
  deleteCoverFor,
  ensureDirectory,
} from '@/storage/paths';

export { BOOKS_DIRECTORY };

export class UnsupportedFileError extends Error {
  constructor(readonly fileName: string) {
    super(`${fileName} is not a format okf-reader can read`);
    this.name = 'UnsupportedFileError';
  }
}

export interface ImportResult {
  readonly book: Book;
  /** True when this file was already in the library and the existing row was reused. */
  readonly alreadyInLibrary: boolean;
}

/** Reads just enough of the header to identify the format, not the whole file. */
function readHeader(file: File): Uint8Array {
  const handle = file.open();
  try {
    return handle.readBytes(DETECT_HEADER_BYTES);
  } finally {
    handle.close();
  }
}

/**
 * Import a book from a picked or shared URI.
 *
 * The file is copied into app storage first and everything else works off that
 * copy: on both platforms the incoming URI is a temporary grant (an Android SAF
 * permission, an iOS inbox file) that is gone by the next launch, so it must
 * never be what ends up in `filePath`.
 */
export async function importBook(sourceUri: string): Promise<ImportResult> {
  ensureDirectory(BOOKS_DIRECTORY);
  ensureDirectory(COVERS_DIRECTORY);

  const source = new File(sourceUri);
  const sourceName = source.name;

  // Copy under a generated name: two books can share a filename, and the
  // original name may contain anything the source filesystem allowed.
  const id = randomUUID();
  const destination = new File(BOOKS_DIRECTORY, `${id}${source.extension}`);
  await source.copy(destination);

  try {
    const format = detectFormat(readHeader(destination));
    if (!format) throw new UnsupportedFileError(sourceName);

    // Native hash over the file on disk — never pulls a whole book into JS memory.
    // Identity only, not integrity: this decides "same file already imported".
    const contentHash = destination.md5 ?? `size:${destination.size}:${sourceName}`;

    const existing = await findBookByHash(contentHash);
    if (existing) {
      destination.delete();
      return { book: existing, alreadyInLibrary: true };
    }

    const metadata = await extractMetadata(format, destination.uri, { bookId: id, fileName: sourceName });

    const book = await insertBook({
      id,
      title: metadata.title,
      author: metadata.author,
      coverPath: metadata.coverPath,
      filePath: destination.uri,
      format,
      contentHash,
      fileSize: destination.size,
    });

    return { book, alreadyInLibrary: false };
  } catch (error) {
    // Do not leave an orphan file behind when the import fails. The cover is named
    // from the id, so an adapter that got far enough to write one leaves that too.
    if (destination.exists) destination.delete();
    deleteCoverFor(id);
    throw error;
  }
}

/**
 * Metadata, falling back to the filename for anything the format does not carry —
 * the user can edit the fields afterwards either way.
 */
async function extractMetadata(format: BookFormat, uri: string, context: ExtractContext) {
  const metadata = await adapterFor(format).extractMetadata(uri, context);
  return {
    title: metadata.title.trim() || stripExtension(context.fileName),
    author: metadata.author,
    coverPath: metadata.coverPath,
  };
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}
