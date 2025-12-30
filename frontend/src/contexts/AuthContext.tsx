"use client";
import { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@/types/user";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  refreshUser: () => {},
});

function getUserFromCookie(): User | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split(";");
  const userDataCookie = cookies.find((c) => c.trim().startsWith("user_data="));
  if (!userDataCookie) return null;
  try {
    const value = userDataCookie.split("=")[1];
    return JSON.parse(decodeURIComponent(value)) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = () => {
    const userData = getUserFromCookie();
    setUser(userData);
  };

  useEffect(() => {
    // Retrieve user from cookie on mount
    refreshUser();
    setIsLoading(false);

    // Poll for cookie changes (to detect login/logout)
    const interval = setInterval(() => {
      const currentUser = getUserFromCookie();
      const currentUserId = currentUser?.userId;
      const stateUserId = user?.userId;

      // Only update if user changed
      if (currentUserId !== stateUserId) {
        setUser(currentUser);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.userId]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
