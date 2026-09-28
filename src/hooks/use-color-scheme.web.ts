import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};

/**
 * Web is statically rendered, so the colour scheme has to be recalculated on the
 * client. `useSyncExternalStore` is how React reports whether it is hydrating —
 * the server snapshot is false, the client snapshot true — which avoids setting
 * state from an effect just to learn the same thing.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
