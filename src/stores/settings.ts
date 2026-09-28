/**
 * Display settings, held in memory for the reader to read on every frame and
 * written through to SQLite so they survive a restart.
 *
 * SQLite stays the source of truth: this store is a cache that is loaded from it
 * on boot and updated optimistically, never the other way round.
 */

import { create } from 'zustand';

import {
  DEFAULT_SETTINGS,
  loadAppSettings,
  updateAppSettings,
} from '@/db/queries/settings';
import type { AppSettings } from '@/db/types';

type SettingsPatch = Partial<Omit<AppSettings, 'id'>>;

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  /** Called once at boot, after migrations. */
  load: () => Promise<void>;
  /** Applies immediately, then persists — the UI never waits on a write. */
  update: (patch: SettingsPatch) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await loadAppSettings();
    set({ settings, loaded: true });
  },

  update: async (patch) => {
    const previous = get().settings;
    set({ settings: { ...previous, ...patch } });
    try {
      await updateAppSettings(patch);
    } catch (error) {
      set({ settings: previous });
      throw error;
    }
  },
}));

/** Convenience selector for the common case of reading the current settings. */
export function useSettings(): AppSettings {
  return useSettingsStore((state) => state.settings);
}
