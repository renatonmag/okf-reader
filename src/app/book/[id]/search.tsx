import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * In-book search is deferred whole — text extraction, the table to hold it, and
 * the FTS5 index all arrive together. The route exists so navigation out of the
 * reader is complete and the entry point does not move when it is built.
 */
export default function SearchScreen() {
  return (
    <View style={styles.centered}>
      <ThemedText type="subtitle">Search is not available yet</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        Searching inside a book needs its text extracted and indexed first. That lands
        with the format readers.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  body: { textAlign: 'center' },
});
