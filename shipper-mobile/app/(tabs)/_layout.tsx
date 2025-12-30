import { CustomTabBar } from "@/components/custom-tab-bar";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Đơn hàng",
        }}
      />
      <Tabs.Screen
        name="my-batches"
        options={{
          title: "Batches",
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Bản đồ",
        }}
      />
      <Tabs.Screen
        name="return-requests"
        options={{
          title: "Trả hàng",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
        }}
      />
    </Tabs>
  );
}
