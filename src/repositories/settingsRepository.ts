import type { UserSettings } from '../schemas/types';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultHighlightColor: '#fef08a', // Yellow
  defaultTimestampOffset: 5, // 5 seconds reaction compensation
  autoOpenSidePanel: true,
  ai: {
    provider: 'builtin', // defaults to local Chrome Built-in AI with feature detection
    optInCloudProcessing: false, // Local-first, privacy-first: cloud disabled until user opts in
    cloudModel: 'gemini-2.5-flash',
    temperature: 0.3,
  },
  exportPreferences: {
    includeFrontmatter: true,
    defaultFormat: 'markdown',
  },
};

const STORAGE_KEY = 'acitya_user_settings';

export class SettingsRepository {
  static async getSettings(): Promise<UserSettings> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const result = await chrome.storage.sync.get(STORAGE_KEY);
        if (result && result[STORAGE_KEY]) {
          return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
        }
      } else if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(STORAGE_KEY);
        if (item) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(item) };
        }
      }
    } catch (e) {
      console.warn('Failed to load settings from storage, returning defaults:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  static async saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...settings,
      ai: {
        ...current.ai,
        ...(settings.ai || {}),
      },
      exportPreferences: {
        ...current.exportPreferences,
        ...(settings.exportPreferences || {}),
      },
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to persist settings:', e);
    }

    return updated;
  }
}
