import { Stack } from 'expo-router';

export default function BookLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="toc" options={{ title: 'Contents', presentation: 'modal' }} />
      <Stack.Screen name="search" options={{ title: 'Search', presentation: 'modal' }} />
      <Stack.Screen name="display" options={{ title: 'Display', presentation: 'modal' }} />
    </Stack>
  );
}
