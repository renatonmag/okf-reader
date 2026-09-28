# okf-reader

A mobile reading app: one place to read saved articles and ebooks.

## What it is

A cross-platform mobile reader that ingests and renders:

- **Articles** — saved from a URL, stripped to readable content
- **EPUB** — reflowable ebooks
- **MOBI** — legacy Kindle format
- **PDF** — fixed-layout documents

Core reading features: library management, per-document reading position sync,
highlights and notes, typography controls (font, size, spacing, theme), and
offline-first access to anything already in the library.

## Stack

- **React Native** — mobile client (iOS + Android)
- **TypeScript** — strict mode, everywhere
- **Expo** (SDK 57) — dev client and prebuild; Expo Go is not a target
- **expo-router** — file-based routes under `src/app`
- **SQLite + Drizzle ORM** — on-device library and reading state (the source of truth)
- **Supabase** — Auth, Postgres + Storage as the cross-device sync/backup layer (not built yet)

## Conventions

- TypeScript `strict: true`. No `any` — use `unknown` and narrow.
- Database types are generated, never hand-written: locally from the Drizzle
  schema (`typeof books.$inferSelect`), and from the Supabase schema once sync
  exists. Never edit a generated types file.
- `src/db/schema.ts` is the single source of truth for the local database. Change
  it, then run `pnpm db:generate`; never hand-write or edit a migration that has
  shipped — append a new one.
- Schema changes go through migration files, never ad-hoc SQL in the dashboard.
- Row Level Security on every table. A user only ever sees their own rows.
- Book files live on the device filesystem; SQLite holds metadata, a `file_path`
  pointer, and reading state — never the file bytes. Supabase Storage is the
  optional backup/sync copy, not the read path.
- Format parsing lives behind one interface (`BookAdapter` in
  `src/formats/types.ts`) so a new format is a new adapter, not changes scattered
  through the reader UI. What a format cannot do is declared as `capabilities`
  data, so the UI disables those controls rather than ignoring them.
- `src/app` holds routes only — no domain logic. Screens call `src/db/queries`
  and `src/formats`; they never write SQL or touch a parser directly.
- Format is detected from magic bytes (`src/formats/detect.ts`), never from the
  file extension.
- Offline-first: local SQLite is the source of truth for the UI. Everything —
  import, reading, settings — works with no network; Supabase sync reconciles in
  the background and is never on the critical path of a read.
- Reading positions are stored as format-stable locators (EPUB CFI, PDF page +
  offset), never as raw pixel or scroll offsets, so a position survives a font
  or layout change.

## Core features

### 1. Import

Bring files in on both platforms, from wherever the user already keeps them.

- **Android** — system file picker (SAF) plus `ACTION_VIEW` / `ACTION_SEND`
  intents, so okf-reader appears in the share sheet of any app holding a book.
- **iOS** — `UIDocumentPicker` (Files, iCloud Drive, third-party providers),
  share-sheet extension, and "Open in…" from Mail/Safari.
- On import the file is copied into app-owned storage; the picked URI is a
  transient grant and must not be persisted as the `file_path`.
- Format is detected from the file's magic bytes, not its extension.
- Duplicate detection by content hash — re-importing a book the user already has
  updates the existing row rather than creating a second one.

### 2. Library (local SQLite)

One table per concern, all local, all queryable offline.

- `books` — `id`, `title`, `author`, `cover_path`, `file_path`, `format`,
  `content_hash`, `added_at`, `last_opened_at`.
- Covers are stored as image files on disk; the row holds the path.
- The library list is driven straight off SQLite so it renders instantly with no
  network and no parse step.
- Sort and filter by title, author, format, recently added, recently opened.

### 3. Metadata and covers

Extracted once, at import time, then cached — never re-parsed to draw a list.

- **EPUB** — read the OPF package document for `dc:title`, `dc:creator`, and the
  `cover` manifest item; fall back to the first image in the spine.
