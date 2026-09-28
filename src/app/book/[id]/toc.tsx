import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getBook } from '@/db/queries/books';
import { getCachedToc } from '@/db/queries/toc';
import { adapterFor } from '@/formats/registry';
import { NotImplementedError, type TocEntry } from '@/formats/types';
import { useJumpStore } from '@/reader/jump-store';
import { parseLocator } from '@/reader/locator';

interface Row {
  /** Position in the tree. The locator cannot be the key — two entries may share one. */
  readonly key: string;
  readonly label: string;
  readonly locator: string;
  readonly depth: number;
}

export default function TocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
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

      // A PDF's outline only exists on a mounted renderer, so it is harvested when the
      // book is opened and read from the cache here.
      if (adapter.capabilities.tocSource === 'renderer') {
        const cached = await getCachedToc(id);
        if (cancelled) return;
        if (cached === null) {
          setUnavailable('Open this book once and its contents will appear here.');
        } else if (cached.length === 0) {
          setUnavailable('This document has no outline.');
        } else {
          setRows(flatten(cached));
        }
        return;
      }

      try {
        const toc = await adapter.extractToc(book.filePath);
        if (cancelled) return;
        if (toc.length === 0) setUnavailable('This document has no outline.');
        else setRows(flatten(toc));
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

  const jumpTo = useCallback(
    (raw: string) => {
      const locator = parseLocator(raw);
      if (!locator) return;
      // The reader is still mounted underneath this modal, which is why handing it the
      // request through the store works without reloading the document.
      useJumpStore.getState().requestJump(id, locator);
      router.back();
    },
    [id, router],
  );

  if (unavailable) {
    return (
      <View style={styles.centered}>
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {unavailable}
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={rows ?? []}
      keyExtractor={(row) => row.key}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => jumpTo(item.locator)}
          style={{ paddingLeft: item.depth * Spacing.three }}>
          <ThemedText numberOfLines={2}>{item.label}</ThemedText>
        </Pressable>
      )}
    />
  );
}

/**
 * The TOC is nested; the list is flat, with depth carried as indentation.
 *
 * The key is a positional path ("0", "0.1", "0.1.2") rather than the locator, because
 * locators are legitimately not unique — "Part II" and "Chapter 4" can both start on
 * page 87.
 */
function flatten(entries: readonly TocEntry[], depth = 0, prefix = ''): Row[] {
  return entries.flatMap((entry, index) => {
    const key = prefix ? `${prefix}.${index}` : String(index);
    return [
      { key, label: entry.label, locator: entry.locator, depth },
      ...flatten(entry.children, depth + 1, key),
    ];
  });
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.three },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  message: { textAlign: 'center' },
});
