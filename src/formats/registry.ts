import { articleAdapter } from '@/formats/article/adapter';
import { epubAdapter } from '@/formats/epub/adapter';
import { mobiAdapter } from '@/formats/mobi/adapter';
import { pdfAdapter } from '@/formats/pdf/adapter';
import type { BookAdapter, BookFormat } from '@/formats/types';

const adapters: Record<BookFormat, BookAdapter> = {
  epub: epubAdapter,
  pdf: pdfAdapter,
  mobi: mobiAdapter,
  article: articleAdapter,
};

export function adapterFor(format: BookFormat): BookAdapter {
  return adapters[format];
}
