/**
 * The one database connection for the app. Local SQLite is the source of truth
 * for everything the UI reads — the app works fully offline and nothing here
 * waits on a network.
 */

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

export const DATABASE_NAME = 'okf-reader.db';

/**
 * `enableChangeListener` is what makes `useLiveQuery` re-render on writes; without
 * it the library list would not update after an import.
 */
const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

// Foreign keys are OFF by default in SQLite, which would make every
// `ON DELETE CASCADE` in the schema silently do nothing. This must run on the
// connection, not in a migration.
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

/** The raw handle, for the rare query the builder cannot express. */
export { sqlite };

export type Database = typeof db;
