/**
 * Format detection from the file's leading bytes. Never from the extension: a
 * `.epub` that is really a PDF is common enough (and a renamed file is cheap
 * enough) that trusting the name means handing the wrong parser a file.
 */

import type { BookFormat } from '@/formats/types';

/** Bytes needed to decide. MOBI's marker sits at offset 60, so read past it. */
export const DETECT_HEADER_BYTES = 68;

const ZIP = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const MOBI_TYPE_CREATOR_OFFSET = 60;
const BOOKMOBI = 'BOOKMOBI';
const TEXTREAD = 'TEXtREAd'; // older PalmDOC ebooks, also handled by the MOBI adapter

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, i) => bytes[i] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/**
 * Identify a book format from a file's header.
 *
 * EPUB is a zip, and so far as the header goes so is every other zip — a zip is
 * reported as `epub` here and the EPUB adapter rejects it when the OPF turns out
 * to be missing. That is the right place for the check: it needs the archive
 * open anyway, and a header cannot tell the two apart.
 *
 * Returns null when nothing matches, which the import flow surfaces as an
 * unsupported-file error rather than guessing.
 */
export function detectFormat(header: Uint8Array): BookFormat | null {
  if (startsWith(header, PDF)) return 'pdf';

  if (header.length >= MOBI_TYPE_CREATOR_OFFSET + BOOKMOBI.length) {
    const marker = asciiAt(header, MOBI_TYPE_CREATOR_OFFSET, BOOKMOBI.length);
    if (marker === BOOKMOBI || marker === TEXTREAD) return 'mobi';
  }

  if (startsWith(header, ZIP)) return 'epub';

  return null;
}
