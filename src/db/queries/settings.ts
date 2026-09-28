import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { appSettings, bookSettings } from '@/db/schema';
import type { AppSettings, BookSettings } from '@/db/types';

export const GLOBAL_SETTINGS_ID = 'global';

/** Defaults live here and in the schema's column defaults; the schema wins on insert. */
export const DEFAULT_SETTINGS: AppSettings = {
  id: GLOBAL_SETTINGS_ID,
  fontFamily: 'serif',
  fontSize: 18,
  lineSpacing: 1.5,
  margin: 24,
  theme: 'system',
  readingMode: 'paged',
};

export function appSettingsQuery() {
  return db.select().from(appSettings).where(eq(appSettings.id, GLOBAL_SETTINGS_ID)).limit(1);
}

/** Reads the single global settings row, creating it on first launch. */
export async function loadAppSettings(): Promise<AppSettings> {
  const [existing] = await appSettingsQuery();
  if (existing) return existing;

  const [created] = await db.insert(appSettings).values(DEFAULT_SETTINGS).returning();
  return created ?? DEFAULT_SETTINGS;
}

export async function updateAppSettings(patch: Partial<Omit<AppSettings, 'id'>>) {
  await db.update(appSettings).set(patch).where(eq(appSettings.id, GLOBAL_SETTINGS_ID));
}

export async function getBookSettings(bookId: string): Promise<BookSettings | null> {
  const [row] = await db
    .select()
    .from(bookSettings)
    .where(eq(bookSettings.bookId, bookId))
    .limit(1);
  return row ?? null;
}

/**
 * Per-book override. Every column is nullable, so writing null to one clears the
 * override and the book falls back to the global value.
 */
export async function setBookSettings(
  bookId: string,
  patch: Partial<Omit<BookSettings, 'bookId'>>,
) {
  await db
    .insert(bookSettings)
    .values({ bookId, ...patch })
    .onConflictDoUpdate({ target: bookSettings.bookId, set: patch });
}

/** Global settings with any per-book override applied on top. */
export function resolveSettings(global: AppSettings, override: BookSettings | null): AppSettings {
  if (!override) return global;
  return {
    id: global.id,
    fontFamily: override.fontFamily ?? global.fontFamily,
    fontSize: override.fontSize ?? global.fontSize,
    lineSpacing: override.lineSpacing ?? global.lineSpacing,
    margin: override.margin ?? global.margin,
    theme: override.theme ?? global.theme,
    readingMode: override.readingMode ?? global.readingMode,
  };
}
