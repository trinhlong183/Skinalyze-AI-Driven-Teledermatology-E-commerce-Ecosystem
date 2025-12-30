import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import AuthService from "@/services/auth.service";
import setupHttpInterceptors from "@/services/http-interceptor";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Setup HTTP interceptors for auto-logout on 401
    setupHttpInterceptors();
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const hasAuth = await AuthService.isAuthenticated();
      setIsAuthenticated(hasAuth);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
    }
  };

  // Re-check authentication when navigating to protected routes
  useEffect(() => {
    const recheckAuth = async () => {
      const currentPath = segments.join("/");

      // Only re-check if navigating to tabs
      if (currentPath.includes("tabs")) {
        const hasAuth = await AuthService.isAuthenticated();
        if (hasAuth && isAuthenticated !== true) {
          setIsAuthenticated(true);
        } else if (!hasAuth && isAuthenticated !== false) {
          setIsAuthenticated(false);
        }
      }
      // If on login page, ensure we're marked as not authenticated
      else if (currentPath === "login" && isAuthenticated === true) {
        const hasAuth = await AuthService.isAuthenticated();
        if (!hasAuth) {
          setIsAuthenticated(false);
        }
      }
    };

    if (isAuthenticated !== null) {
      recheckAuth();
    }
  }, [segments]);

  // Handle navigation based on auth state (avoid infinite loops)
  useEffect(() => {
    if (isAuthenticated === null) return;

    const currentPath = segments.join("/");

    // Prevent loop: only redirect if not already on the target page
    if (!isAuthenticated && currentPath !== "login" && currentPath !== "") {
      // Not authenticated and not on login page, redirect to login
      router.replace("/login");
    } else if (
      isAuthenticated &&
      (currentPath === "login" || currentPath === "")
    ) {
      // Authenticated but on login page or root, redirect to tabs
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, segments]);

  // Show loading screen while checking authentication
  if (isAuthenticated === null) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#fff",
          }}
        >
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal", headerShown: true }}
        />
        <Stack.Screen name="test-upload-batch-photos" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
