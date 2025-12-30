import type { LoginRequest, User } from "@/types/auth";

interface LoginApiResponse {
  success: boolean;
  user: User;
}

interface MeApiResponse {
  authenticated: boolean;
  user?: User;
}

export class AuthService {
  /**
   * Login user with email and password
   * Uses Next.js API route that sets httpOnly cookies
   */
  async login(credentials: LoginRequest): Promise<User> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Important for cookies
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      return result.user;
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Login failed"
      );
    }
  }

  /**
   * Get current authenticated user from cookie
   */
  getUserFromCookie(): User | null {
    if (typeof window === "undefined") return null;

    // Read user_data cookie (not httpOnly, so client can read it)
    const cookies = document.cookie.split(";");
    const userDataCookie = cookies.find((c) =>
      c.trim().startsWith("user_data=")
    );

    if (!userDataCookie) return null;

    try {
      const value = userDataCookie.split("=")[1];
      return JSON.parse(decodeURIComponent(value)) as User;
    } catch {
      return null;
    }
  }

  /**
   * Get stored user data
   * @deprecated Use getUserFromCookie or checkAuth instead
   */
  getUser(): User | null {
    return this.getUserFromCookie();
  }

  /**
   * Check authentication status by calling API
   */
  async checkAuth(): Promise<{ authenticated: boolean; user?: User }> {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      const result: MeApiResponse = await response.json();
      return result;
    } catch {
      return { authenticated: false };
    }
  }

  /**
   * Check if user is authenticated (client-side check via cookie)
   */
  isAuthenticated(): boolean {
    return !!this.getUserFromCookie();
  }

  /**
   * Check if user has staff or admin role
   */
  isStaff(): boolean {
    const user = this.getUserFromCookie();
    if (!user) return false;
    return user.role === "staff" || user.role === "admin";
  }

  /**
   * Logout user and clear cookies via API
   */
  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  /**
   * Validate staff access
   * Throws error if user is not staff
   */
  validateStaffAccess(): void {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated");
    }

    if (!this.isStaff()) {
      throw new Error("Access denied. Staff credentials required.");
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(
    token: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`/api/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Email verification failed");
      }

      return result;
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Email verification failed"
      );
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend verification email");
      }

      return result;
    } catch (error: unknown) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Failed to resend verification email"
      );
    }
  }

  /**
   * Store authentication (deprecated - now handled by API route)
   * @deprecated Authentication is now handled via httpOnly cookies
   */
  storeAuth(token: string, user: User): void {
    console.warn(
      "storeAuth is deprecated - authentication is now handled via httpOnly cookies"
    );
  }

  /**
   * Get token (deprecated - token is now in httpOnly cookie)
   * @deprecated Token is now stored in httpOnly cookie and not accessible from client
   */
  getToken(): string | null {
    console.warn("getToken is deprecated - token is now in httpOnly cookie");
    return null;
  }
}

export const authService = new AuthService();
