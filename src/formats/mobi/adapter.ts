import { NotImplementedError, type BookAdapter } from '@/formats/types';

/**
 * MOBI: title, author and cover offset live in the PalmDOC and EXTH header
 * records. There is no maintained React Native library for this, so the adapter
 * will need a hand-written parser.
 */
export const mobiAdapter: BookAdapter = {
  format: 'mobi',
  capabilities: { fontScaling: true, theming: true, scrollMode: true, toc: true, tocSource: 'file' },

  extractMetadata() {
    throw new NotImplementedError('mobi', 'extractMetadata');
  },

  extractToc() {
    throw new NotImplementedError('mobi', 'extractToc');
  },
};
