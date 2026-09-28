/**
 * Saving the reading position without writing to SQLite on every scroll frame.
 *
 * The renderer reports the current locator freely; this debounces the write, and
 * flushes it whenever the app leaves the foreground or the reader unmounts. That
 * is the part that matters: a book is usually left by backgrounding or swiping
 * away the app, not by tidily navigating back, and a process kill after that must
 * not cost the reader their place.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { saveReadingState } from '@/db/queries/reading-state';

const SAVE_DEBOUNCE_MS = 1_500;

export function useReadingPosition(bookId: string) {
  const pending = useRef<{ locator: string; progress: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    await saveReadingState(bookId, next.locator, next.progress);
  }, [bookId]);

  const report = useCallback(
    (locator: string, progress: number) => {
      pending.current = { locator, progress };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flush();
    });

    return () => {
      subscription.remove();
      void flush();
    };
  }, [flush]);

  return { report, flush };
}
