import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Profile from "../screens/tabs/Profile"; // adjust path to your Profile screen
import EmployerJobsHome from "../screens/employer/EmployerJobsHome";

const Tab = createBottomTabNavigator();

export default function EmployerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Jobs" component={EmployerJobsHome} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}