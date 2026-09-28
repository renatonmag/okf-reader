import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getBook, touchBook } from '@/db/queries/books';
import { getReadingState } from '@/db/queries/reading-state';
import { getBookSettings, resolveSettings } from '@/db/queries/settings';
import type { AppSettings, Book } from '@/db/types';
import { adapterFor } from '@/formats/registry';
import { useReadingPosition } from '@/reader/use-reading-position';
import { parseLocator, serializeLocator, startOf, type Locator } from '@/reader/locator';
import { useSettings } from '@/stores/settings';
import { readerTheme } from '@/theme/reader-themes';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const globalSettings = useSettings();

  const [book, setBook] = useState<Book | null>(null);
  const [settings, setSettings] = useState<AppSettings>(globalSettings);
  const [locator, setLocator] = useState<Locator | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const loaded = await getBook(id);
      if (!loaded || cancelled) return;

      const [state, override] = await Promise.all([
        getReadingState(id),
        getBookSettings(id),
      ]);
      if (cancelled) return;

      setBook(loaded);
      setSettings(resolveSettings(globalSettings, override));
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
  }, [id, globalSettings]);

  // Saves on a debounce and flushes when the app backgrounds, so being killed
  // never costs more than a few seconds of reading.
  const { report } = useReadingPosition(id);

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
        </View>
      </View>

      {/*
        Where the rendered book goes. The surrounding machinery — resolved
        settings, theme, locator, position saving — is real; only the renderer
        for each format is still to be written.
      */}
      <Pressable
        style={[styles.page, { paddingHorizontal: settings.margin }]}
        onPress={() => report(serializeLocator(locator), 0)}>
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
      </Pressable>
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
