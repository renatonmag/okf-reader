/**
 * The one interface every format implements. Adding a format means adding an
 * adapter and registering it — not touching the reader UI or the import flow.
 */

export const BOOK_FORMATS = ['epub', 'pdf', 'mobi', 'article'] as const;

export type BookFormat = (typeof BOOK_FORMATS)[number];

/** What a format can actually honour, so the UI disables what it cannot do. */
export interface FormatCapabilities {
  /** Reflows text at a chosen font size. False for fixed-layout formats like PDF. */
  readonly fontScaling: boolean;
  /** Can be recoloured for sepia/dark reading. */
  readonly theming: boolean;
  /** Supports continuous scroll in addition to pagination. */
  readonly scrollMode: boolean;
  /** Exposes a table of contents. */
  readonly toc: boolean;
  /**
   * Where that table of contents comes from. Most formats parse it out of the file
   * (`'file'`), but pdfium only exposes a PDF's outline through a mounted renderer, so
   * PDF harvests it on first open and caches it (`'renderer'`). Only meaningful when
   * `toc` is true.
   */
  readonly tocSource: 'file' | 'renderer';
}

/** What the import pipeline knows about a file that the file itself does not. */
export interface ExtractContext {
  /** The `books` row id this file will be stored under. Covers are named from it. */
  readonly bookId: string;
  /** The name the file arrived with, for adapters that sanity-check a title against it. */
  readonly fileName: string;
}

export interface BookMetadata {
  readonly title: string;
  readonly author: string | null;
  /**
   * Absolute path to a cover image the adapter extracted (EPUB manifest item) or
   * rendered (PDF page 1) into app storage. Null when the format has no cover.
   */
  readonly coverPath: string | null;
}

export interface TocEntry {
  readonly label: string;
  /** Format-stable locator to jump to. */
  readonly locator: string;
  readonly children: readonly TocEntry[];
}

export interface BookAdapter {
  readonly format: BookFormat;
  readonly capabilities: FormatCapabilities;
  /**
   * Title, author and cover, read once at import time and then cached in SQLite.
   *
   * Should not throw: `importBook` treats a rejection as a failed import and deletes
   * the copied file, so a file whose metadata cannot be read is better returned with an
   * empty title — the pipeline then falls back to the filename.
   */
  extractMetadata(filePath: string, context: ExtractContext): Promise<BookMetadata>;
  /**
   * Nested table of contents. Returns an empty array for formats without one, and for
   * formats whose `tocSource` is `'renderer'` — those are read from the cache instead.
   */
  extractToc(filePath: string): Promise<readonly TocEntry[]>;
}

/**
 * Thrown by every adapter stub in the scaffold. Deliberately specific: when this
 * surfaces, it names exactly which format and which method still needs writing,
 * and everything upstream of it is known to work.
 */
export class NotImplementedError extends Error {
  constructor(
    readonly format: BookFormat,
    readonly method: string,
  ) {
    super(`${format}: ${method}() is not implemented yet`);
    this.name = 'NotImplementedError';
  }
}
