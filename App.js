
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './src/rootStack/authStack/AuthStack';
import AppTabs from './src/rootStack/appTabs/AppTabs';




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
    /*
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Tabs"
          component={BottomTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="JobDetails"
          component={JobDetails}
          options={{ title: 'Job Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});




