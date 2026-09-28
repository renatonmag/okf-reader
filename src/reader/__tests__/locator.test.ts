import { parseLocator, schemeFor, serializeLocator, startOf } from '@/reader/locator';
import { BOOK_FORMATS } from '@/formats/types';

describe('locators', () => {
  it('round-trips an EPUB CFI, colons and all', () => {
    const locator = { scheme: 'epub', cfi: '/6/14[chap05]!/4/2/1:32' } as const;
    expect(parseLocator(serializeLocator(locator))).toEqual(locator);
  });

  it('round-trips a PDF page and offset', () => {
    const locator = { scheme: 'pdf', page: 12, offset: 480 } as const;
    expect(serializeLocator(locator)).toBe('pdf:12#480');
    expect(parseLocator('pdf:12#480')).toEqual(locator);
  });

  it('round-trips a text section and offset', () => {
    const locator = { scheme: 'text', section: 3, offset: 1024 } as const;
    expect(parseLocator(serializeLocator(locator))).toEqual(locator);
  });

  it('returns null for junk rather than throwing', () => {
    // A corrupt saved position must drop the reader at the start of the book,
    // not stop the book from opening.
    expect(parseLocator('')).toBeNull();
    expect(parseLocator('nonsense')).toBeNull();
    expect(parseLocator('pdf:notanumber#0')).toBeNull();
    expect(parseLocator('epub:')).toBeNull();
  });

  it('gives every format a parseable starting locator', () => {
    for (const format of BOOK_FORMATS) {
      const start = startOf(format);
      expect(start.scheme).toBe(schemeFor(format));
      expect(parseLocator(serializeLocator(start))).toEqual(start);
    }
  });
});
