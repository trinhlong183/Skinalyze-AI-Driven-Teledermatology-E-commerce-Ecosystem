import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_INFO: 'user_info',
  REFRESH_TOKEN: 'refresh_token',
};

/**
 * Storage service using SecureStore for iOS/Android and AsyncStorage for web
 */
class StorageService {
  /**
   * Save data securely
   */
  async saveSecure(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get secure data
   */
  async getSecure(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete secure data
   */
  async deleteSecure(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
    }
  }

  /**
   * Save access token
   */
  async saveAccessToken(token: string): Promise<void> {
    return this.saveSecure(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    return this.getSecure(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Delete access token
   */
  async deleteAccessToken(): Promise<void> {
    return this.deleteSecure(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Save user info
   */
  async saveUserInfo(userInfo: any): Promise<void> {
    return this.saveSecure(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<any | null> {
    const userInfo = await this.getSecure(STORAGE_KEYS.USER_INFO);
    if (userInfo) {
      try {
        return JSON.parse(userInfo);
      } catch (error) {
        console.error('Error parsing user info:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Delete user info
   */
  async deleteUserInfo(): Promise<void> {
    return this.deleteSecure(STORAGE_KEYS.USER_INFO);
  }

  /**
   * Clear all auth data
   */
  async clearAuth(): Promise<void> {
    await Promise.all([
      this.deleteAccessToken(),
      this.deleteUserInfo(),
      this.deleteSecure(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  }
}

export default new StorageService();
