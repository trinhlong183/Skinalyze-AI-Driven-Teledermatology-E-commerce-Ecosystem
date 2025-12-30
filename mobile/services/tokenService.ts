import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

class TokenService {
  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      ("✅ Token saved securely");
    } catch (error) {
      console.error("Error saving token:", error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        ("✅ Token retrieved:", token.substring(0, 30) + "...");
      } else {
        ("⚠️ No token found in secure store");
      }
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      ("✅ Token removed");
    } catch (error) {
      console.error("Error removing token:", error);
      throw error;
    }
  }

  async saveRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error("Error saving refresh token:", error);
      throw error;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Error getting refresh token:", error);
      return null;
    }
  }

  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Error removing refresh token:", error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeRefreshToken();
  }
}

export const tokenService = new TokenService();
export default tokenService;
