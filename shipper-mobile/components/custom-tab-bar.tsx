import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom || 8,
          height: 64 + (insets.bottom || 8),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        // Get icon based on route name
        const getIcon = () => {
          const iconColor = isFocused ? "#42A5F5" : "#999";
          const iconSize = 24;

          switch (route.name) {
            case "index":
              return (
                <Ionicons name="list-outline" size={iconSize} color={iconColor} />
              );
            case "my-batches":
              return (
                <Ionicons
                  name="cube-outline"
                  size={iconSize}
                  color={iconColor}
                />
              );
            case "map":
              return (
                <Ionicons name="map-outline" size={iconSize} color={iconColor} />
              );
            case "return-requests":
              return (
                <Ionicons
                  name="return-up-back-outline"
                  size={iconSize}
                  color={iconColor}
                />
              );
            case "profile":
              return (
                <Ionicons
                  name="person-outline"
                  size={iconSize}
                  color={iconColor}
                />
              );
            default:
              return (
                <Ionicons
                  name="ellipse-outline"
                  size={iconSize}
                  color={iconColor}
                />
              );
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <View
              style={[
                styles.iconContainer,
                isFocused && styles.iconContainerActive,
              ]}
            >
              {getIcon()}
            </View>
            <Text
              style={[styles.label, isFocused && styles.labelActive]}
              numberOfLines={1}
            >
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconContainerActive: {
    backgroundColor: "#E3F2FD",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: "#999",
    textAlign: "center",
  },
  labelActive: {
    color: "#42A5F5",
    fontWeight: "600",
  },
});
