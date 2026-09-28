import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { annotations } from '@/db/schema';
import type { Annotation, AnnotationRow } from '@/db/types';

/**
 * Rows come back as the raw table shape; the union in `@/db/types` is the app-level
 * view of them. The cast is the one place the discriminator is trusted, and it holds
 * because nothing writes to this table except the helpers below.
 */
function toAnnotations(rows: AnnotationRow[]): Annotation[] {
  return rows as Annotation[];
}

export function annotationsQuery(bookId: string, kind?: Annotation['kind']) {
  return db
    .select()
    .from(annotations)
    .where(
      kind
        ? and(eq(annotations.bookId, bookId), eq(annotations.kind, kind))
        : eq(annotations.bookId, bookId),
    )
    .orderBy(desc(annotations.createdAt));
}

export async function listAnnotations(bookId: string, kind?: Annotation['kind']) {
  return toAnnotations(await annotationsQuery(bookId, kind));
}

export async function addBookmark(bookId: string, locator: string, textSnippet: string | null) {
  await db.insert(annotations).values({
    id: randomUUID(),
    bookId,
    kind: 'bookmark',
    locatorStart: locator,
    textSnippet,
  });
}

export async function addHighlight(
  bookId: string,
  locatorStart: string,
  locatorEnd: string,
  textSnippet: string,
  color: string,
) {
  const id = randomUUID();
  await db.insert(annotations).values({
    id,
    bookId,
    kind: 'highlight',
    locatorStart,
    locatorEnd,
    textSnippet,
    color,
  });
  return id;
}

/** A note either hangs off a highlight (`parentId`) or sits at a bare locator. */
export async function addNote(
  bookId: string,
  locatorStart: string,
  noteBody: string,
  parentId: string | null = null,
) {
  await db.insert(annotations).values({
    id: randomUUID(),
    bookId,
    kind: 'note',
    locatorStart,
    noteBody,
    parentId,
  });
}

export async function deleteAnnotation(id: string) {
  await db.delete(annotations).where(eq(annotations.id, id));
}
