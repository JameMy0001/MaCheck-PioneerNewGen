import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const CHUNK_SIZE = 1800;
const serverStorage = new Map<string, string>();

function getWebStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

const secureStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return getWebStorage()?.getItem(key) ?? serverStorage.get(key) ?? null;
    const countRaw = await SecureStore.getItemAsync(`${key}.count`);
    if (!countRaw) return null;
    const count = Number(countRaw);
    const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}.${index}`)));
    return chunks.every((chunk) => chunk !== null) ? chunks.join('') : null;
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      if (storage) storage.setItem(key, value);
      else serverStorage.set(key, value);
      return;
    }
    await this.removeItem(key);
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [];
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${index}`, chunk)));
    await SecureStore.setItemAsync(`${key}.count`, String(chunks.length));
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(key);
      serverStorage.delete(key);
      return;
    }
    const count = Number(await SecureStore.getItemAsync(`${key}.count`) ?? '0');
    await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${index}`)));
    await SecureStore.deleteItemAsync(`${key}.count`);
  },
};

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT_REF'));

export const supabase = createClient(url || 'https://not-configured.invalid', anonKey || 'not-configured', {
  auth: {
    storage: secureStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
