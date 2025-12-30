import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments, Href } from "expo-router"; 
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from '@/contexts/AuthContext'
import { ProductProvider } from "@/contexts/ProductContext";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { CartCountProvider } from '@/contexts/CartCountContext';
import { ThemeColorProvider } from '@/contexts/ThemeColorContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

import '@/config/i18n';

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeColorProvider>
      <AuthProvider>
        <ProductProvider>
          <CartCountProvider>
            <LanguageProvider>
              <RootLayoutNav isFontLoaded={loaded} />
            </LanguageProvider>
          </CartCountProvider>
        </ProductProvider>
      </AuthProvider>
    </ThemeColorProvider>
  );
}

function RootLayoutNav({ isFontLoaded }: { isFontLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useNotificationWebSocket();

  useEffect(() => {
    if (!isFontLoaded || isAuthLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const routeName = segments[1]; 
    
    const isAtRoot = (segments as string[]).length === 0;

    const publicStackScreens = [
      'login', 
      'register', 
      'signup', 
      'signin', 
      'SignIn',      
      'SignUp', 
      'forgot-password',
      'otp',
      'SignInScreen',      
      'CreateAccountScreen' 
    ];

    const isAtPublicScreen = 
      isAtRoot || 
      (segments[0] === '(stacks)' && publicStackScreens.includes(routeName as string));

    if (isAuthenticated) {
      if (isAtPublicScreen) {
        router.replace('/(tabs)/HomeScreen' as Href);
      }
    } else {
      if (!isAtPublicScreen) {
         if (inTabsGroup) {
            router.replace('/' as Href);
         }
      }
    }

    SplashScreen.hideAsync();

  }, [isAuthenticated, isAuthLoading, segments, isFontLoaded]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(stacks)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}