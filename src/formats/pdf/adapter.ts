import { renderPdfCover } from '@/formats/pdf/cover';
import { extractPdfMetadata } from '@/formats/pdf/metadata';
import type { BookAdapter } from '@/formats/types';

/**
 * PDF: fixed layout, so the reader honours theme and reading mode but not the type
 * settings — `capabilities.fontScaling: false` is what greys those controls out.
 *
 * The work is split across three mechanisms because no single library covers it:
 * metadata comes from pdf-lib, the cover from a native page renderer, and the outline
 * from the reader itself (see `tocSource`).
 */
export const pdfAdapter: BookAdapter = {
  format: 'pdf',
  capabilities: {
    fontScaling: false,
    theming: true,
    scrollMode: true,
    toc: true,
    tocSource: 'renderer',
  },

  async extractMetadata(filePath, { bookId, fileName }) {
    const { title, author } = await extractPdfMetadata(filePath, fileName);
    return { title, author, coverPath: await renderPdfCover(filePath, bookId) };
  },

  /**
   * Not a stub. pdfium only exposes a PDF's outline through a mounted renderer's
   * `onLoadComplete`, so it is harvested there, normalised by `normalizeOutline` and
   * cached in `book_toc`. `capabilities.tocSource === 'renderer'` tells the contents
   * screen to read the cache instead of calling this.
   */
  async extractToc() {
    return [];
  },
};
