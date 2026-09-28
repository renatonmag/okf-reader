import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { libraryQuery, type LibrarySort } from '@/db/queries/books';
import type { LibraryEntry } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { pickAndImportBook } from '@/import/pick-book';
import { UnsupportedFileError } from '@/import/import-book';
import { NotImplementedError } from '@/formats/types';

const SORTS: { id: LibrarySort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'added', label: 'Added' },
  { id: 'title', label: 'Title' },
  { id: 'author', label: 'Author' },
];

export default function LibraryScreen() {
  const theme = useTheme();
  const [sort, setSort] = useState<LibrarySort>('recent');
  const [importing, setImporting] = useState(false);

  // Live: re-runs on any write to books or reading_state, so an import shows up
  // without the screen having to invalidate anything.
  const { data: books } = useLiveQuery(libraryQuery(sort), [sort]);

  const onImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await pickAndImportBook();
      if (result?.alreadyInLibrary) {
        Alert.alert('Already in your library', result.book.title);
      }
    } catch (error) {
      Alert.alert('Could not import', describeImportError(error));
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.toolbar}>
        <View style={styles.sorts}>
          {SORTS.map(({ id, label }) => (
            <Pressable
              key={id}
              onPress={() => setSort(id)}
              style={[
                styles.sortChip,
                {
                  backgroundColor:
                    id === sort ? theme.backgroundSelected : theme.backgroundElement,
                },
              ]}>
              <ThemedText type="small">{label}</ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Link href="/settings" asChild>
            <Pressable style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Display</ThemedText>
            </Pressable>
          </Link>
          <Pressable
            onPress={onImport}
            disabled={importing}
            style={[styles.button, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">{importing ? 'Importing…' : 'Import'}</ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={books}
        keyExtractor={(book) => book.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<EmptyLibrary />}
        renderItem={({ item }) => <BookCard book={item} />}
      />
    </SafeAreaView>
  );
}

function BookCard({ book }: { book: LibraryEntry }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/book/${book.id}`)}>
      <View style={[styles.cover, { backgroundColor: theme.backgroundElement }]}>
        {book.coverPath ? (
          <Image source={{ uri: book.coverPath }} style={styles.coverImage} contentFit="cover" />
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.coverFallback}>
            {book.format.toUpperCase()}
          </ThemedText>
        )}
        {book.progress > 0 && (
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.progressFill, { width: `${book.progress * 100}%` }]} />
          </View>
        )}
      </View>
      <ThemedText type="small" numberOfLines={2}>
        {book.title}
      </ThemedText>
      {book.author && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {book.author}
        </ThemedText>
      )}
    </Pressable>
  );
}

function EmptyLibrary() {
  return (
    <View style={styles.empty}>
      <ThemedText type="subtitle">Nothing here yet</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
        Import an EPUB, PDF or MOBI to get started — or share one to okf-reader from
        another app.
      </ThemedText>
    </View>
  );
}

/**
 * Import errors are the scaffold's most-used path, so they are worth naming
 * precisely rather than showing a generic failure.
 */
function describeImportError(error: unknown): string {
  if (error instanceof NotImplementedError) {
    return `Reading ${error.format.toUpperCase()} files is not built yet (${error.method}).`;
  }
  if (error instanceof UnsupportedFileError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

const COVER_ASPECT = 1.5;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  sorts: { flexDirection: 'row', gap: Spacing.one },
  sortChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  grid: { padding: Spacing.three, gap: Spacing.four, flexGrow: 1 },
  row: { gap: Spacing.three },
  card: { flex: 1 / 3, gap: Spacing.half },
  cover: {
    aspectRatio: 1 / COVER_ASPECT,
    borderRadius: Spacing.one,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  coverImage: { width: '100%', height: '100%' },
  coverFallback: { letterSpacing: 1 },
  progressTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  progressFill: { height: '100%', backgroundColor: '#3c87f7' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  emptyBody: { textAlign: 'center' },
});
