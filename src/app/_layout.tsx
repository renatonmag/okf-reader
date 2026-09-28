import '@/global.css';

import { PortalHost } from '@rn-primitives/portal';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { Spacing } from '@/constants/theme';
import { NAV_THEME } from '@/lib/theme';
import { useSettingsStore } from '@/stores/settings';

// Not awaited, and nothing to do if it rejects — the splash is cosmetic and the
// screen renders either way.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Uniwind owns the active theme, so navigation chrome follows the same source as classNames.
  const { theme } = useUniwind();
  const { success, error } = useMigrations(db, migrations);
  const loadSettings = useSettingsStore((state) => state.load);
  const settingsLoaded = useSettingsStore((state) => state.loaded);

  // Settings live in SQLite, so they can only be read once migrations have run.
  useEffect(() => {
    if (success) void loadSettings();
  }, [success, loadSettings]);

  const ready = success && settingsLoaded;

  useEffect(() => {
    if (ready || error) void SplashScreen.hideAsync();
  }, [ready, error]);

  if (error) {
    return (
      <View style={styles.centered}>
        <ThemedText type="subtitle">Could not open your library</ThemedText>
        <ThemedText themeColor="textSecondary">{error.message}</ThemedText>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
      <Stack>
        {/* The library draws its own top bar: it swaps for a selection bar on long press,
            which a native header cannot do without stacking two bars. */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Display' }} />
        <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
      </Stack>
      {/* Where portalled surfaces (dialog, dropdown, tooltip) mount. Must be last. */}
      <PortalHost />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
});
