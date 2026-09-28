/**
 * Locators: where in a book a position, bookmark or highlight sits.
 *
 * Always format-stable — an EPUB CFI, a PDF page plus character offset — never a
 * pixel or scroll offset, so a saved position survives a font-size, margin or
 * orientation change. Stored as TEXT, prefixed with the scheme so a row is
 * self-describing.
 *
 *   epub:/6/14[chap05]!/4/2/1:32
 *   pdf:12#480
 *   text:0#1024
 */

import type { BookFormat } from '@/formats/types';

export type Locator =
  | { readonly scheme: 'epub'; readonly cfi: string }
  | { readonly scheme: 'pdf'; readonly page: number; readonly offset: number }
  | { readonly scheme: 'text'; readonly section: number; readonly offset: number };

export function serializeLocator(locator: Locator): string {
  switch (locator.scheme) {
    case 'epub':
      return `epub:${locator.cfi}`;
    case 'pdf':
      return `pdf:${locator.page}#${locator.offset}`;
    case 'text':
      return `text:${locator.section}#${locator.offset}`;
  }
}

/**
 * Returns null for anything unparseable rather than throwing — a corrupt saved
 * position should drop the reader at the start of the book, not crash it.
 */
export function parseLocator(raw: string): Locator | null {
  const separator = raw.indexOf(':');
  if (separator < 0) return null;

  const scheme = raw.slice(0, separator);
  const rest = raw.slice(separator + 1);

  if (scheme === 'epub') {
    return rest ? { scheme: 'epub', cfi: rest } : null;
  }

  if (scheme === 'pdf' || scheme === 'text') {
    const [left, right] = rest.split('#');
    const first = Number(left);
    const offset = Number(right ?? 0);
    if (!Number.isFinite(first) || !Number.isFinite(offset)) return null;
    return scheme === 'pdf'
      ? { scheme: 'pdf', page: first, offset }
      : { scheme: 'text', section: first, offset };
  }

  return null;
}

/** The locator scheme a format reads and writes. */
export function schemeFor(format: BookFormat): Locator['scheme'] {
  switch (format) {
    case 'epub':
      return 'epub';
    case 'pdf':
      return 'pdf';
    case 'mobi':
    case 'article':
      return 'text';
  }
}

/** The start of a book, used when there is no saved position. */
export function startOf(format: BookFormat): Locator {
  switch (schemeFor(format)) {
    case 'epub':
      return { scheme: 'epub', cfi: '/6/2!/4/2/1:0' };
    case 'pdf':
      return { scheme: 'pdf', page: 1, offset: 0 };
    case 'text':
      return { scheme: 'text', section: 0, offset: 0 };
  }
}
