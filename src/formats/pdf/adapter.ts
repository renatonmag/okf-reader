import { NotImplementedError, type BookAdapter } from '@/formats/types';

/**
 * PDF: title and author come from the document info dictionary or XMP metadata;
 * the cover is a render of page 1. Fixed-layout, so font settings do not apply —
 * `capabilities` is what makes the settings UI disable them rather than ignore them.
 */
export const pdfAdapter: BookAdapter = {
  format: 'pdf',
  capabilities: { fontScaling: false, theming: true, scrollMode: true, toc: true },

  extractMetadata() {
    throw new NotImplementedError('pdf', 'extractMetadata');
  },

  extractToc() {
    throw new NotImplementedError('pdf', 'extractToc');
  },
};
