import { NotImplementedError, type BookAdapter } from '@/formats/types';

/**
 * A web article saved to the library: title, byline and lead image come from the
 * extracted readable document. Single-section, so there is no table of contents.
 */
export const articleAdapter: BookAdapter = {
  format: 'article',
  capabilities: { fontScaling: true, theming: true, scrollMode: true, toc: false },

  extractMetadata() {
    throw new NotImplementedError('article', 'extractMetadata');
  },

  async extractToc() {
    return [];
  },
};
