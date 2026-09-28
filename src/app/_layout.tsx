import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/stores/settings';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Library' }} />
        <Stack.Screen name="settings" options={{ title: 'Display' }} />
        <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
      </Stack>
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
