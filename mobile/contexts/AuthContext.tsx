import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import { User } from "@/services/authService";
import tokenService from "@/services/tokenService";
import userService from "@/services/userService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// 1. Tạo Context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

// 2. Tạo Provider
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const token = await tokenService.getToken();

      if (token) {
        console.log("🔄 Auto-login: Found token, fetching profile...");

        // Gọi API lấy profile
        const responseData = await userService.getProfile(token);

        console.log("👤 Profile response raw:", responseData);

        // --- BẮT ĐẦU SỬA LỖI ---
        // 1. Kiểm tra nếu responseData bị undefined hoặc null
        if (!responseData) {
          throw new Error("No response data received from profile service");
        }

        // 2. Dùng Optional Chaining (?.) để truy cập an toàn
        // Nếu responseData.data tồn tại thì lấy, nếu không thì lấy chính responseData
        const userData = (responseData as any)?.data || responseData;
        // --- KẾT THÚC SỬA LỖI ---

        if (userData && userData.email) {
          setUser(userData);
          console.log("✅ Auto-login success for:", userData.fullName);
        } else {
          console.warn("⚠️ Profile data invalid or missing email");
          // Nếu dữ liệu trả về không đúng cấu trúc User, coi như lỗi
          throw new Error("Invalid user data structure");
        }
      } else {
        // Không có token -> Dừng loading
        setIsLoading(false);
      }
    } catch (error) {
      console.error("❌ Error checking auth status:", error);
      // Nếu có lỗi (token hết hạn, mạng lỗi, data rỗng) -> Xóa token và Logout
      await tokenService.clearAll();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData: User) => {
    try {
      await tokenService.saveToken(token);

      try {
        const fullUserData = await userService.getProfile(token);
        // Kiểm tra an toàn cho cả hàm login
        if (fullUserData) {
          const safeUserData = (fullUserData as any)?.data || fullUserData;
          setUser({ ...safeUserData });
          console.log("✅ User logged in with full profile:", safeUserData);
        } else {
          setUser({ ...userData });
        }
      } catch (profileError) {
        console.warn(
          "⚠️ Could not fetch full profile, using provided data:",
          profileError
        );
        setUser({ ...userData });
      }
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await tokenService.clearAll();
      setUser(null);
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const token = await tokenService.getToken();
      if (token) {
        const responseData = await userService.getProfile(token);
        if (responseData) {
          const userData = (responseData as any)?.data || responseData;
          setUser((prevUser) => ({ ...(prevUser || {}), ...userData }));
        }
      }
    } catch (error) {
      console.error("Error refreshing user (non-blocking):", error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
