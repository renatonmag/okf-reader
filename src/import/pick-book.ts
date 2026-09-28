/**
 * The document-picker entry point into the import pipeline. Android's SAF picker
 * and iOS's UIDocumentPicker are both behind this one call.
 */

import * as DocumentPicker from 'expo-document-picker';

import { importBook, type ImportResult } from '@/import/import-book';

/** Kept in step with the intent filters and document types in app.config.ts. */
const BOOK_MIME_TYPES = [
  'application/epub+zip',
  'application/pdf',
  'application/x-mobipocket-ebook',
];

/** Returns null when the user dismisses the picker. */
export async function pickAndImportBook(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: BOOK_MIME_TYPES,
    // Copying is handled by importBook, which needs to own the destination path.
    copyToCacheDirectory: false,
    multiple: false,
  });

  if (result.canceled) return null;

  const [asset] = result.assets;
  if (!asset) return null;

  return importBook(asset.uri);
}
