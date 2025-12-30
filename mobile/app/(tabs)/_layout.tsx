import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import HeaderComponent from "@/components/HeaderComponent";
import { useCartCount } from "@/hooks/userCartCount";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useTranslation } from 'react-i18next';

function CartTabBarIcon({ color, focused }: { color: string; focused: boolean }) {
  const { count } = useCartCount();
  const { primaryColor } = useThemeColor();

  return (
    <View style={styles.iconContainer}>
      <View style={[
        styles.iconWrapper,
        focused && { backgroundColor: `${primaryColor}15` }
      ]}>
        <Ionicons 
          name={focused ? 'cart' : 'cart-outline'} 
          size={24} 
          color={color} 
        />
      </View>
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: primaryColor }]}>
          <Text style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}

function TabBarIcon({ 
  name, 
  color, 
  focused 
}: { 
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
}) {
  const { primaryColor } = useThemeColor();
  
  return (
    <View style={styles.iconContainer}>
      <View style={[
        styles.iconWrapper,
        focused && { backgroundColor: `${primaryColor}15` }
      ]}>
        <Ionicons 
          name={name} 
          size={24} 
          color={color} 
        />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: '#999',
        headerShown: useClientOnlyValue(false, true),
        header: () => <HeaderComponent />,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: 100, 
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: t('tabBar.home'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ChatbotScreen"
        options={{
          title: "Chatbot",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="AnalyzeScreen"
        options={{
          title: t('tabBar.analyze'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.analyzeIconContainer}>
              <View style={[styles.analyzeButton, { backgroundColor: primaryColor }]}>
                <Ionicons 
                  name="scan" 
                  size={28} 
                  color="#FFFFFF" 
                />
              </View>
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={[
              styles.analyzeLabel,
              { color: focused ? primaryColor : '#999' }
            ]}>
              {t('tabBar.analyze')}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="NotificationScreen"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="ScheduleScreen"
        options={{
          title: t('tabBar.schedule'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "calendar" : "calendar-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="CartScreen"
        options={{
          title: t('tabBar.cart'),
          tabBarIcon: ({ color, focused }) => (
            <CartTabBarIcon color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapper: {
    width: 48,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  analyzeIconContainer: {
    position: 'relative',
    marginTop: -20,
  },
  analyzeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  analyzeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 4,
  },
});