- **PDF** — the document info dictionary / XMP for title and author, and a render
  of page 1 as the cover.
- **MOBI** — the PalmDOC/EXTH header records for title, author, and cover offset.
- **Articles** — title, byline, and lead image from the extracted document.
- Anything missing falls back to the filename, and the user can edit any field.

### 4. Reading state

Per book, saved continuously and restored on open.

- **Last position** — a format-stable locator, written on pause/background so a
  kill never loses the spot.
- **Bookmarks** — a named locator plus the surrounding text snippet for context.
- **Highlights** — a locator range, the selected text, and a color.
- **Notes** — free text attached to a highlight or to a bare locator.
- Highlights and notes are separate rows keyed by `book_id`, so they survive a
  re-import of the same file.

### 5. Display settings

Global defaults with per-book overrides.

- Font family and **font size**.
- **Line spacing**, plus margins and text alignment.
- Themes: light, **sepia**, **dark** — and following the OS setting.
- **Page mode vs. scroll mode**: paginated with a tap/swipe page turn, or a
  continuous scroll.
- Changing a setting re-layouts around the current locator so the reader does not
  lose their place.
- PDF, being fixed-layout, honours theme and mode but not font settings; the UI
  disables what a format cannot do rather than silently ignoring it.

### 6. Navigation

- **Table of contents** — from the EPUB nav document / NCX, the PDF outline, or
  the MOBI index; nested, and tapping an entry jumps to that locator.
- **In-book search** — full-text over the book's extracted text with hit counts,
  surrounding context, and jump-to-hit. Backed by a SQLite FTS index built on
  first search and cached with the book.
- Progress indicators: percent through the book and through the current chapter.
- Back-jump: returning from a TOC or search jump restores the previous position.

## Commands

pnpm is required — see the note below.

```bash
pnpm install            # first run; needs .npmrc's node-linker=hoisted
pnpm prebuild           # regenerate android/ and ios/ from app.config.ts
pnpm android            # build and run on a device or emulator
pnpm start              # dev server for an installed dev client
pnpm db:generate        # src/db/schema.ts -> src/db/migrations/
pnpm test               # jest
pnpm typecheck          # tsc --noEmit
pnpm lint
```

## Structure

```
app.config.ts              # native config: intent filters, document types, plugins
drizzle.config.ts          # schema -> migrations
metro.config.js            # resolves .sql migrations
babel.config.js            # inlines .sql migrations into the bundle
src/
  app/                     # expo-router routes only
    _layout.tsx            # runs migrations, loads settings, holds the splash
    index.tsx              # Library
    settings.tsx           # global display settings
    book/[id]/             # reader, contents, search
  db/
    client.ts              # the one connection; sets PRAGMA foreign_keys
    schema.ts              # source of truth for the database
    migrations/            # generated by drizzle-kit — do not hand-edit
    queries/               # the only place SQL lives
  formats/                 # detect.ts, registry.ts, and one adapter per format
  import/                  # picker + the copy/hash/detect/extract pipeline
  reader/                  # locators, position saving
  stores/                  # zustand settings cache over SQLite
  theme/                   # reader page themes (light/sepia/dark)
  sync/                    # empty seam for Supabase
```

## Notes

- **pnpm with `node-linker=hoisted`** (`.npmrc`). React Native autolinking and
  Metro do not cope with pnpm's symlinked store; without it the Android build
  fails at autolinking with errors that look unrelated.
- **`android/` and `ios/` are generated** and gitignored. `app.config.ts` is the
  source of truth; run `pnpm prebuild` after changing it.
- **iOS cannot be built on the current Linux machine** — that needs a Mac or EAS
  Build. `ios/` is still generated so the config stays correct.
- **Not built yet**: every format parser (each adapter throws
  `NotImplementedError` naming itself), in-book full-text search, the iOS share
  extension target, and all of Supabase.
