import { NotImplementedError, type BookAdapter } from '@/formats/types';

/**
 * EPUB: a zip whose OPF package document holds `dc:title`, `dc:creator` and the
 * cover manifest item; the nav document (or NCX, for EPUB 2) holds the TOC.
 */
export const epubAdapter: BookAdapter = {
  format: 'epub',
  capabilities: { fontScaling: true, theming: true, scrollMode: true, toc: true },

  extractMetadata() {
    throw new NotImplementedError('epub', 'extractMetadata');
  },

  extractToc() {
    throw new NotImplementedError('epub', 'extractToc');
  },
};
