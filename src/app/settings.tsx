import { ScrollView, StyleSheet, View } from 'react-native';

import { OptionRow, StepperRow } from '@/components/setting-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSettings, useSettingsStore } from '@/stores/settings';
import {
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
  LINE_SPACING_RANGE,
  MARGIN_RANGE,
  readerTheme,
  type ThemeName,
} from '@/theme/reader-themes';

const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const settings = useSettings();
  const update = useSettingsStore((state) => state.update);
  const preview = readerTheme(settings.theme);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View
        style={[
          styles.preview,
          { backgroundColor: preview.background, borderColor: preview.border },
        ]}>
        <ThemedText
          style={{
            color: preview.text,
            fontSize: settings.fontSize,
            lineHeight: settings.fontSize * settings.lineSpacing,
            paddingHorizontal: settings.margin,
          }}>
          The quick brown fox jumps over the lazy dog, and settles in to read.
        </ThemedText>
      </View>

      <Section title="Type">
        <OptionRow
          label="Font"
          options={FONT_FAMILIES}
          value={settings.fontFamily}
          onChange={(fontFamily) => void update({ fontFamily })}
        />
        <StepperRow
          label="Size"
          value={settings.fontSize}
          range={FONT_SIZE_RANGE}
          format={(value) => `${value}pt`}
          onChange={(fontSize) => void update({ fontSize })}
        />
        <StepperRow
          label="Line spacing"
          value={settings.lineSpacing}
          range={LINE_SPACING_RANGE}
          format={(value) => value.toFixed(1)}
          onChange={(lineSpacing) => void update({ lineSpacing })}
        />
        <StepperRow
          label="Margin"
          value={settings.margin}
          range={MARGIN_RANGE}
          format={(value) => `${value}`}
          onChange={(margin) => void update({ margin })}
        />
      </Section>

      <Section title="Page">
        <OptionRow
          label="Theme"
          options={THEMES.map(({ id, label }) => ({ id, label }))}
          value={settings.theme}
          onChange={(theme) => void update({ theme })}
        />
        <OptionRow
          label="Mode"
          options={[
            { id: 'paged', label: 'Pages' },
            { id: 'scroll', label: 'Scroll' },
          ]}
          value={settings.readingMode}
          onChange={(readingMode) => void update({ readingMode })}
        />
      </Section>

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        These are the defaults for every book. A book can override them from its own
        reader menu, and fixed-layout PDFs ignore the type settings.
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
  preview: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.four,
    minHeight: 120,
    justifyContent: 'center',
  },
  section: { gap: Spacing.two },
  footnote: { paddingBottom: Spacing.five },
});
