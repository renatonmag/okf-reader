/**
 * Cross-device sync — deliberately empty for now.
 *
 * The library is local-first: SQLite is the source of truth and every feature
 * works with no network. Supabase will back this up and reconcile across devices,
 * but it is never on the critical path of opening or reading a book, so it is
 * added once the reading experience is real rather than designed around up front.
 *
 * This file exists to mark the seam: sync is called from here, not from screens
 * or query modules.
 */

export async function sync(): Promise<void> {
  // Not implemented: see CLAUDE.md, "Supabase deferred".
}
