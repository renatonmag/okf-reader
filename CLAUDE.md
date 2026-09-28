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
- **Supabase** — Postgres, Auth, Storage (document blobs), Realtime (sync)

## Conventions

- TypeScript `strict: true`. No `any` — use `unknown` and narrow.
- Supabase types are generated from the schema, not hand-written. Regenerate
  after every migration; never edit the generated types file.
- Schema changes go through migration files, never ad-hoc SQL in the dashboard.
- Row Level Security on every table. A user only ever sees their own rows.
- Document files live in Supabase Storage; the database holds metadata and
  reading state only.
- Format parsing lives behind one interface so a new format is a new adapter,
  not changes scattered through the reader UI.
- Offline-first: the local store is the source of truth for the UI; sync
  reconciles with Supabase in the background.

## Commands

_To be filled in once the project is scaffolded._

## Structure

_To be filled in once the project is scaffolded._
