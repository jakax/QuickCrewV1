import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Profile from '../screens/tabs/Profile';
import Saved from '../screens/tabs/Saved';
import Applied from '../screens/tabs/Applied';
import WorkerJobsHome from '../screens/worker/WorkerJobsHome';


const Tab = createBottomTabNavigator();

export default function WorkerTabs() {
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
      <Tab.Screen name="Jobs" component={WorkerJobsHome} />
      <Tab.Screen name="Applied" component={Applied} options={{ title: "Applied" }} />
      <Tab.Screen name="Saved" component={Saved} options={{ title: "Saved" }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
