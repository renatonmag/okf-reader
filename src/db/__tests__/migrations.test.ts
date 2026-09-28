/**
 * Applies the generated migrations to a real SQLite database and checks the
 * constraints the app relies on but never states in application code.
 *
 * Uses Node's built-in `node:sqlite` rather than expo-sqlite: this is about the
 * SQL drizzle-kit generated being correct, which is the same SQL either way, and
 * it needs no native module or simulator to run.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import journal from '@/db/migrations/meta/_journal.json';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

function migrationSql(): string[] {
  return journal.entries.map((entry) =>
    readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8'),
  );
}

function migratedDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const sql of migrationSql()) {
    // Drizzle separates statements with this marker rather than bare semicolons,
    // which would split trigger and default-expression bodies.
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) db.exec(statement);
    }
  }
  return db;
}

function tableNames(db: DatabaseSync): string[] {
  return db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
    .all()
    .map((row) => String(row.name))
    .sort();
}

function insertBook(db: DatabaseSync, id: string, hash: string) {
  db.prepare(
    `INSERT INTO books (id, title, file_path, format, content_hash, file_size)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, 'A Book', `/books/${id}.epub`, 'epub', hash, 1024);
}

describe('migrations', () => {
  it('applies cleanly and creates every table the app queries', () => {
    const db = migratedDatabase();
    expect(tableNames(db)).toEqual([
      'annotations',
      'app_settings',
      'book_settings',
      'book_toc',
      'books',
      'reading_state',
    ]);
    db.close();
  });

  it('has at least one migration in the journal', () => {
    // Guards against a scaffold where schema.ts exists but nothing was generated.
    expect(journal.entries.length).toBeGreaterThan(0);
  });

  it('refuses a second book with the same content hash', () => {
    // This is what makes re-importing a book the user already has a no-op
    // instead of a duplicate row.
    const db = migratedDatabase();
    insertBook(db, 'book-1', 'same-hash');
    expect(() => insertBook(db, 'book-2', 'same-hash')).toThrow(/UNIQUE/i);
    db.close();
  });

  it('cascades a deleted book to its reading state, annotations, settings and cached outline', () => {
    // Proves the foreign_keys pragma is doing something: without it every
    // ON DELETE CASCADE in the schema is silently inert and rows are orphaned.
    const db = migratedDatabase();
    insertBook(db, 'book-1', 'hash-1');

    db.prepare(`INSERT INTO reading_state (book_id, locator, progress) VALUES (?, ?, ?)`).run(
      'book-1',
      'epub:/6/2!/4/2/1:0',
      0.25,
    );
    db.prepare(
      `INSERT INTO annotations (id, book_id, kind, locator_start) VALUES (?, ?, ?, ?)`,
    ).run('note-1', 'book-1', 'bookmark', 'epub:/6/2!/4/2/1:0');
    db.prepare(`INSERT INTO book_settings (book_id, font_size) VALUES (?, ?)`).run('book-1', 22);
    db.prepare(`INSERT INTO book_toc (book_id, entries) VALUES (?, ?)`).run(
      'book-1',
      '[{"label":"Chapter 1","locator":"pdf:1#0","children":[]}]',
    );

    db.prepare(`DELETE FROM books WHERE id = ?`).run('book-1');

    for (const table of ['reading_state', 'annotations', 'book_settings', 'book_toc']) {
      const { count } = db.prepare(`SELECT count(*) AS count FROM ${table}`).get() as {
        count: number;
      };
      expect({ table, count }).toEqual({ table, count: 0 });
    }
    db.close();
  });

  it('rejects an annotation pointing at a book that does not exist', () => {
    const db = migratedDatabase();
    expect(() =>
      db
        .prepare(`INSERT INTO annotations (id, book_id, kind, locator_start) VALUES (?, ?, ?, ?)`)
        .run('orphan', 'no-such-book', 'bookmark', 'pdf:1#0'),
    ).toThrow(/FOREIGN KEY/i);
    db.close();
  });

  it('defaults a new settings row to the values the store falls back to', () => {
    const db = migratedDatabase();
    db.prepare(`INSERT INTO app_settings (id) VALUES ('global')`).run();
    expect(db.prepare(`SELECT * FROM app_settings WHERE id = 'global'`).get()).toMatchObject({
      font_family: 'serif',
      font_size: 18,
      line_spacing: 1.5,
      margin: 24,
      theme: 'system',
      reading_mode: 'paged',
    });
    db.close();
  });
});
