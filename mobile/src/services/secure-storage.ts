import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;
const serverStorage = new Map<string, string>();

function nativeKey(key: string) {
  return `yacheck.secure.${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function webStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

async function readNative(key: string) {
  const prefix = nativeKey(key);
  const count = Number(await SecureStore.getItemAsync(`${prefix}.count`) ?? '0');
  if (!count) return null;
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${prefix}.${index}`)),
  );
  return chunks.every((chunk) => chunk !== null) ? chunks.join('') : null;
}

async function removeNative(key: string) {
  const prefix = nativeKey(key);
  const count = Number(await SecureStore.getItemAsync(`${prefix}.count`) ?? '0');
  await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${prefix}.${index}`)),
  );
  await SecureStore.deleteItemAsync(`${prefix}.count`);
}

async function writeNative(key: string, value: string) {
  await removeNative(key);
  const prefix = nativeKey(key);
  const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [];
  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${prefix}.${index}`, chunk)));
  await SecureStore.setItemAsync(`${prefix}.count`, String(chunks.length));
}

export const secureStateStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return webStorage()?.getItem(key) ?? serverStorage.get(key) ?? null;
    const secured = await readNative(key);
    if (secured !== null) return secured;

    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await writeNative(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      const storage = webStorage();
      if (storage) storage.setItem(key, value);
      else serverStorage.set(key, value);
      return;
    }
    await writeNative(key, value);
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      webStorage()?.removeItem(key);
      serverStorage.delete(key);
      return;
    }
    await removeNative(key);
    await AsyncStorage.removeItem(key);
  },
};
