import { Ionicons } from '@expo/vector-icons';
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from "@/hooks/useColors";
import { TVSidebar } from "@/components/TVSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAppStore } from "@/store/app-store";



function ClassicTabLayout() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 1024 || Platform.isTV;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isLandscape = width > height;
  const subscriptionExpired = useAppStore((s) => s.subscriptionExpired);
  const isFullscreen = useAppStore((s) => s.isFullscreen);

  return (
    <View style={styles.layoutContainer}>
      {isLargeScreen && (
        <LinearGradient
          colors={['rgba(5,7,10,1)', 'rgba(5,7,10,1)', 'rgba(5,7,10,1)', 'rgba(28,49,89,0.35)']}
          locations={[0, 0.45, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#05070a' }]}
        />
      )}
      {(!subscriptionExpired && !isFullscreen) && <TVSidebar />}
      <View style={[styles.contentContainer, (isLargeScreen && !subscriptionExpired && !isFullscreen) && { paddingLeft: 80 }]}>
        <Tabs
          screenOptions={{
            sceneStyle: { backgroundColor: 'transparent' },
            lazy: true,
            headerShown: !isLargeScreen,
            headerTransparent: isLandscape,
            header: () => <GlobalHeader />,
            tabBarActiveTintColor: colors.tint,
            tabBarInactiveTintColor: colors.mutedForeground,
            tabBarStyle: {
              display: isLargeScreen ? 'none' : 'flex',
              position: "absolute",
              backgroundColor: isIOS ? "transparent" : 'rgba(17,22,32,0.95)',
              borderTopWidth: 0,
              elevation: 0,
              height: isWeb ? 84 : (isLandscape ? 56 : 70),
              paddingBottom: isWeb ? 34 : (isLandscape ? 6 : 10),
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
            },
            tabBarBackground: () =>
              isIOS ? (
                <BlurView
                  intensity={95}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
              ) : isWeb ? (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(17,22,32,0.95)' },
                  ]}
                />
              ) : null,
          }}
        >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ paddingTop: 4 }}>
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live TV",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ paddingTop: 4 }}>
              <Ionicons name={focused ? "tv" : "tv-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: "Movies",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ paddingTop: 4 }}>
              <Ionicons name={focused ? "film" : "film-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: "Series",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ paddingTop: 4 }}>
              <Ionicons name={focused ? "albums" : "albums-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="catchup"
        options={{
          title: "Catch Up",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ paddingTop: 4 }}>
              <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: null,
          title: "Favorites",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: "Settings",
        }}
      />
      
      
      
    </Tabs>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  layoutContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  }
});