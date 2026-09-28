import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getBook } from '@/db/queries/books';
import { adapterFor } from '@/formats/registry';
import { NotImplementedError, type TocEntry } from '@/formats/types';

export default function TocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entries, setEntries] = useState<readonly TocEntry[]>([]);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const book = await getBook(id);
      if (!book || cancelled) return;

      const adapter = adapterFor(book.format);
      if (!adapter.capabilities.toc) {
        setUnavailable('This format has no table of contents.');
        return;
      }

      try {
        const toc = await adapter.extractToc(book.filePath);
        if (!cancelled) setEntries(toc);
      } catch (error) {
        if (cancelled) return;
        setUnavailable(
          error instanceof NotImplementedError
            ? `Contents for ${error.format.toUpperCase()} files are not built yet.`
            : 'Could not read the contents of this book.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (unavailable) {
    return (
      <View style={styles.centered}>
        <ThemedText themeColor="textSecondary">{unavailable}</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={flatten(entries)}
      keyExtractor={(entry) => entry.locator}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={{ paddingLeft: item.depth * Spacing.three }}>
          <ThemedText numberOfLines={2}>{item.label}</ThemedText>
        </View>
      )}
    />
  );
}

/** The TOC is nested; the list is flat, with depth carried as indentation. */
function flatten(entries: readonly TocEntry[], depth = 0): (TocEntry & { depth: number })[] {
  return entries.flatMap((entry) => [
    { ...entry, depth },
    ...flatten(entry.children, depth + 1),
  ]);
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.three },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
});
