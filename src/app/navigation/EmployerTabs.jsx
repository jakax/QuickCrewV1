import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import Profile from "../screens/tabs/Profile";
import EmployerJobsHome from "../screens/employer/EmployerJobsHome";

const Tab = createBottomTabNavigator();

export default function EmployerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#81E6F0",
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, focused }) => {
          let iconName;

          if (route.name === "Jobs") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobs" component={EmployerJobsHome} />
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
    bottom: 32,
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