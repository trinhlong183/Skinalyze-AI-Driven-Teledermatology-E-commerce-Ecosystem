import { BACKEND_URL } from "@/config/env";
import axios from "axios";
import StorageService from "./storage.service";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  statusCode: number;
  message: string;
  data: {
    access_token: string;
    refresh_token?: string;
    user: {
      userId: string;
      email: string;
      fullName?: string;
      phoneNumber?: string;
      role: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
  };
  timestamp: string;
}

class AuthService {
  private accessToken: string | null = null;
  private userInfo: any = null;

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse["data"]> {
    try {
      const response = await axios.post<LoginResponse>(
        `${BACKEND_URL}/api/v1/auth/login`,
        {
          email,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const { access_token, user, refresh_token } = response.data.data;

      console.log("User role:", user);
      // Kiểm tra role phải là STAFF
      if (user.role !== "staff") {
        throw new Error("Chỉ nhân viên mới có thể đăng nhập vào ứng dụng này");
      }

      // Lưu token và user info vào storage
      await StorageService.saveAccessToken(access_token);
      await StorageService.saveUserInfo(user);

      if (refresh_token) {
        await StorageService.saveSecure("refresh_token", refresh_token);
      }

      this.accessToken = access_token;
      this.userInfo = user;

      return response.data.data;
    } catch (error: any) {
      console.error("Login error:", error);

      if (
        error.message === "Chỉ nhân viên mới có thể đăng nhập vào ứng dụng này"
      ) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Đăng nhập thất bại";
        throw new Error(message);
      }

      throw new Error("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // TODO: Call logout API if available
      await StorageService.clearAuth();
      this.accessToken = null;
      this.userInfo = null;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  /**
   * Load saved auth data from storage
   */
  async loadAuthData(): Promise<boolean> {
    try {
      const token = await StorageService.getAccessToken();
      const user = await StorageService.getUserInfo();

      if (token && user) {
        this.accessToken = token;
        this.userInfo = user;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error loading auth data:", error);
      return false;
    }
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }
    // Try to load from storage if not in memory
    const token = await StorageService.getAccessToken();
    if (token) {
      this.accessToken = token;
    }
    return token;
  }

  /**
   * Get current user info
   */
  async getUserInfo(): Promise<any> {
    if (this.userInfo) {
      return this.userInfo;
    }
    // Try to load from storage if not in memory
    const user = await StorageService.getUserInfo();
    if (user) {
      this.userInfo = user;
    }
    return user;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // If already in memory, return immediately
    if (this.accessToken && this.userInfo) {
      return true;
    }

    // Try to load from storage
    const token = await StorageService.getAccessToken();
    const user = await StorageService.getUserInfo();

    if (token && user) {
      this.accessToken = token;
      this.userInfo = user;
      return true;
    }

    return false;
  }

  /**
   * Check if user is staff
   */
  isStaff(): boolean {
    return this.userInfo?.role === "STAFF";
  }
}

export default new AuthService();
