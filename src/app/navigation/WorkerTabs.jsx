import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import Profile from "../screens/tabs/Profile";
import Saved from "../screens/tabs/Saved";
import Applied from "../screens/tabs/Applied";
import WorkerJobsHome from "../screens/worker/WorkerJobsHome";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator();

export default function WorkerTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#81E6F0",
        tabBarStyle: {
          ...styles.tabBar,
          bottom: insets.bottom + 16,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === "Jobs") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Applied") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Saved") {
            iconName = focused ? "bookmark" : "bookmark-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobs" component={WorkerJobsHome} />
      <Tab.Screen
        name="Applied"
        component={Applied}
        options={{ title: "Applied" }}
      />
      <Tab.Screen
        name="Saved"
        component={Saved}
        options={{ title: "Saved" }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 0,
    height: 58,
    paddingBottom: 8,
    paddingTop: 8,
    marginLeft: 32,
    marginRight: 32,
    backgroundColor: "#70A9DF",
    borderTopWidth: 0,
    borderRadius: 999,
    elevation: 0,
    shadowOpacity: 0,
  },
});
