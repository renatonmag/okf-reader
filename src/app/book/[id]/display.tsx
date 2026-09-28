/**
 * Per-book display settings.
 *
 * Every control writes an override into `book_settings`; null means "inherit the
 * global value". This is also where a format's capabilities finally reach the UI —
 * a PDF greys out the type controls rather than accepting a font size it will ignore.
 */

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { OptionRow, StepperRow } from '@/components/setting-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getBook } from '@/db/queries/books';
import { bookSettingsQuery, resolveSettings, setBookSettings } from '@/db/queries/settings';
import type { Book } from '@/db/types';
import { adapterFor } from '@/formats/registry';
import type { FormatCapabilities } from '@/formats/types';
import { supportsPageFilter } from '@/reader/renderers/pdf-theme';
import { useSettings } from '@/stores/settings';
import {
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
  LINE_SPACING_RANGE,
  MARGIN_RANGE,
  type ThemeName,
} from '@/theme/reader-themes';

const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

/** Clears every override at once, so an override is not a one-way door. */
const NO_OVERRIDES = {
  fontFamily: null,
  fontSize: null,
  lineSpacing: null,
  margin: null,
  theme: null,
  readingMode: null,
};

export default function DisplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const globalSettings = useSettings();
  const [book, setBook] = useState<Book | null>(null);

  const { data: overrides } = useLiveQuery(bookSettingsQuery(id), [id]);
  const override = overrides?.[0] ?? null;
  const settings = resolveSettings(globalSettings, override);

  useEffect(() => {
    let cancelled = false;
    void getBook(id).then((loaded) => {
      if (!cancelled) setBook(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!book) return <View style={styles.content} />;

  const capabilities: FormatCapabilities = adapterFor(book.format).capabilities;
  // Fixed layout means the type controls do nothing — margin included, since there is
  // no text to re-wrap inside it.
  const typeDisabled = !capabilities.fontScaling;
  const tintable = capabilities.theming && supportsPageFilter(Platform.OS, Platform.Version);

  const update = (patch: Parameters<typeof setBookSettings>[1]) => void setBookSettings(id, patch);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="small" themeColor="textSecondary">
        {book.title}
      </ThemedText>

      <Section title="Type">
        <OptionRow
          label="Font"
          options={FONT_FAMILIES}
          value={settings.fontFamily}
          disabled={typeDisabled}
          onChange={(fontFamily) => update({ fontFamily })}
        />
        <StepperRow
          label="Size"
          value={settings.fontSize}
          range={FONT_SIZE_RANGE}
          format={(value) => `${value}pt`}
          disabled={typeDisabled}
          onChange={(fontSize) => update({ fontSize })}
        />
        <StepperRow
          label="Line spacing"
          value={settings.lineSpacing}
          range={LINE_SPACING_RANGE}
          format={(value) => value.toFixed(1)}
          disabled={typeDisabled}
          onChange={(lineSpacing) => update({ lineSpacing })}
        />
        <StepperRow
          label="Margin"
          value={settings.margin}
          range={MARGIN_RANGE}
          format={(value) => `${value}`}
          disabled={typeDisabled}
          onChange={(margin) => update({ margin })}
        />
        {typeDisabled && (
          <ThemedText type="small" themeColor="textSecondary">
            {book.format.toUpperCase()} has a fixed layout, so type settings do not apply.
          </ThemedText>
        )}
      </Section>

      <Section title="Page">
        <OptionRow
          label="Theme"
          options={THEMES}
          value={settings.theme}
          disabled={!capabilities.theming}
          onChange={(theme) => update({ theme })}
        />
        <OptionRow
          label="Mode"
          options={[
            { id: 'paged' as const, label: 'Pages' },
            { id: 'scroll' as const, label: 'Scroll' },
          ]}
          value={settings.readingMode}
          disabled={!capabilities.scrollMode}
          onChange={(readingMode) => update({ readingMode })}
        />
        {capabilities.theming && !tintable && (
          <ThemedText type="small" themeColor="textSecondary">
            Tinting the page itself needs Android 12 or newer. The theme still applies to
            everything around it.
          </ThemedText>
        )}
      </Section>

      {override && (
        <Pressable onPress={() => update(NO_OVERRIDES)} hitSlop={8} style={styles.reset}>
          <ThemedText type="smallBold">Use global defaults</ThemedText>
        </Pressable>
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        These apply to this book only. Change the defaults for every book from Display on
        the library screen.
      </ThemedText>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four },
  section: { gap: Spacing.two },
  reset: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  footnote: { paddingBottom: Spacing.five },
});
