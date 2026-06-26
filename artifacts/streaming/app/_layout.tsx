import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAppStore } from "@/store/app-store";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const playlists = useAppStore((s) => s.playlists);
  const initializeFromStorage = useAppStore((s) => s.initializeFromStorage);
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const lastRedirectPath = useRef<string | null>(null);

  useEffect(() => {
    initializeFromStorage().then(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === "login";
    const inPlaylists = segments[0] === "playlists";
    
    const realPlaylists = playlists.filter(p => !p.isDemo);
    const hasPlaylists = realPlaylists.length > 0;

    let targetPath: string | null = null;

    if (!isLoggedIn && !inAuthGroup) {
      targetPath = "/login";
    } else if (isLoggedIn) {
      if (!hasPlaylists && !inPlaylists) {
        targetPath = "/playlists";
      } else if (hasPlaylists && inAuthGroup) {
        targetPath = "/(tabs)";
      }
    }

    if (targetPath) {
      if (lastRedirectPath.current !== targetPath) {
        lastRedirectPath.current = targetPath;
        router.replace(targetPath as any);
      }
    } else {
      lastRedirectPath.current = null;
    }
  }, [isLoggedIn, playlists, segments, isReady]);

  if (!isReady) return null;

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="player"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen name="playlists" options={{ headerShown: false }} />
      </Stack>
    </AuthGuard>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
