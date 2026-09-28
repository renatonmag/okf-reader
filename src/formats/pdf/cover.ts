/**
 * Renders page 1 of a PDF into a cover image.
 *
 * react-native-pdf can display a document but cannot export a page as a file, so this
 * is the one place `@dariyd/react-native-pdf-page-image` is used. It is imported
 * lazily and everything is wrapped: the package is small and maintained by one person,
 * so a linking failure or a breaking change must cost a cover thumbnail and nothing
 * more. Swapping it later means editing this file only.
 */

import { File } from 'expo-file-system';

import { COVERS_DIRECTORY, ensureDirectory } from '@/storage/paths';

/** That library indexes pages from 0, unlike `Locator` and react-native-pdf's `page`. */
const FIRST_PAGE = 0;

/** The library grid draws covers at about a third of screen width. */
const COVER_MAX_DIMENSION = 600;
const COVER_QUALITY = 80;

/**
 * Deferred so that merely importing the format registry never evaluates a TurboModule —
 * which is what keeps the adapter reachable from unit tests, and turns a linking
 * failure into a missing cover rather than a crash at boot.
 */
async function loadPdfPageImage() {
  return (await import('@dariyd/react-native-pdf-page-image')).default;
}

/** Renders page 1 into the covers directory. Returns null on any failure. */
export async function renderPdfCover(filePath: string, bookId: string): Promise<string | null> {
  let PdfPageImage: Awaited<ReturnType<typeof loadPdfPageImage>> | null = null;

  try {
    PdfPageImage = await loadPdfPageImage();
    await PdfPageImage.open(filePath);

    const page = await PdfPageImage.generate(filePath, FIRST_PAGE, undefined, {
      format: 'jpeg',
      quality: COVER_QUALITY,
      maxDimension: COVER_MAX_DIMENSION,
    });

    ensureDirectory(COVERS_DIRECTORY);

    const destination = new File(COVERS_DIRECTORY, `${bookId}.jpg`);

    // The module renders into the cache directory, which the OS may reclaim, so the
    // image is moved somewhere durable before anything else runs. `move` is the async
    // half of expo-file-system's move/moveSync pair: awaiting it is what orders it
    // before the close() below, and what keeps a failure inside this catch.
    await new File(page.uri).move(destination, { overwrite: true });

    // Only claim a cover that is actually on disk. A null coverPath renders the
    // library's format-letter tile, whereas a path to a missing file renders a blank
    // one — so a dangling cover_path is worse than no cover at all.
    if (!destination.exists) return null;

    return destination.uri;
  } catch {
    return null;
  } finally {
    // Runs last, and must: close() deletes every image generate() produced, so calling
    // it before the move completes would delete the file out from under it. It still
    // runs when generate() was what failed, which is the other reason it lives here.
    await PdfPageImage?.close(filePath).catch(() => {});
  }
}
