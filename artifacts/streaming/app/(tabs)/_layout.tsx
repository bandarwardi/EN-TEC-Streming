import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useColors } from "@/hooks/useColors";
import { TVSidebar } from "@/components/TVSidebar";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="live">
        <Icon sf={{ default: "tv", selected: "tv.fill" }} />
        <Label>Live TV</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="movies">
        <Icon sf={{ default: "film", selected: "film.fill" }} />
        <Label>Movies</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="series">
        <Icon sf={{ default: "play.tv", selected: "play.tv.fill" }} />
        <Label>Series</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024 || Platform.isTV;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.layoutContainer}>
      <TVSidebar />
      <View style={styles.contentContainer}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.tint,
            tabBarInactiveTintColor: colors.mutedForeground,
            tabBarStyle: {
              display: isLargeScreen ? 'none' : 'flex',
              position: "absolute",
              backgroundColor: isIOS ? "transparent" : 'rgba(17,22,32,0.95)',
              borderTopWidth: 0,
              elevation: 0,
              height: isWeb ? 84 : 70,
              paddingBottom: isWeb ? 34 : 10,
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
              {isIOS ? (
                <SymbolView name="house" tintColor={color} size={24} />
              ) : (
                <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={26} color={color} />
              )}
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
              {isIOS ? (
                <SymbolView name="tv" tintColor={color} size={24} />
              ) : (
                <MaterialCommunityIcons name={focused ? "access-point" : "access-point"} size={26} color={color} />
              )}
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
              {isIOS ? (
                <SymbolView name="film" tintColor={color} size={24} />
              ) : (
                <MaterialCommunityIcons name={focused ? "movie-open" : "movie-open-outline"} size={26} color={color} />
              )}
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
              {isIOS ? (
                <SymbolView name="play.tv" tintColor={color} size={24} />
              ) : (
                <MaterialCommunityIcons name={focused ? "television-play" : "television-play"} size={26} color={color} />
              )}
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
              {isIOS ? (
                <SymbolView name="clock.arrow.circlepath" tintColor={color} size={24} />
              ) : (
                <MaterialCommunityIcons name={focused ? "clock-time-four" : "clock-time-four-outline"} size={26} color={color} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ paddingTop: 4 }}>
              {isIOS ? (
                <SymbolView name="gearshape" tintColor={color} size={24} />
              ) : (
                <MaterialCommunityIcons name={focused ? "face-man-profile" : "face-man-profile"} size={26} color={color} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="movie-detail"
        options={{
          href: null,
          title: "Movie Detail",
        }}
      />
      <Tabs.Screen
        name="series-detail"
        options={{
          href: null,
          title: "Series Detail",
        }}
      />
      <Tabs.Screen
        name="actor-detail"
        options={{
          href: null,
          title: "Actor Detail",
        }}
      />
    </Tabs>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024 || Platform.isTV;

  // On large screens we always use the custom layout to show the sidebar.
  if (isLiquidGlassAvailable() && !isLargeScreen) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  layoutContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  contentContainer: {
    flex: 1,
  }
});