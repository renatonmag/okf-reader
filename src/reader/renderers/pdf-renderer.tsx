/**
 * The PDF reader surface, wrapping react-native-pdf.
 *
 * Most of the care here is about that library's quirks rather than about PDFs:
 *
 *  - `page` is an *initial* page. `componentDidUpdate` only diffs `source`, and
 *    Android feeds `page` to the configurator at load time. Jumps therefore go through
 *    the imperative `setPage`, and switching reading mode remounts with a fresh
 *    initial page rather than driving the prop.
 *  - `onPageChanged` fires during layout, before the document has finished loading.
 *    Reporting those would overwrite a saved position with page 1 — the single worst
 *    bug available here — so every report is gated on `onLoadComplete`.
 *  - pdfium has open reports of a native crash on close and an "Already closed"
 *    exception during scroll, neither catchable from JS. The mitigation is to remove
 *    the conditions: never call `setPage` before load or after unmount, coalesce rapid
 *    jumps, and remount as rarely as possible.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { saveToc } from '@/db/queries/toc';
import { normalizeOutline } from '@/formats/pdf/outline';
import { useJumpStore, useReturnDepth } from '@/reader/jump-store';
import { pageFilter, supportsPageFilter } from '@/reader/renderers/pdf-theme';
import type { ReaderRendererProps } from '@/reader/renderers/types';
import { resolveThemeName } from '@/theme/reader-themes';

/** Long enough to swallow a double tap on a contents row, short enough to feel instant. */
const JUMP_LOCKOUT_MS = 250;

/**
 * How long to let the native view settle on its initial page after load before
 * believing its page reports. Android emits onPageChanged during layout, *after*
 * onLoadComplete has already fired — observed landing on page 23 of a 24-page document
 * — so loading alone is not enough of a gate.
 */
const SETTLE_MS = 500;

const PAGED = { horizontal: true, enablePaging: true, fitPolicy: 2 as const, spacing: 0 };
const SCROLL = { horizontal: false, enablePaging: false, fitPolicy: 0 as const, spacing: 8 };

