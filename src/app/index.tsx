import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Trash, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { libraryQuery, type LibrarySort } from '@/db/queries/books';
import type { LibraryEntry } from '@/db/types';
import { NotImplementedError } from '@/formats/types';
import { useTheme } from '@/hooks/use-theme';
import { UnsupportedFileError } from '@/import/import-book';
import { pickAndImportBook } from '@/import/pick-book';
import { removeBook } from '@/library/remove-book';

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
  // Non-empty means the screen is in selection mode: the toolbar becomes a selection
  // bar and a tap toggles instead of opening.
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const selecting = selected.size > 0;

  // Live: re-runs on any write to books or reading_state, so an import shows up
  // without the screen having to invalidate anything.
  const { data: books } = useLiveQuery(libraryQuery(sort), [sort]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectBook = useCallback((id: string) => {
    setSelected((current) => new Set(current).add(id));
  }, []);

  const toggleBook = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const changeSort = useCallback((id: LibrarySort) => {
    setSort(id);
    setSelected(new Set());
  }, []);

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

  const deleteSelected = useCallback(async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map(removeBook));
    } catch (error) {
      Alert.alert('Could not delete', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Always, even on failure: the ids may already be gone, and a bar left reading
      // "1 selected" over a book that is no longer there is worse than the error alert.
      setSelected(new Set());
    }
  }, [selected]);

  const confirmDelete = useCallback(() => {
    const count = selected.size;
    const only = count === 1 ? books?.find((book) => selected.has(book.id)) : undefined;
    Alert.alert(
      count === 1 ? 'Delete book' : `Delete ${count} books`,
      `${only ? `“${only.title}”` : `${count} books`} will be removed from your library, and the ${
        count === 1 ? 'file' : 'files'
      } deleted from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteSelected() },
      ],
    );
  }, [books, selected, deleteSelected]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* One bar at a time: the selection bar takes the toolbar's place rather than
          stacking above it, so the grid does not shift on a long press. */}
      {selecting ? (
        <View style={styles.selectionBar}>
          <Pressable
            onPress={clearSelection}
            hitSlop={Spacing.three}
            accessibilityRole="button"
            accessibilityLabel="Cancel selection">
            <X size={ICON_SIZE} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.selectionCount}>
            {selected.size} selected
          </ThemedText>
          <Pressable
            onPress={confirmDelete}
            hitSlop={Spacing.three}
            accessibilityRole="button"
            accessibilityLabel="Delete selected books">
            <Trash size={ICON_SIZE} color={DESTRUCTIVE} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.toolbar}>
          <View style={styles.sorts}>
            {SORTS.map(({ id, label }) => (
              <Pressable
                key={id}
                onPress={() => changeSort(id)}
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
              <Button variant="secondary" className="flex-1">
                <Text>Display</Text>
              </Button>
            </Link>
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => void onImport()}
              disabled={importing}>
              <Text>{importing ? 'Importing…' : 'Import'}</Text>
            </Button>
          </View>
        </View>
      )}

      <FlatList
        data={books}
        keyExtractor={(book) => book.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<EmptyLibrary />}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            selecting={selecting}
            isSelected={selected.has(item.id)}
            onSelect={selectBook}
            onToggle={toggleBook}
          />
        )}
      />
    </SafeAreaView>
  );
}

function BookCard({
  book,
  selecting,
  isSelected,
  onSelect,
  onToggle,
}: {
  book: LibraryEntry;
  selecting: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onLongPress={() => onSelect(book.id)}
      onPress={() => (selecting ? onToggle(book.id) : router.push(`/book/${book.id}`))}>
      <View
        style={[
          styles.cover,
          { backgroundColor: theme.backgroundElement },
          isSelected && { borderWidth: 2, borderColor: theme.text, opacity: 0.6 },
        ]}>
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
const ICON_SIZE = 22;
const SELECTION_BAR_HEIGHT = 84;

/** The palette has no destructive colour, and one icon is not reason to widen it. */
const DESTRUCTIVE = '#e5484d';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  // Tall enough to stand in for the two-row toolbar without the grid jumping.
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: SELECTION_BAR_HEIGHT,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  selectionCount: { flex: 1 },
  sorts: { flexDirection: 'row', gap: Spacing.one },
  sortChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
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
