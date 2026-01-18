import AuthStack from './src/app/navigation/AuthStack';
import AppTabs from './src/app/navigation/AppTabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConfirmProvider } from './src/app/providers/ConfirmProvider';
import EmployerTabs from './src/app/navigation/EmployerTabs';
import AuthGate from "./src/app/screens/auth/AuthGate";

const RootStack = createNativeStackNavigator();



export default function App() {
  return (
    <ConfirmProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>

          {/* Auth gate to route based on auth state */}
          <RootStack.Screen name="Gate" component={AuthGate} />
          
          {/* Auth screens */}
          <RootStack.Screen name="Auth" component={AuthStack} />

          {/* App (tabs) */}
          <RootStack.Screen name="Tabs" component={AppTabs} />
          {/* Employer specific tabs */}
          <RootStack.Screen name="EmployerTabs" component={EmployerTabs} />

        </RootStack.Navigator>
      </NavigationContainer>
    </ConfirmProvider>
  );
}





