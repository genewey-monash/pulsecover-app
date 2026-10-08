import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Small wrappers so a storage failure never crashes the app. */
export const kv = {
  async get(key: string): Promise<string | null> {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  async set(key: string, value: string): Promise<void> {
    try { await AsyncStorage.setItem(key, value); } catch { /* ignore */ }
  },
  async del(key: string): Promise<void> {
    try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
  },
};

/** Secrets (the session token) live in the OS keystore on phones. */
export const secret = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return await AsyncStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') await AsyncStorage.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch { /* ignore */ }
  },
  async del(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch { /* ignore */ }
  },
};
