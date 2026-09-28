/**
 * Row types, all inferred from the schema — the same principle CLAUDE.md states
 * for generated Supabase types: never hand-written, never drifting from the DDL.
 */

import type { annotations, appSettings, bookSettings, books, readingState } from '@/db/schema';

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

export type ReadingState = typeof readingState.$inferSelect;

export type AppSettings = typeof appSettings.$inferSelect;
export type BookSettings = typeof bookSettings.$inferSelect;

export type AnnotationRow = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;

/**
 * The three annotation kinds share one table, so the union below is what keeps
 * them apart in application code: a bookmark has no colour, a highlight has no
 * note body, and TypeScript enforces both.
 */
export type Bookmark = AnnotationRow & {
  kind: 'bookmark';
  color: null;
  noteBody: null;
};

export type Highlight = AnnotationRow & {
  kind: 'highlight';
  locatorEnd: string;
  color: string;
};

export type Note = AnnotationRow & {
  kind: 'note';
  noteBody: string;
};

export type Annotation = Bookmark | Highlight | Note;

/** A book row joined with its reading progress, which is what the library lists. */
export type LibraryEntry = Book & {
  progress: number;
};
