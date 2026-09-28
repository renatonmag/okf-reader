/**
 * The local library. This file is the single source of truth for the database:
 * SQL is generated from it with `pnpm db:generate`, never written by hand.
 *
 * Book files themselves live on the filesystem; rows here hold metadata, a
 * pointer to the file, and reading state.
 */

import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { BookFormat } from '@/formats/types';

const now = sql`(unixepoch())`;

/** A book in the library. One row per distinct file, keyed by content hash. */
export const books = sqliteTable(
  'books',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    author: text('author'),
    /** Absolute path to the cover image on disk, written at import time. */
    coverPath: text('cover_path'),
    /** Absolute path to the book file inside app-owned storage. */
    filePath: text('file_path').notNull(),
    format: text('format').notNull().$type<BookFormat>(),
    /** SHA-256 of the file, used to recognise a re-import of the same book. */
    contentHash: text('content_hash').notNull().unique(),
    fileSize: integer('file_size').notNull(),
    addedAt: integer('added_at').notNull().default(now),
    lastOpenedAt: integer('last_opened_at'),
  },
  (table) => [
    index('books_last_opened_idx').on(table.lastOpenedAt),
    index('books_title_idx').on(table.title),
  ],
);

/** Where the reader left off. One row per book. */
export const readingState = sqliteTable('reading_state', {
  bookId: text('book_id')
    .primaryKey()
    .references(() => books.id, { onDelete: 'cascade' }),
  /** Format-stable locator (EPUB CFI, PDF `page#offset`) — never a pixel offset. */
  locator: text('locator'),
  /** Fraction of the book read, 0–1. Denormalised so the library can show progress. */
  progress: real('progress').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(now),
});

/**
 * Bookmarks, highlights and notes. They share a shape — a book, a locator range
 * and some text — so they share a table with a `kind` discriminator rather than
 * three near-identical tables. A note attached to a highlight points at it via
 * `parentId`; a standalone note leaves that null.
 *
 * Narrowed into a discriminated union in `./types`.
 */
export const annotations = sqliteTable(
  'annotations',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().$type<'bookmark' | 'highlight' | 'note'>(),
    locatorStart: text('locator_start').notNull(),
    /** End of a highlight range. Null for point annotations (bookmarks, bare notes). */
    locatorEnd: text('locator_end'),
    /** Surrounding text, so an annotation still reads as something without opening the book. */
    textSnippet: text('text_snippet'),
    /** Highlight colour. Null for bookmarks and notes. */
    color: text('color'),
    /** Note body. Null for bookmarks and highlights. */
    noteBody: text('note_body'),
    /** Set when a note hangs off a highlight. */
    parentId: text('parent_id'),
    createdAt: integer('created_at').notNull().default(now),
    updatedAt: integer('updated_at').notNull().default(now),
  },
  (table) => [
    index('annotations_book_idx').on(table.bookId, table.kind),
    index('annotations_parent_idx').on(table.parentId),
  ],
);

/**
 * Global display settings. Exactly one row, `id = 'global'` — a single-row table
 * keeps the read a plain query rather than key/value string parsing.
 */
export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().default('global'),
  fontFamily: text('font_family').notNull().default('serif'),
  fontSize: integer('font_size').notNull().default(18),
  lineSpacing: real('line_spacing').notNull().default(1.5),
  margin: integer('margin').notNull().default(24),
  theme: text('theme').notNull().default('system').$type<'light' | 'sepia' | 'dark' | 'system'>(),
  readingMode: text('reading_mode').notNull().default('paged').$type<'paged' | 'scroll'>(),
});

/**
 * Per-book overrides of the global settings. Every column is nullable: null means
 * "inherit the global value", which is what lets a single book be read in a
 * larger font without changing the default.
 */
export const bookSettings = sqliteTable('book_settings', {
  bookId: text('book_id')
    .primaryKey()
    .references(() => books.id, { onDelete: 'cascade' }),
  fontFamily: text('font_family'),
  fontSize: integer('font_size'),
  lineSpacing: real('line_spacing'),
  margin: integer('margin'),
  theme: text('theme').$type<'light' | 'sepia' | 'dark' | 'system'>(),
  readingMode: text('reading_mode').$type<'paged' | 'scroll'>(),
});

export const booksRelations = relations(books, ({ one, many }) => ({
  readingState: one(readingState, {
    fields: [books.id],
    references: [readingState.bookId],
  }),
  settings: one(bookSettings, {
    fields: [books.id],
    references: [bookSettings.bookId],
  }),
  annotations: many(annotations),
}));

export const annotationsRelations = relations(annotations, ({ one }) => ({
  book: one(books, {
    fields: [annotations.bookId],
    references: [books.id],
  }),
}));

export const readingStateRelations = relations(readingState, ({ one }) => ({
  book: one(books, {
    fields: [readingState.bookId],
    references: [books.id],
  }),
}));
