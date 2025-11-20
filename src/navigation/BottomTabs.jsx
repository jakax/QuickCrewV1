import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import JobsList from '../components/JobsList';
import Profile from '../components/Profile';
import Saved from '../components/Saved';
import Applied from '../components/Applied';


const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,        // Oculta la barra superior nativa
        tabBarStyle: {
          backgroundColor: '#24292e', // color similar al tuyo (theme.appBar.primary)
          height: 60,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: 'white',
        tabBarInactiveTintColor: '#bbbbbb',
      }}
    >
      <Tab.Screen name="JobsList" component={JobsList} options={{ title: "Home" }} />
      <Tab.Screen name="Applied" component={Applied} options={{ title: "Applied" }} />
      <Tab.Screen name="Saved" component={Saved} options={{ title: "Saved" }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
