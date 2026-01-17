
import { StyleSheet } from 'react-native';
import AuthStack from './src/app/navigation/AuthStack';
import AppTabs from './src/app/navigation/AppTabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator();



export default function App() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        
        {/* Auth screens */}
        <RootStack.Screen name="Auth" component={AuthStack} />

        {/* App (tabs) */}
        <RootStack.Screen name="Tabs" component={AppTabs} />

      </RootStack.Navigator>
    </NavigationContainer>
  );
}





