import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getBook, touchBook } from '@/db/queries/books';
import { getReadingState } from '@/db/queries/reading-state';
import { bookSettingsQuery, resolveSettings } from '@/db/queries/settings';
import type { Book } from '@/db/types';
import { adapterFor } from '@/formats/registry';
import { parseLocator, serializeLocator, startOf, type Locator } from '@/reader/locator';
import { ReaderSurface } from '@/reader/renderers/reader-surface';
import { useReadingPosition } from '@/reader/use-reading-position';
import { useSettings } from '@/stores/settings';
import { readerTheme } from '@/theme/reader-themes';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const globalSettings = useSettings();

  const [book, setBook] = useState<Book | null>(null);
  const [locator, setLocator] = useState<Locator | null>(null);

  // Live rather than read once: the display sheet is a modal over this screen, so an
  // override has to reach the mounted renderer. Keeping it out of the effect below
  // also stops a global settings change from re-running the loader and resetting the
  // locator to the last *saved* position, which would jump the reader backwards.
  const { data: overrides } = useLiveQuery(bookSettingsQuery(id), [id]);
  const settings = resolveSettings(globalSettings, overrides?.[0] ?? null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const loaded = await getBook(id);
      if (!loaded || cancelled) return;

      const state = await getReadingState(id);
      if (cancelled) return;

      setBook(loaded);
      // A saved position that no longer parses drops the reader at the start
      // rather than failing to open the book at all.
      setLocator(
        (state?.locator ? parseLocator(state.locator) : null) ?? startOf(loaded.format),
      );

      void touchBook(id);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Saves on a debounce and flushes when the app backgrounds, so being killed
  // never costs more than a few seconds of reading.
  const { report } = useReadingPosition(id);

  const onPosition = useCallback(
    (next: Locator, progress: number) => report(serializeLocator(next), progress),
    [report],
  );

  if (!book || !locator) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const page = readerTheme(settings.theme);
  const capabilities = adapterFor(book.format).capabilities;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: page.background }]}>
      <Stack.Screen options={{ title: book.title }} />
      <StatusBar style={page.statusBarStyle} />

      <View style={styles.bar}>
        <Link href=".." asChild>
          <Pressable hitSlop={8}>
            <ThemedText type="small" style={{ color: page.textSecondary }}>
              Library
            </ThemedText>
          </Pressable>
        </Link>
        <View style={styles.barActions}>
          {capabilities.toc && (
            <Link href={`/book/${book.id}/toc`} asChild>
              <Pressable hitSlop={8}>
                <ThemedText type="small" style={{ color: page.textSecondary }}>
                  Contents
                </ThemedText>
              </Pressable>
            </Link>
          )}
          <Link href={`/book/${book.id}/search`} asChild>
            <Pressable hitSlop={8}>
              <ThemedText type="small" style={{ color: page.textSecondary }}>
                Search
              </ThemedText>
            </Pressable>
          </Link>
          <Link href={`/book/${book.id}/display`} asChild>
            <Pressable hitSlop={8}>
              <ThemedText type="small" style={{ color: page.textSecondary }}>
                Display
              </ThemedText>
            </Pressable>
          </Link>
        </View>
      </View>

      <ReaderSurface
        book={book}
        initialLocator={locator}
        settings={settings}
        theme={page}
        onPosition={onPosition}
        fallback={
          <View style={[styles.page, { paddingHorizontal: settings.margin }]}>
            <ThemedText
              style={{
                color: page.text,
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineSpacing,
              }}>
              {book.title}
            </ThemedText>
            <ThemedText type="small" style={{ color: page.textSecondary }}>
              {book.format.toUpperCase()} · {settings.readingMode === 'paged' ? 'Pages' : 'Scroll'}
            </ThemedText>
            <ThemedText type="small" style={{ color: page.textSecondary }}>
              No renderer for this format yet.
            </ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  barActions: { flexDirection: 'row', gap: Spacing.three },
  page: { flex: 1, justifyContent: 'center', gap: Spacing.two },
});