export function PdfRenderer({
  book,
  initialLocator,
  settings,
  theme,
  onPosition,
}: ReaderRendererProps) {
  const pdf = useRef<React.ComponentRef<typeof Pdf>>(null);
  const savedPage = initialLocator.scheme === 'pdf' ? initialLocator.page : 1;

  const [loaded, setLoaded] = useState(false);
  /** State twin of `settledRef`, so the jump effect re-runs when the view comes to rest. */
  const [settled, setSettled] = useState(false);
  const [page, setPage] = useState(savedPage);
  const [total, setTotal] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  // `loaded` is mirrored into a ref because onPageChanged needs the value
  // synchronously, while the jump effect needs it as a dependency.
  const loadedRef = useRef(false);
  /**
   * True once the view has actually come to rest on the page we asked it to open at.
   * A ref as well as state because onPageChanged has to consult it synchronously.
   */
  const settledRef = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pageRef = useRef(savedPage);
  const jumpBusyRef = useRef(false);
  const appliedNonceRef = useRef(0);

  /**
   * What the native view is mounted with. Only ever changes on an explicit user
   * action — never while scrolling — because each change is a remount, and remounts
   * are what pdfium crashes on.
   */
  const [mount, setMount] = useState({
    axis: settings.readingMode,
    page: savedPage,
    attempt: 0,
  });

  useEffect(() => {
    if (mount.axis !== settings.readingMode) {
      // Reopen at wherever the reader actually is, not where they started.
      setMount({ axis: settings.readingMode, page: pageRef.current, attempt: 0 });
      setLoaded(false);
      loadedRef.current = false;
      settledRef.current = false;
      setSettled(false);
    }
  }, [settings.readingMode, mount.axis]);

  useEffect(() => {
    mountedRef.current = true;
    const { clearJumps } = useJumpStore.getState();
    return () => {
      mountedRef.current = false;
      if (settleTimer.current) clearTimeout(settleTimer.current);
      clearJumps(book.id);
    };
  }, [book.id]);

  const request = useJumpStore((state) => state.request);
  const returnDepth = useReturnDepth(book.id);

  // Applies a pending jump. A request that arrives before the document is ready is
  // deliberately left unconsumed — `loaded` is a dependency, so it lands on load.
  useEffect(() => {
    if (!request || request.bookId !== book.id) return;
    if (!loaded || !settled || jumpBusyRef.current) return;
    if (request.nonce === appliedNonceRef.current) return;

    appliedNonceRef.current = request.nonce;

    const { pushReturn, consume } = useJumpStore.getState();
    pushReturn(book.id, { scheme: 'pdf', page: pageRef.current, offset: 0 });
    if (mountedRef.current) pdf.current?.setPage(request.page);
    consume(book.id);

    jumpBusyRef.current = true;
    const timer = setTimeout(() => {
      jumpBusyRef.current = false;
    }, JUMP_LOCKOUT_MS);
    return () => clearTimeout(timer);
  }, [request, loaded, settled, book.id]);

  const goBack = useCallback(() => {
    const target = useJumpStore.getState().popReturn(book.id);
    if (target !== null && mountedRef.current) pdf.current?.setPage(target);
  }, [book.id]);

  const handleLoadComplete = useCallback(
    (numberOfPages: number, _path: string, _size: unknown, tableContents?: unknown) => {
      loadedRef.current = true;
      setLoaded(true);
      setTotal(numberOfPages);

      // Harvest the outline while we have a document open — this is the only place
      // pdfium exposes it. Failure costs the contents list, never the read.
      void saveToc(book.id, normalizeOutline(tableContents, numberOfPages)).catch(() => {});

      // Android keeps laying out after this callback and emits page changes while it
      // does. Give it a moment, then insist on the page we were asked to open at and
      // start trusting its reports.
      const target = Math.min(Math.max(mount.page, 1), Math.max(numberOfPages, 1));
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        if (!mountedRef.current) return;
        if (pageRef.current !== target) pdf.current?.setPage(target);
        pageRef.current = target;
        setPage(target);
        settledRef.current = true;
        setSettled(true);
      }, SETTLE_MS);
    },
    [book.id, mount.page],
  );

  const handlePageChanged = useCallback(
    (next: number, numberOfPages: number) => {
      // Until the view has settled these are layout artefacts, not the reader moving.
      // Reporting them would overwrite a saved position hundreds of pages in with
      // whatever page the layout pass happened to touch.
      if (!loadedRef.current) return;

      if (!settledRef.current) {
        // Landing on the page we asked for is the settle signal — no need to wait out
        // the timer.
        if (next === mount.page) {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settledRef.current = true;
          setSettled(true);
          pageRef.current = next;
          setPage(next);
        }
        return;
      }

      pageRef.current = next;
      setPage(next);
      // next / total, not (next - 1) / (total - 1), so the last page reads 100%.
      if (numberOfPages > 0) {
        onPosition({ scheme: 'pdf', page: next, offset: 0 }, next / numberOfPages);
      }
    },
    [onPosition, mount.page],
  );

  const retry = useCallback(() => {
    setFailure(null);
    setLoaded(false);
    loadedRef.current = false;
    settledRef.current = false;
    setSettled(false);
    setMount((previous) => ({ ...previous, page: pageRef.current, attempt: previous.attempt + 1 }));
  }, []);

  const layout = mount.axis === 'paged' ? PAGED : SCROLL;
  const themed = supportsPageFilter(Platform.OS, Platform.Version)
    ? pageFilter(resolveThemeName(settings.theme))
    : undefined;

  if (failure) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="subtitle" style={{ color: theme.text }}>
          Could not open this PDF
        </ThemedText>
        <ThemedText type="small" style={[styles.reason, { color: theme.textSecondary }]}>
          {failure}
        </ThemedText>
        <Pressable onPress={retry} hitSlop={8} style={styles.retry}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            Try again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.surface, { backgroundColor: theme.background }]}>
      {/* The filter goes on a wrapper, not on <Pdf>'s own style: a filter set on a
          host component is likelier to be dropped in reconciliation.

          Nothing inside this wrapper may carry a themed colour — the filter inverts
          whatever it contains, so a dark background here comes out near-white. The
          page gutters are painted by the outer View instead, outside the filter. */}
      <View style={[styles.surface, themed ? { filter: themed } : null]}>
        <Pdf
          ref={pdf}
          // Only the layout axis and the retry counter. Never theme or type settings —
          // every change here is a remount of a native pdfium view.
          key={`${mount.axis}:${mount.attempt}`}
          source={{ uri: book.filePath, cache: false }}
          page={mount.page}
          {...layout}
          minScale={1}
          maxScale={4}
          enableDoubleTapZoom
          // Left on, but the first thing to turn off if crash reports arrive:
          // pdfium's known segfaults cluster in annotation rendering.
          enableAnnotationRendering
          trustAllCerts={false}
          style={styles.pdf}
          onLoadComplete={handleLoadComplete}
          onPageChanged={handlePageChanged}
          onLoadProgress={(value) =>
            // Named percent, implemented as a fraction. Accept either.
            setProgressPercent(Math.round((value <= 1 ? value * 100 : value)))
          }
          onError={(error: unknown) =>
            setFailure(error instanceof Error ? error.message : 'The file could not be read.')
          }
        />
      </View>

      {!loaded && (
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={theme.accent} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {progressPercent > 0 ? `Opening… ${progressPercent}%` : 'Opening…'}
          </ThemedText>
        </View>
      )}

      <View style={styles.pills} pointerEvents="box-none">
        {returnDepth > 0 && (
          <Pressable
            onPress={goBack}
            hitSlop={8}
            style={[styles.pill, { backgroundColor: theme.border }]}>
            <ThemedText type="small" style={{ color: theme.text }}>
              Back
            </ThemedText>
          </Pressable>
        )}
        {total > 0 && (
          <View style={[styles.pill, { backgroundColor: theme.border }]}>
            <ThemedText type="small" style={{ color: theme.text }}>
              {page} / {total} · {Math.round((page / total) * 100)}%
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1 },
  // Transparent so the themed background of the (unfiltered) outer view shows through.
  pdf: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  reason: { textAlign: 'center', paddingHorizontal: Spacing.four },
  retry: { padding: Spacing.two },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  pills: {
    position: 'absolute',
    bottom: Spacing.three,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    opacity: 0.9,
  },
});
